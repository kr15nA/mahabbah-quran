import { db } from '@/lib/db/client'
import {
  financeFeeTypes,
  financeRecurringBillingConfigs,
  financeStudentFeeAssignments,
  financeBillingRuns,
  financeBillingRunItems,
  students,
  academicYears,
  financeInvoices
} from '@/drizzle/schema'
import { eq, and, sql, desc, count, ilike, or } from 'drizzle-orm'

export async function getRecurringConfigs() {
  const query = await db.select({
    feeTypeId: financeFeeTypes.id,
    name: financeFeeTypes.name,
    code: financeFeeTypes.code,
    billingFrequency: financeFeeTypes.billingFrequency,
    defaultAmount: financeFeeTypes.defaultAmount,
    isActive: financeRecurringBillingConfigs.isActive,
    dueDayOfMonth: financeRecurringBillingConfigs.dueDayOfMonth,
    updatedAt: financeRecurringBillingConfigs.updatedAt
  })
    .from(financeFeeTypes)
    .leftJoin(financeRecurringBillingConfigs, eq(financeFeeTypes.id, financeRecurringBillingConfigs.feeTypeId))
    .where(eq(financeFeeTypes.billingFrequency, 'MONTHLY'))
    .orderBy(financeFeeTypes.name)

  return query.map(q => ({
    ...q,
    isActive: q.isActive ?? false,
    dueDayOfMonth: q.dueDayOfMonth ?? 10
  }))
}

export async function getStudentFeeAssignments(filters: {
  page?: number
  limit?: number
  search?: string
  academicYearId?: number
  feeTypeId?: number
  status?: string
}) {
  const page = filters.page || 1
  const limit = filters.limit || 20
  const offset = (page - 1) * limit

  let conditions = []
  if (filters.academicYearId) {
    conditions.push(eq(financeStudentFeeAssignments.academicYearId, filters.academicYearId))
  }
  if (filters.feeTypeId) {
    conditions.push(eq(financeStudentFeeAssignments.feeTypeId, filters.feeTypeId))
  }
  if (filters.status) {
    conditions.push(eq(financeStudentFeeAssignments.status, filters.status))
  }
  if (filters.search) {
    conditions.push(ilike(students.fullName, `%${filters.search}%`))
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const [totalCount] = await db.select({ count: count() })
    .from(financeStudentFeeAssignments)
    .innerJoin(students, eq(students.id, financeStudentFeeAssignments.studentId))
    .where(whereClause)

  const items = await db.select({
    id: financeStudentFeeAssignments.id,
    studentId: students.id,
    studentName: students.fullName,
    academicYear: academicYears.name,
    feeTypeName: financeFeeTypes.name,
    startPeriod: financeStudentFeeAssignments.startPeriod,
    endPeriod: financeStudentFeeAssignments.endPeriod,
    status: financeStudentFeeAssignments.status,
    createdAt: financeStudentFeeAssignments.createdAt
  })
    .from(financeStudentFeeAssignments)
    .innerJoin(students, eq(students.id, financeStudentFeeAssignments.studentId))
    .innerJoin(academicYears, eq(academicYears.id, financeStudentFeeAssignments.academicYearId))
    .innerJoin(financeFeeTypes, eq(financeFeeTypes.id, financeStudentFeeAssignments.feeTypeId))
    .where(whereClause)
    .orderBy(desc(financeStudentFeeAssignments.createdAt))
    .limit(limit)
    .offset(offset)

  return {
    items,
    total: Number(totalCount.count),
    page,
    totalPages: Math.ceil(Number(totalCount.count) / limit)
  }
}

export async function getBillingRuns(filters: {
  page?: number
  limit?: number
  academicYearId?: number
  feeTypeId?: number
  period?: string
  status?: string
}) {
  const page = filters.page || 1
  const limit = filters.limit || 20
  const offset = (page - 1) * limit

  let conditions = []
  if (filters.academicYearId) conditions.push(eq(financeBillingRuns.academicYearId, filters.academicYearId))
  if (filters.feeTypeId) conditions.push(eq(financeBillingRuns.feeTypeId, filters.feeTypeId))
  if (filters.period) conditions.push(eq(financeBillingRuns.period, filters.period))
  if (filters.status) conditions.push(eq(financeBillingRuns.status, filters.status))

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const [totalCount] = await db.select({ count: count() })
    .from(financeBillingRuns)
    .where(whereClause)

  const items = await db.select({
    id: financeBillingRuns.id,
    period: financeBillingRuns.period,
    academicYear: academicYears.name,
    feeTypeName: financeFeeTypes.name,
    status: financeBillingRuns.status,
    totalEligible: financeBillingRuns.eligibleCount,
    totalGenerated: financeBillingRuns.generatedCount,
    totalSkipped: financeBillingRuns.skippedCount,
    totalFailed: financeBillingRuns.failedCount,
    startedBy: financeBillingRuns.startedBy,
    startedAt: financeBillingRuns.createdAt,
    completedAt: financeBillingRuns.completedAt
  })
    .from(financeBillingRuns)
    .innerJoin(academicYears, eq(academicYears.id, financeBillingRuns.academicYearId))
    .innerJoin(financeFeeTypes, eq(financeFeeTypes.id, financeBillingRuns.feeTypeId))
    .where(whereClause)
    .orderBy(desc(financeBillingRuns.createdAt))
    .limit(limit)
    .offset(offset)

  return {
    items,
    total: Number(totalCount.count),
    page,
    totalPages: Math.ceil(Number(totalCount.count) / limit)
  }
}

export async function getBillingRunDetails(runId: number, filters: {
  page?: number
  limit?: number
  status?: string
  search?: string
}) {
  const page = filters.page || 1
  const limit = filters.limit || 20
  const offset = (page - 1) * limit

  let conditions = [eq(financeBillingRunItems.runId, runId)]
  if (filters.status) conditions.push(eq(financeBillingRunItems.status, filters.status))
  if (filters.search) conditions.push(ilike(students.fullName, `%${filters.search}%`))

  const whereClause = and(...conditions)

  const [totalCount] = await db.select({ count: count() })
    .from(financeBillingRunItems)
    .innerJoin(financeStudentFeeAssignments, eq(financeStudentFeeAssignments.id, financeBillingRunItems.assignmentId))
    .innerJoin(students, eq(students.id, financeStudentFeeAssignments.studentId))
    .where(whereClause)

  const items = await db.select({
    id: financeBillingRunItems.id,
    studentName: students.fullName,
    assignmentId: financeBillingRunItems.assignmentId,
    invoiceId: financeBillingRunItems.invoiceId,
    invoiceNumber: financeInvoices.invoiceNumber,
    status: financeBillingRunItems.status,
    errorMessage: financeBillingRunItems.errorMessage,
    updatedAt: financeBillingRunItems.updatedAt
  })
    .from(financeBillingRunItems)
    .innerJoin(financeStudentFeeAssignments, eq(financeStudentFeeAssignments.id, financeBillingRunItems.assignmentId))
    .innerJoin(students, eq(students.id, financeStudentFeeAssignments.studentId))
    .leftJoin(financeInvoices, eq(financeInvoices.id, financeBillingRunItems.invoiceId))
    .where(whereClause)
    .orderBy(financeBillingRunItems.id) // Ascending so it matches process order
    .limit(limit)
    .offset(offset)

  return {
    items,
    total: Number(totalCount.count),
    page,
    totalPages: Math.ceil(Number(totalCount.count) / limit)
  }
}
