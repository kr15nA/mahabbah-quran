import { sql as drizzleSql, eq, and, desc } from 'drizzle-orm'
import { db, sql } from '@/lib/db/client'
import { enrollments, students, classes, academicYears, programs } from '@/drizzle/schema'

export type EnrollmentRow = {
  id: number
  student_id: number
  academic_year_id: number
  class_id: number
  enrollment_date: string
  status: string
  student_name: string
  student_photo_url: string | null
  class_name: string
  program_name: string
  academic_year_name: string
  created_at: Date
  updated_at: Date
}

/**
 * Fetch enrollments for a specific academic year, optionally filtered by class
 */
export async function getEnrollmentsByAcademicYear(yearId: number, classId?: number): Promise<EnrollmentRow[]> {
  const classFilter = classId ? sql`AND e.class_id = ${classId}` : sql``
  
  const rows = await sql`
    SELECT
      e.id,
      e.student_id,
      e.academic_year_id,
      e.class_id,
      e.enrollment_date,
      e.status,
      e.created_at,
      e.updated_at,
      s.full_name AS student_name,
      s.photo_url AS student_photo_url,
      c.name AS class_name,
      p.name AS program_name,
      ay.name AS academic_year_name
    FROM enrollments e
    JOIN students s ON s.id = e.student_id
    JOIN classes c ON c.id = e.class_id
    JOIN programs p ON p.id = c.program_id
    JOIN academic_years ay ON ay.id = e.academic_year_id
    WHERE e.academic_year_id = ${yearId}
      AND s.deleted_at IS NULL
      ${classFilter}
    ORDER BY c.name, s.full_name
  `
  return rows as EnrollmentRow[]
}

/**
 * Fetch enrollment history for a specific student across academic years
 */
export async function getStudentEnrollmentHistory(studentId: number): Promise<EnrollmentRow[]> {
  const rows = await sql`
    SELECT
      e.id,
      e.student_id,
      e.academic_year_id,
      e.class_id,
      e.enrollment_date,
      e.status,
      e.created_at,
      e.updated_at,
      s.full_name AS student_name,
      s.photo_url AS student_photo_url,
      c.name AS class_name,
      p.name AS program_name,
      ay.name AS academic_year_name
    FROM enrollments e
    JOIN students s ON s.id = e.student_id
    JOIN classes c ON c.id = e.class_id
    JOIN programs p ON p.id = c.program_id
    JOIN academic_years ay ON ay.id = e.academic_year_id
    WHERE e.student_id = ${studentId}
    ORDER BY ay.start_date DESC
  `
  return rows as EnrollmentRow[]
}

/**
 * Upsert (Create or Update) an enrollment for a student in a specific academic year.
 * If the academic year is currently active, it will synchronize students.class_id
 * to maintain Phase 1 legacy compatibility.
 */
export async function upsertEnrollment(
  studentId: number,
  yearId: number,
  classId: number
): Promise<{ outcome: 'created' | 'updated'; id: number; oldClassId: number | null }> {
  // 1. Check if the year exists and its active status
  const [year] = await db.select({ isActive: academicYears.isActive })
    .from(academicYears)
    .where(eq(academicYears.id, yearId))
    .limit(1)

  if (!year) throw new Error('Academic year not found')

  // 2. Check if student exists
  const [student] = await db.select({ id: students.id })
    .from(students)
    .where(eq(students.id, studentId))
    .limit(1)
  
  if (!student) throw new Error('Student not found')

  // 3. Check if class exists
  const [cls] = await db.select({ id: classes.id })
    .from(classes)
    .where(eq(classes.id, classId))
    .limit(1)

  if (!cls) throw new Error('Class not found')

  // 4. Check for existing enrollment in this year
  const [existing] = await db.select({ id: enrollments.id, classId: enrollments.classId })
    .from(enrollments)
    .where(and(
      eq(enrollments.studentId, studentId),
      eq(enrollments.academicYearId, yearId)
    ))
    .limit(1)

  let outcome: 'created' | 'updated'
  let enrollmentId: number

  if (existing) {
    // Update existing enrollment
    const [updated] = await db.update(enrollments)
      .set({ classId, updatedAt: new Date() })
      .where(eq(enrollments.id, existing.id))
      .returning({ id: enrollments.id })
    outcome = 'updated'
    enrollmentId = updated.id
  } else {
    // Insert new enrollment
    const [inserted] = await db.insert(enrollments).values({
      studentId,
      academicYearId: yearId,
      classId,
      enrollmentDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD
    }).returning({ id: enrollments.id })
    outcome = 'created'
    enrollmentId = inserted.id
  }

  // 5. Synchronize legacy class_id if this is the active year
  if (year.isActive) {
    await db.update(students)
      .set({ classId, updatedAt: new Date() })
      .where(eq(students.id, studentId))
  }

  return {
    outcome,
    id: enrollmentId,
    oldClassId: existing ? existing.classId : null,
  }
}
