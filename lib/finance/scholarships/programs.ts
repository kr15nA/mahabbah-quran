import { financeDb } from '../tx'
import { scholarshipPrograms, scholarshipProgramFeeTypes, financeAccounts, financeFunds, auditLogs } from '@/drizzle/schema'
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
      newValues: { ...input }
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

    if (input.name || input.description || input.calculationType || input.percentageBasisPoints !== undefined || input.fixedAmount !== undefined) {
      await tx.update(scholarshipPrograms).set({
        name: input.name ?? program.name,
        description: input.description ?? program.description,
        calculationType: input.calculationType ?? (program.calculationType as any),
        percentageBasisPoints: input.percentageBasisPoints !== undefined ? input.percentageBasisPoints : program.percentageBasisPoints,
        fixedAmount: input.fixedAmount !== undefined ? input.fixedAmount : program.fixedAmount,
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
      newValues: { ...input }
    })
  })
}

export async function activateScholarshipProgram(id: number, actorId: number) {
  return await financeDb.transaction(async (tx) => {
    const [program] = await tx.select().from(scholarshipPrograms).where(eq(scholarshipPrograms.id, id))
    if (!program) throw new Error('Scholarship program not found')
    if (program.status === 'ACTIVE') return

    // Activation requires complete accounting configuration
    if (!program.scholarshipAccountId || !program.fundingFundId) {
      throw new Error('Cannot activate program without complete accounting configuration (scholarshipAccountId, fundingFundId)')
    }

    // Activation requires at least one eligible fee type
    const feeTypes = await tx.select().from(scholarshipProgramFeeTypes).where(eq(scholarshipProgramFeeTypes.programId, id))
    if (feeTypes.length === 0) {
      throw new Error('Cannot activate program with no eligible fee types configured')
    }

    // Validate referenced fund exists and is active
    const [fund] = await tx.select({ id: financeFunds.id, isActive: financeFunds.isActive }).from(financeFunds).where(eq(financeFunds.id, program.fundingFundId))
    if (!fund || !fund.isActive) throw new Error('Configured funding fund is missing or inactive')

    // Validate referenced account exists and is active
    const [account] = await tx.select({ id: financeAccounts.id, isActive: financeAccounts.isActive, accountType: financeAccounts.accountType }).from(financeAccounts).where(eq(financeAccounts.id, program.scholarshipAccountId))
    if (!account || !account.isActive) throw new Error('Configured scholarship account is missing or inactive')
    // Account must be EXPENSE type (scholarship is an expense, not a payment method)
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
      newValues: { status: 'ACTIVE' }
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
      newValues: { status: 'INACTIVE' }
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
