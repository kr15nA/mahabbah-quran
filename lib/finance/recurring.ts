import { db } from '@/lib/db/client'
import { financeDb } from './tx'
import {
  financeRecurringBillingConfigs,
  financeStudentFeeAssignments,
  financeFeeTypes,
  students,
  academicYears,
  enrollments
} from '@/drizzle/schema'
import { eq, and, sql, isNotNull, or, lte, gte } from 'drizzle-orm'

export interface CreateRecurringConfigInput {
  feeTypeId: number
  dueDayOfMonth: number
}

export async function createOrUpdateRecurringConfig(input: CreateRecurringConfigInput, isActive: boolean = false) {
  if (input.dueDayOfMonth < 1 || input.dueDayOfMonth > 28) {
    throw new Error('dueDayOfMonth must be between 1 and 28')
  }

  const [feeType] = await db.select().from(financeFeeTypes).where(eq(financeFeeTypes.id, input.feeTypeId))
  if (!feeType) throw new Error('Fee type not found')
  if (feeType.billingFrequency !== 'MONTHLY') throw new Error('Fee type must be MONTHLY to support recurring billing')

  const existing = await db.select().from(financeRecurringBillingConfigs).where(eq(financeRecurringBillingConfigs.feeTypeId, input.feeTypeId))
  
  if (existing.length > 0) {
    return await db.update(financeRecurringBillingConfigs)
      .set({ dueDayOfMonth: input.dueDayOfMonth, isActive, updatedAt: new Date() })
      .where(eq(financeRecurringBillingConfigs.feeTypeId, input.feeTypeId))
      .returning()
  } else {
    return await db.insert(financeRecurringBillingConfigs)
      .values({ feeTypeId: input.feeTypeId, dueDayOfMonth: input.dueDayOfMonth, isActive })
      .returning()
  }
}

export interface AssignStudentFeeInput {
  studentId: number
  academicYearId: number
  feeTypeId: number
  startPeriod: string
  endPeriod?: string | null
  createdBy?: number
}

function isValidPeriod(period: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(period)
}

export async function assignStudentFee(input: AssignStudentFeeInput) {
  if (!isValidPeriod(input.startPeriod)) throw new Error('startPeriod must be YYYY-MM')
  if (input.endPeriod && !isValidPeriod(input.endPeriod)) throw new Error('endPeriod must be YYYY-MM')
  if (input.endPeriod && input.endPeriod < input.startPeriod) throw new Error('endPeriod cannot be before startPeriod')

  return await financeDb.transaction(async (tx) => {
    // Acquire strict row lock on the student to prevent concurrent overlapping assignments
    const lockedStudent = await tx.execute(
      sql`SELECT id FROM ${students} WHERE id = ${input.studentId} FOR UPDATE`
    )
    if (lockedStudent.rows.length === 0) throw new Error('Student not found')

    const [year] = await tx.select().from(academicYears).where(eq(academicYears.id, input.academicYearId))
    if (!year) throw new Error('Academic year not found')

    const [feeType] = await tx.select().from(financeFeeTypes).where(eq(financeFeeTypes.id, input.feeTypeId))
    if (!feeType) throw new Error('Fee type not found')
    if (feeType.billingFrequency !== 'MONTHLY') throw new Error('Fee type must be MONTHLY')

    const [enrollment] = await tx.select().from(enrollments).where(and(
      eq(enrollments.studentId, input.studentId),
      eq(enrollments.academicYearId, input.academicYearId)
    ))
    if (!enrollment) throw new Error('Student is not enrolled in this academic year')

    // Basic academic year boundary check (just ensuring year is valid for the period)
    // startDate/endDate are string (Drizzle date mode): YYYY-MM-DD
    const yearStart = year.startDate.substring(0, 7) // YYYY-MM
    const yearEnd = year.endDate.substring(0, 7)
    if (input.startPeriod < yearStart || (input.endPeriod && input.endPeriod > yearEnd)) {
      throw new Error('Assignment period must fall within the academic year')
    }
    
    const safeNewEnd = input.endPeriod || '9999-12'

    // Check for overlaps with VALID assignments
    const overlaps = await tx.select().from(financeStudentFeeAssignments).where(
      and(
        eq(financeStudentFeeAssignments.studentId, input.studentId),
        eq(financeStudentFeeAssignments.academicYearId, input.academicYearId),
        eq(financeStudentFeeAssignments.feeTypeId, input.feeTypeId),
        eq(financeStudentFeeAssignments.status, 'VALID'),
        sql`${financeStudentFeeAssignments.startPeriod} <= ${safeNewEnd}`,
        sql`COALESCE(${financeStudentFeeAssignments.endPeriod}, '9999-12') >= ${input.startPeriod}`
      )
    )

    if (overlaps.length > 0) {
      throw new Error('Overlapping VALID fee assignment exists')
    }

    const [assignment] = await tx.insert(financeStudentFeeAssignments).values({
      studentId: input.studentId,
      academicYearId: input.academicYearId,
      feeTypeId: input.feeTypeId,
      startPeriod: input.startPeriod,
      endPeriod: input.endPeriod || null,
      status: 'VALID',
      createdBy: input.createdBy
    }).returning()

    return assignment
  })
}

export async function voidStudentFeeAssignment(assignmentId: number) {
  const [result] = await db.update(financeStudentFeeAssignments)
    .set({ status: 'VOIDED', updatedAt: new Date() })
    .where(eq(financeStudentFeeAssignments.id, assignmentId))
    .returning()
  return result
}
