import { db } from '@/lib/db/client'
import { financeDb } from '../tx'
import { studentScholarships, scholarshipPrograms, scholarshipProgramFeeTypes, auditLogs, students, academicYears } from '@/drizzle/schema'
import { eq, and, or, lte, gte } from 'drizzle-orm'

export interface AssignStudentScholarshipInput {
  studentId: number
  scholarshipProgramId: number
  academicYearId: number
  startDate: string
  endDate?: string
  notes?: string
  assignedBy: number
}

export interface UpdateStudentScholarshipInput {
  startDate?: string
  endDate?: string
  notes?: string
}

export async function assignStudentScholarship(input: AssignStudentScholarshipInput) {
  return await financeDb.transaction(async (tx) => {
    // 1. Validate Student
    const [student] = await tx.select({ id: students.id, status: students.status }).from(students).where(eq(students.id, input.studentId))
    if (!student) throw new Error('Student not found')
    if (student.status !== 'active') throw new Error('Cannot assign scholarship to inactive student')

    // 2. Validate Academic Year
    const [academicYear] = await tx.select().from(academicYears).where(eq(academicYears.id, input.academicYearId))
    if (!academicYear) throw new Error('Academic year not found')

    // 3. Validate Program
    const [program] = await tx.select().from(scholarshipPrograms).where(eq(scholarshipPrograms.id, input.scholarshipProgramId))
    if (!program) throw new Error('Scholarship program not found')
    if (program.status !== 'ACTIVE') throw new Error('Cannot assign INACTIVE or DRAFT scholarship program')

    // 4. Stacking Rule (V1): Overlapping ACTIVE awards for same academic year and fee scope are DENIED.
    
    // Get new program fee types
    const newFeeTypes = await tx.select().from(scholarshipPrograms)
      .innerJoin(scholarshipProgramFeeTypes, eq(scholarshipProgramFeeTypes.programId, scholarshipPrograms.id))
      .where(eq(scholarshipPrograms.id, input.scholarshipProgramId))
    
    const newFeeTypeIds = newFeeTypes.map(ft => ft.scholarship_program_fee_types.feeTypeId)

    // Get existing active awards for student & year
    const existingAwards = await tx.select().from(studentScholarships).where(and(
      eq(studentScholarships.studentId, input.studentId),
      eq(studentScholarships.academicYearId, input.academicYearId),
      eq(studentScholarships.status, 'ACTIVE')
    ))

    for (const award of existingAwards) {
      // For V1, the rule says "overlapping ACTIVE scholarship awards may not apply to the same academic period + fee type"
      const existingFeeTypes = await tx.select().from(scholarshipProgramFeeTypes).where(eq(scholarshipProgramFeeTypes.programId, award.scholarshipProgramId))
      const existingFeeTypeIds = existingFeeTypes.map(ft => ft.feeTypeId)

      const overlap = newFeeTypeIds.some(id => existingFeeTypeIds.includes(id))
      if (overlap) {
        throw new Error('Overlapping scholarship award denied: V1 does not support multiple active scholarships for the same fee type in the same academic period')
      }
    }

    const [award] = await tx.insert(studentScholarships).values({
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
      entityId: award.id,
      newValues: { ...input, status: 'ACTIVE' }
    })

    return award.id
  })
}

export async function updateStudentScholarship(id: number, input: UpdateStudentScholarshipInput, updatedBy: number) {
  return await financeDb.transaction(async (tx) => {
    const [award] = await tx.select().from(studentScholarships).where(eq(studentScholarships.id, id))
    if (!award) throw new Error('Student scholarship not found')
    if (award.status !== 'ACTIVE') throw new Error('Only ACTIVE student scholarships can be updated')

    await tx.update(studentScholarships).set({
      startDate: input.startDate ?? award.startDate,
      endDate: input.endDate !== undefined ? input.endDate : award.endDate,
      notes: input.notes !== undefined ? input.notes : award.notes,
      updatedAt: new Date(),
    }).where(eq(studentScholarships.id, id))

    await tx.insert(auditLogs).values({
      actorUserId: updatedBy,
      action: 'STUDENT_SCHOLARSHIP_UPDATE',
      entityType: 'STUDENT_SCHOLARSHIP',
      entityId: id,
      newValues: { ...input }
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
      newValues: { status: 'REVOKED' }
    })
  })
}
