import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import { academicYears, enrollments, teacherAssignments } from '@/drizzle/schema'

/**
 * Get the currently active academic year.
 */
export async function getActiveAcademicContext() {
  const [active] = await db
    .select()
    .from(academicYears)
    .where(eq(academicYears.isActive, true))
    .limit(1)

  return active || null
}

/**
 * Get the active enrollment for a student in the currently active academic year.
 */
export async function getActiveEnrollment(studentId: number) {
  const year = await getActiveAcademicContext()
  if (!year) return null

  const [enrollment] = await db
    .select()
    .from(enrollments)
    .where(and(eq(enrollments.studentId, studentId), eq(enrollments.academicYearId, year.id)))
    .limit(1)

  return enrollment || null
}

/**
 * Get the active teacher assignment for a class in the currently active academic year.
 */
export async function getActiveTeacherAssignment(classId: number) {
  const year = await getActiveAcademicContext()
  if (!year) return null

  const [assignment] = await db
    .select()
    .from(teacherAssignments)
    .where(and(eq(teacherAssignments.classId, classId), eq(teacherAssignments.academicYearId, year.id)))
    .limit(1)

  return assignment || null
}
