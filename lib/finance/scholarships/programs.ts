import { financeDb } from '../tx'
import { scholarshipPrograms, scholarshipProgramFeeTypes, financeAccounts, financeFunds, auditLogs, financeFeeTypes } from '@/drizzle/schema'
import { serializeForAudit } from '../audit'
import { eq } from 'drizzle-orm'

export interface CreateScholarshipProgramInput {
  name: string
  description?: string
  calculationType: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FULL'
  percentageBasisPoints?: number | null
  fixedAmount?: bigint | null
  feeTypeIds: number[]
  createdBy: number
}

export interface UpdateScholarshipProgramInput {
  name?: string
  description?: string
  calculationType?: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FULL'
  percentageBasisPoints?: number | null
  fixedAmount?: bigint | null
  feeTypeIds?: number[]
  fundingFundId?: number | null
  scholarshipAccountId?: number | null
}

export async function createScholarshipProgram(input: CreateScholarshipProgramInput) {
  if (input.feeTypeIds.length === 0) {
    throw new Error('Scholarship Program must be applicable to at least one fee type')
  }

  return await financeDb.transaction(async (tx) => {
    const [program] = await tx.insert(scholarshipPrograms).values({
      name: input.name,
      description: input.description,
      calculationType: input.calculationType,
      percentageBasisPoints: input.percentageBasisPoints,
      fixedAmount: input.fixedAmount,
      status: 'DRAFT',
      createdBy: input.createdBy,
    }).returning({ id: scholarshipPrograms.id })

    await tx.insert(scholarshipProgramFeeTypes).values(
      input.feeTypeIds.map(feeTypeId => ({
        programId: program.id,
        feeTypeId
      }))
    )

    await tx.insert(auditLogs).values({
      actorUserId: input.createdBy,
      action: 'SCHOLARSHIP_PROGRAM_CREATE',
      entityType: 'SCHOLARSHIP_PROGRAM',
      entityId: program.id,
      newValues: serializeForAudit({ ...input })
    })

    return program.id
  })
}

export async function updateScholarshipProgramDraft(id: number, input: UpdateScholarshipProgramInput, updatedBy: number) {
  return await financeDb.transaction(async (tx) => {
    const [program] = await tx.select().from(scholarshipPrograms).where(eq(scholarshipPrograms.id, id))
    if (!program) throw new Error('Scholarship program not found')
    if (program.status !== 'DRAFT') throw new Error('Only DRAFT programs can be updated')

    if (input.feeTypeIds && input.feeTypeIds.length === 0) {
      throw new Error('Scholarship Program must be applicable to at least one fee type')
    }

    if (input.name || input.description || input.calculationType || input.percentageBasisPoints !== undefined || input.fixedAmount !== undefined || input.fundingFundId !== undefined || input.scholarshipAccountId !== undefined) {
      await tx.update(scholarshipPrograms).set({
        name: input.name ?? program.name,
        description: input.description ?? program.description,
        calculationType: input.calculationType ?? (program.calculationType as any),
        percentageBasisPoints: input.percentageBasisPoints !== undefined ? input.percentageBasisPoints : program.percentageBasisPoints,
        fixedAmount: input.fixedAmount !== undefined ? input.fixedAmount : program.fixedAmount,
        fundingFundId: input.fundingFundId !== undefined ? input.fundingFundId : program.fundingFundId,
        scholarshipAccountId: input.scholarshipAccountId !== undefined ? input.scholarshipAccountId : program.scholarshipAccountId,
        updatedAt: new Date(),
        updatedBy
      }).where(eq(scholarshipPrograms.id, id))
    }

    if (input.feeTypeIds) {
      await tx.delete(scholarshipProgramFeeTypes).where(eq(scholarshipProgramFeeTypes.programId, id))
      await tx.insert(scholarshipProgramFeeTypes).values(
        input.feeTypeIds.map(feeTypeId => ({
          programId: id,
          feeTypeId
        }))
      )
    }

    await tx.insert(auditLogs).values({
      actorUserId: updatedBy,
      action: 'SCHOLARSHIP_PROGRAM_UPDATE',
      entityType: 'SCHOLARSHIP_PROGRAM',
      entityId: id,
      newValues: serializeForAudit({ ...input })
    })
  })
}

export async function activateScholarshipProgram(id: number, actorId: number) {
  return await financeDb.transaction(async (tx) => {
    const [program] = await tx.select().from(scholarshipPrograms).where(eq(scholarshipPrograms.id, id))
    if (!program) throw new Error('Scholarship program not found')
    if (program.status === 'ACTIVE') return

    // 1. Validate accounting configuration exists
    if (!program.scholarshipAccountId || !program.fundingFundId) {
      throw new Error('Cannot activate program without complete accounting configuration (scholarshipAccountId, fundingFundId)')
    }
    
    // 2. Validate calculation config
    if (program.calculationType === 'PERCENTAGE' && !program.percentageBasisPoints) {
      throw new Error('Percentage programs must have percentageBasisPoints')
    }
    if (program.calculationType === 'FIXED_AMOUNT' && !program.fixedAmount) {
      throw new Error('Fixed amount programs must have fixedAmount')
    }

    // 3. Validate fee types
    const feeTypes = await tx.select({
      id: financeFeeTypes.id,
      defaultFundId: financeFeeTypes.defaultFundId
    }).from(scholarshipProgramFeeTypes)
      .innerJoin(financeFeeTypes, eq(financeFeeTypes.id, scholarshipProgramFeeTypes.feeTypeId))
      .where(eq(scholarshipProgramFeeTypes.programId, id))

    if (feeTypes.length === 0) {
      throw new Error('Cannot activate program with no eligible fee types configured')
    }

    let commonFundId: number | null = null
    for (const ft of feeTypes) {
      if (!ft.defaultFundId) throw new Error(`Fee type ${ft.id} has no defaultFundId`)
      if (commonFundId === null) {
        commonFundId = ft.defaultFundId
      } else if (commonFundId !== ft.defaultFundId) {
        throw new Error('All selected fee types must share the same defaultFundId')
      }
    }
    
    if (commonFundId !== program.fundingFundId) {
      throw new Error('Program fundingFundId must match the defaultFundId of the selected fee types')
    }

    // 4. Validate Fund
    const [fund] = await tx.select({ id: financeFunds.id, isActive: financeFunds.isActive, restrictionType: financeFunds.restrictionType }).from(financeFunds).where(eq(financeFunds.id, program.fundingFundId))
    if (!fund || !fund.isActive) throw new Error('Configured funding fund is missing or inactive')
    if (fund.restrictionType !== 'UNRESTRICTED') throw new Error('Scholarship fund must be UNRESTRICTED for Phase B billing compatibility')

    // 5. Validate Account
    const [account] = await tx.select({ id: financeAccounts.id, isActive: financeAccounts.isActive, accountType: financeAccounts.accountType }).from(financeAccounts).where(eq(financeAccounts.id, program.scholarshipAccountId))
    if (!account || !account.isActive) throw new Error('Configured scholarship account is missing or inactive')
    if (account.accountType !== 'EXPENSE') throw new Error('Scholarship account must be of type EXPENSE')

    await tx.update(scholarshipPrograms).set({
      status: 'ACTIVE',
      updatedAt: new Date(),
      updatedBy: actorId
    }).where(eq(scholarshipPrograms.id, id))

    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: 'SCHOLARSHIP_PROGRAM_ACTIVATE',
      entityType: 'SCHOLARSHIP_PROGRAM',
      entityId: id,
      newValues: serializeForAudit({ status: 'ACTIVE' })
    })
  })
}

export async function deactivateScholarshipProgram(id: number, actorId: number) {
  return await financeDb.transaction(async (tx) => {
    const [program] = await tx.select().from(scholarshipPrograms).where(eq(scholarshipPrograms.id, id))
    if (!program) throw new Error('Scholarship program not found')
    
    await tx.update(scholarshipPrograms).set({
      status: 'INACTIVE',
      updatedAt: new Date(),
      updatedBy: actorId
    }).where(eq(scholarshipPrograms.id, id))

    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: 'SCHOLARSHIP_PROGRAM_DEACTIVATE',
      entityType: 'SCHOLARSHIP_PROGRAM',
      entityId: id,
      newValues: serializeForAudit({ status: 'INACTIVE' })
    })
  })
}

// Minimal safe API to attach accounting to draft
export async function setScholarshipProgramAccounting(id: number, fundingFundId: number, scholarshipAccountId: number, actorId: number) {
  return await financeDb.transaction(async (tx) => {
    await tx.update(scholarshipPrograms).set({
      fundingFundId,
      scholarshipAccountId,
      updatedAt: new Date(),
      updatedBy: actorId
    }).where(eq(scholarshipPrograms.id, id))
    
    // No explicit audit action needed, just part of update
  })
}
