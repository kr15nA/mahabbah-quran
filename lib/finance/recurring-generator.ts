import { db } from '@/lib/db/client'
import { financeDb } from './tx'
import {
  financeRecurringBillingConfigs,
  financeStudentFeeAssignments,
  financeFeeTypes,
  financeBillingRuns,
  financeBillingRunItems,
  financeInvoices,
  academicYears,
  students
} from '@/drizzle/schema'
import { eq, and, sql, isNotNull, inArray } from 'drizzle-orm'
import { createInvoiceDraft } from './invoices'

export interface RecurringGeneratorInput {
  academicYearId: number
  feeTypeId: number
  period: string
  actorId: number
}

function validatePeriodFormat(period: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
    throw new Error('INVALID_TARGET_PERIOD: period must be YYYY-MM')
  }
}

async function resolveConfig(academicYearId: number, feeTypeId: number, period: string) {
  validatePeriodFormat(period)

  const [year] = await db.select().from(academicYears).where(eq(academicYears.id, academicYearId))
  if (!year) throw new Error('INVALID_RECURRING_CONFIG: Academic year not found')

  const yearStart = year.startDate.substring(0, 7)
  const yearEnd = year.endDate.substring(0, 7)
  if (period < yearStart || period > yearEnd) {
    throw new Error('INVALID_RECURRING_CONFIG: Target period is outside academic year bounds')
  }

  const [feeType] = await db.select().from(financeFeeTypes).where(eq(financeFeeTypes.id, feeTypeId))
  if (!feeType) throw new Error('INVALID_RECURRING_CONFIG: Fee type not found')
  if (feeType.billingFrequency !== 'MONTHLY') throw new Error('INVALID_RECURRING_CONFIG: Fee type must be MONTHLY')
  if (feeType.defaultAmount === null || feeType.defaultAmount <= BigInt(0)) {
    throw new Error('INVALID_FEE_AMOUNT: Fee type default amount must be greater than 0')
  }

  const [config] = await db.select().from(financeRecurringBillingConfigs).where(eq(financeRecurringBillingConfigs.feeTypeId, feeTypeId))
  if (!config) throw new Error('INVALID_RECURRING_CONFIG: Config missing')
  if (!config.isActive) throw new Error('INVALID_RECURRING_CONFIG: Config is inactive')
  
  const dueDay = config.dueDayOfMonth.toString().padStart(2, '0')
  const dueDate = `${period}-${dueDay}`

  return {
    academicYearId,
    feeTypeId,
    period,
    grossAmount: feeType.defaultAmount,
    dueDate,
    dueDayOfMonth: config.dueDayOfMonth,
    feeTypeName: feeType.name
  }
}

async function resolveEligibleAssignments(academicYearId: number, feeTypeId: number, period: string) {
  return await db.select({
    assignmentId: financeStudentFeeAssignments.id,
    studentId: financeStudentFeeAssignments.studentId,
    studentName: students.fullName,
    startPeriod: financeStudentFeeAssignments.startPeriod,
    endPeriod: financeStudentFeeAssignments.endPeriod
  })
  .from(financeStudentFeeAssignments)
  .innerJoin(students, eq(students.id, financeStudentFeeAssignments.studentId))
  .where(and(
    eq(financeStudentFeeAssignments.academicYearId, academicYearId),
    eq(financeStudentFeeAssignments.feeTypeId, feeTypeId),
    eq(financeStudentFeeAssignments.status, 'VALID'),
    sql`${financeStudentFeeAssignments.startPeriod} <= ${period}`,
    sql`COALESCE(${financeStudentFeeAssignments.endPeriod}, '9999-12') >= ${period}`
  ))
  .orderBy(financeStudentFeeAssignments.id)
}

export async function dryRunRecurringBilling(input: Omit<RecurringGeneratorInput, 'actorId'>) {
  const config = await resolveConfig(input.academicYearId, input.feeTypeId, input.period)
  const eligible = await resolveEligibleAssignments(input.academicYearId, input.feeTypeId, input.period)
  
  let existingInvoiceCount = 0
  let willGenerateCount = 0
  let invalidCount = 0
  const items = []

  // Check existing invoices efficiently
  const existingInvoices = await db.select({
    studentId: financeInvoices.studentId,
    id: financeInvoices.id
  })
  .from(financeInvoices)
  .where(and(
    eq(financeInvoices.academicYearId, input.academicYearId),
    eq(financeInvoices.feeTypeId, input.feeTypeId),
    eq(financeInvoices.period, input.period)
  ))

  const existingInvoiceMap = new Map<number, number>()
  for (const inv of existingInvoices) {
    existingInvoiceMap.set(inv.studentId, inv.id)
  }

  for (const row of eligible) {
    const existingInvoiceId = existingInvoiceMap.get(row.studentId)
    
    let status = 'WILL_GENERATE'
    if (existingInvoiceId) {
      status = 'SKIPPED_EXISTING'
      existingInvoiceCount++
    } else {
      willGenerateCount++
    }

    items.push({
      assignmentId: row.assignmentId,
      studentId: row.studentId,
      studentName: row.studentName,
      status,
      reason: existingInvoiceId ? 'Existing invoice found' : 'Ready to generate',
      existingInvoiceId: existingInvoiceId || null
    })
  }

  return {
    academicYearId: config.academicYearId,
    feeTypeId: config.feeTypeId,
    period: config.period,
    grossAmount: config.grossAmount,
    dueDate: config.dueDate,
    eligibleCount: eligible.length,
    existingInvoiceCount,
    willGenerateCount,
    invalidCount,
    items
  }
}

async function lookupExistingInvoice(studentId: number, academicYearId: number, feeTypeId: number, period: string) {
  const [invoice] = await db.select({ id: financeInvoices.id })
    .from(financeInvoices)
    .where(and(
      eq(financeInvoices.studentId, studentId),
      eq(financeInvoices.academicYearId, academicYearId),
      eq(financeInvoices.feeTypeId, feeTypeId),
      eq(financeInvoices.period, period)
    ))
  return invoice?.id || null
}

export async function prepareRecurringBillingRun(input: Omit<RecurringGeneratorInput, 'actorId'> & { actorId: number }) {
  const config = await resolveConfig(input.academicYearId, input.feeTypeId, input.period)
  
  return await financeDb.transaction(async (tx) => {
    let [run] = await tx.select().from(financeBillingRuns).where(and(
      eq(financeBillingRuns.academicYearId, input.academicYearId),
      eq(financeBillingRuns.feeTypeId, input.feeTypeId),
      eq(financeBillingRuns.period, input.period)
    ))
    
    if (!run) {
      const [newRun] = await tx.insert(financeBillingRuns).values({
        academicYearId: input.academicYearId,
        feeTypeId: input.feeTypeId,
        period: input.period,
        status: 'PENDING',
        startedBy: input.actorId,
        startedAt: new Date()
      }).returning()
      run = newRun
    } else if (run.status === 'COMPLETED' || run.status === 'COMPLETED_WITH_ERRORS' || run.status === 'FAILED') {
      [run] = await tx.update(financeBillingRuns)
        .set({ status: 'RUNNING', startedBy: input.actorId, startedAt: new Date(), updatedAt: new Date() })
        .where(eq(financeBillingRuns.id, run.id))
        .returning()
    } else if (run.status === 'PENDING') {
      [run] = await tx.update(financeBillingRuns)
        .set({ status: 'RUNNING', startedBy: input.actorId, startedAt: new Date(), updatedAt: new Date() })
        .where(eq(financeBillingRuns.id, run.id))
        .returning()
    }

    return run
  })
}

async function reconcileRunCounters(runId: number) {
  const items = await db.select({
    status: financeBillingRunItems.status
  }).from(financeBillingRunItems).where(eq(financeBillingRunItems.runId, runId))

  const eligibleCount = items.length
  let generatedCount = 0
  let skippedCount = 0
  let failedCount = 0

  for (const item of items) {
    if (item.status === 'GENERATED') generatedCount++
    if (item.status === 'SKIPPED_EXISTING') skippedCount++
    if (item.status === 'FAILED') failedCount++
  }
  
  const pendingCount = eligibleCount - generatedCount - skippedCount - failedCount

  let newStatus = 'RUNNING'
  if (pendingCount === 0) {
    newStatus = failedCount > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED'
  }

  await db.update(financeBillingRuns)
    .set({
      eligibleCount,
      generatedCount,
      skippedCount,
      failedCount,
      status: newStatus,
      updatedAt: new Date(),
      completedAt: pendingCount === 0 ? new Date() : null
    })
    .where(eq(financeBillingRuns.id, runId))
}

export async function processRecurringBillingRunChunk(runId: number, actorId: number, chunkSize: number = 50, targetItemIds?: number[]) {
  if (chunkSize > 50) chunkSize = 50

  const [run] = await db.select().from(financeBillingRuns).where(eq(financeBillingRuns.id, runId))
  if (!run) throw new Error('UNKNOWN_ERROR: Billing run not found')

  const config = await resolveConfig(run.academicYearId, run.feeTypeId, run.period)
  const eligible = await resolveEligibleAssignments(run.academicYearId, run.feeTypeId, run.period)

  // Sync run items for newly discovered assignments
  for (const row of eligible) {
    try {
      await db.insert(financeBillingRunItems).values({
        runId,
        studentId: row.studentId,
        assignmentId: row.assignmentId,
        status: 'PENDING'
      }).onConflictDoNothing()
    } catch (e) {
      // Ignored if race creates it
    }
  }

  let processableItems: any[] = []

  if (targetItemIds !== undefined) {
    if (targetItemIds.length > 0) {
      // Process specific chunk
      processableItems = await db.select()
        .from(financeBillingRunItems)
        .where(inArray(financeBillingRunItems.id, targetItemIds))
        .orderBy(financeBillingRunItems.id)
    }
  } else {
    // Fetch PENDING and FAILED items (retryable)
    processableItems = await db.select()
      .from(financeBillingRunItems)
      .where(and(
        eq(financeBillingRunItems.runId, runId),
        sql`${financeBillingRunItems.status} IN ('PENDING', 'FAILED')`
      ))
      .orderBy(financeBillingRunItems.id)
      .limit(chunkSize)
  }

  for (const item of processableItems) {
    try {
      const invoiceId = await createInvoiceDraft({
        studentId: item.studentId,
        academicYearId: run.academicYearId,
        feeTypeId: run.feeTypeId,
        period: run.period,
        description: `Tagihan Bulanan ${config.feeTypeName} ${run.period}`,
        amount: config.grossAmount,
        dueDate: config.dueDate,
        createdBy: actorId
      })

      await db.update(financeBillingRunItems)
        .set({ status: 'GENERATED', invoiceId, updatedAt: new Date(), errorCode: null, errorMessage: null })
        .where(eq(financeBillingRunItems.id, item.id))
        
    } catch (error: any) {
      const errMsg = String(error)
      if (errMsg.includes('Duplicate recurring invoice detected') || errMsg.includes('duplicate key value')) {
        const existingId = await lookupExistingInvoice(item.studentId, run.academicYearId, run.feeTypeId, run.period)
        if (existingId) {
          await db.update(financeBillingRunItems)
            .set({ status: 'SKIPPED_EXISTING', invoiceId: existingId, updatedAt: new Date(), errorCode: null, errorMessage: null })
            .where(eq(financeBillingRunItems.id, item.id))
        } else {
          await db.update(financeBillingRunItems)
            .set({ status: 'FAILED', errorCode: 'INVOICE_CREATE_FAILED', errorMessage: 'Duplicate race occurred but no existing invoice found', updatedAt: new Date() })
            .where(eq(financeBillingRunItems.id, item.id))
        }
      } else {
        await db.update(financeBillingRunItems)
          .set({ status: 'FAILED', errorCode: 'INVOICE_CREATE_FAILED', errorMessage: errMsg.substring(0, 255), updatedAt: new Date() })
          .where(eq(financeBillingRunItems.id, item.id))
      }
    }
  }

  await reconcileRunCounters(runId)
  
  return {
    processed: processableItems.length
  }
}

export async function generateRecurringBilling(input: RecurringGeneratorInput) {
  const run = await prepareRecurringBillingRun(input)
  
  // First, we run a pre-flight chunk with 0 items to sync newly eligible assignments and reconcile
  await processRecurringBillingRunChunk(run.id, input.actorId, 0, [])

  // Fetch all processable IDs once upfront to avoid looping on newly failed items
  const allProcessable = await db.select({ id: financeBillingRunItems.id })
    .from(financeBillingRunItems)
    .where(and(
      eq(financeBillingRunItems.runId, run.id),
      sql`${financeBillingRunItems.status} IN ('PENDING', 'FAILED')`
    ))
    .orderBy(financeBillingRunItems.id)

  const ids = allProcessable.map(i => i.id)
  let totalProcessed = 0

  for (let i = 0; i < ids.length; i += 50) {
    const chunkIds = ids.slice(i, i + 50)
    const { processed } = await processRecurringBillingRunChunk(run.id, input.actorId, chunkIds.length, chunkIds)
    totalProcessed += processed
  }

  return totalProcessed
}
