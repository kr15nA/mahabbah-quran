import { financeDb } from '../tx'
import {
  studentScholarships,
  scholarshipPrograms,
  scholarshipProgramFeeTypes,
  enrollments,
  auditLogs,
  students,
  academicYears,
} from '@/drizzle/schema'
import { and, eq, lte, or, gte, sql } from 'drizzle-orm'
import { serializeForAudit } from '../audit'

export interface AssignStudentScholarshipInput {
  studentId: number
  scholarshipProgramId: number
  academicYearId: number
  /** YYYY-MM-DD, inclusive */
  startDate: string
  /** YYYY-MM-DD, inclusive. Null = open-ended (active for rest of year) */
  endDate?: string | null
  notes?: string
  assignedBy: number
}

export interface UpdateStudentScholarshipInput {
  startDate?: string
  endDate?: string | null
  notes?: string
}

/**
 * Checks whether two date intervals [aStart, aEnd] and [bStart, bEnd] overlap.
 * endDate is INCLUSIVE. A null end means "open-ended" (no end).
 *
 * Two intervals are non-overlapping if one ends strictly before the other starts.
 * Otherwise they overlap.
 */
function datesOverlap(
  aStart: string,
  aEnd: string | null | undefined,
  bStart: string,
  bEnd: string | null | undefined
): boolean {
  // aEnd < bStart => no overlap
  if (aEnd && aEnd < bStart) return false
  // bEnd < aStart => no overlap
  if (bEnd && bEnd < aStart) return false
  // All other cases: overlap
  return true
}

export async function assignStudentScholarship(input: AssignStudentScholarshipInput) {
  return await financeDb.transaction(async (tx) => {
    // 1. Validate dates
    if (input.endDate && input.endDate < input.startDate) {
      throw new Error('endDate must be on or after startDate')
    }

    // 2. Validate Student exists and is not deleted/inactive
    const [student] = await tx
      .select({ id: students.id, status: students.status, deletedAt: students.deletedAt })
      .from(students)
      .where(eq(students.id, input.studentId))
    if (!student) throw new Error('Student not found')
    if (student.deletedAt) throw new Error('Cannot assign scholarship to deleted student')
    if (student.status !== 'active') throw new Error('Cannot assign scholarship to inactive student')

    // 3. Validate Academic Year
    const [academicYear] = await tx.select().from(academicYears).where(eq(academicYears.id, input.academicYearId))
    if (!academicYear) throw new Error('Academic year not found')

    // 4. Validate Student has an active enrollment for the requested academic year
    const [enrollment] = await tx
      .select({ id: enrollments.id, status: enrollments.status })
      .from(enrollments)
      .where(and(
        eq(enrollments.studentId, input.studentId),
        eq(enrollments.academicYearId, input.academicYearId),
        eq(enrollments.status, 'active')
      ))
    if (!enrollment) throw new Error('Student has no active enrollment for this academic year')

    // 5. Validate Program
    const [program] = await tx
      .select()
      .from(scholarshipPrograms)
      .where(eq(scholarshipPrograms.id, input.scholarshipProgramId))
    if (!program) throw new Error('Scholarship program not found')
    if (program.deletedAt) throw new Error('Scholarship program has been archived')
    if (program.status !== 'ACTIVE') throw new Error('Cannot assign INACTIVE or DRAFT scholarship program')

    // 6. Validate program has at least one eligible fee type
    const programFeeTypes = await tx
      .select()
      .from(scholarshipProgramFeeTypes)
      .where(eq(scholarshipProgramFeeTypes.programId, input.scholarshipProgramId))
    if (programFeeTypes.length === 0) throw new Error('Scholarship program has no eligible fee types configured')

    const newFeeTypeIds = programFeeTypes.map(ft => ft.feeTypeId)

    // 7. V1 Overlap Rule: Deny overlapping ACTIVE awards for same fee type + same date interval
    const existingAwards = await tx
      .select()
      .from(studentScholarships)
      .where(and(
        eq(studentScholarships.studentId, input.studentId),
        eq(studentScholarships.academicYearId, input.academicYearId),
        eq(studentScholarships.status, 'ACTIVE')
      ))

    for (const award of existingAwards) {
      const existingFeeTypes = await tx
        .select()
        .from(scholarshipProgramFeeTypes)
        .where(eq(scholarshipProgramFeeTypes.programId, award.scholarshipProgramId))
      const existingFeeTypeIds = existingFeeTypes.map(ft => ft.feeTypeId)

      const feeTypeOverlap = newFeeTypeIds.some(id => existingFeeTypeIds.includes(id))
      if (!feeTypeOverlap) continue

      // Check date-interval overlap (endDate is inclusive)
      const dateOverlap = datesOverlap(input.startDate, input.endDate, award.startDate, award.endDate)
      if (dateOverlap) {
        throw new Error(
          `Overlapping scholarship award denied: An existing award (id=${award.id}) covers the same fee type during an overlapping date range`
        )
      }
    }

    const [createdAward] = await tx.insert(studentScholarships).values({
      studentId: input.studentId,
      scholarshipProgramId: input.scholarshipProgramId,
      academicYearId: input.academicYearId,
      startDate: input.startDate,
      endDate: input.endDate,
      status: 'ACTIVE',
      notes: input.notes,
    }).returning({ id: studentScholarships.id })

    await tx.insert(auditLogs).values({
      actorUserId: input.assignedBy,
      action: 'STUDENT_SCHOLARSHIP_ASSIGN',
      entityType: 'STUDENT_SCHOLARSHIP',
      entityId: createdAward.id,
      newValues: serializeForAudit({ studentId: input.studentId, scholarshipProgramId: input.scholarshipProgramId, academicYearId: input.academicYearId, startDate: input.startDate, endDate: input.endDate ?? null, status: 'ACTIVE' })
    })

    return createdAward.id
  })
}

export async function updateStudentScholarship(id: number, input: UpdateStudentScholarshipInput, updatedBy: number) {
  return await financeDb.transaction(async (tx) => {
    const [award] = await tx.select().from(studentScholarships).where(eq(studentScholarships.id, id))
    if (!award) throw new Error('Student scholarship not found')
    if (award.status !== 'ACTIVE') throw new Error('Only ACTIVE student scholarships can be updated')

    const newStart = input.startDate ?? award.startDate
    const newEnd = input.endDate !== undefined ? input.endDate : award.endDate
    if (newEnd && newEnd < newStart) {
      throw new Error('endDate must be on or after startDate')
    }

    await tx.update(studentScholarships).set({
      startDate: newStart,
      endDate: newEnd,
      notes: input.notes !== undefined ? input.notes : award.notes,
      updatedAt: new Date(),
    }).where(eq(studentScholarships.id, id))

    await tx.insert(auditLogs).values({
      actorUserId: updatedBy,
      action: 'STUDENT_SCHOLARSHIP_UPDATE',
      entityType: 'STUDENT_SCHOLARSHIP',
      entityId: id,
      newValues: serializeForAudit({ ...input })
    })
  })
}

export async function revokeStudentScholarship(id: number, revokedBy: number) {
  return await financeDb.transaction(async (tx) => {
    const [award] = await tx.select().from(studentScholarships).where(eq(studentScholarships.id, id))
    if (!award) throw new Error('Student scholarship not found')
    if (award.status === 'REVOKED') return

    await tx.update(studentScholarships).set({
      status: 'REVOKED',
      revokedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(studentScholarships.id, id))

    await tx.insert(auditLogs).values({
      actorUserId: revokedBy,
      action: 'STUDENT_SCHOLARSHIP_REVOKE',
      entityType: 'STUDENT_SCHOLARSHIP',
      entityId: id,
      newValues: serializeForAudit({ status: 'REVOKED' })
    })
  })
}
