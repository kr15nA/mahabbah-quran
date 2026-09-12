import { sql as drizzleSql, eq, and, desc } from 'drizzle-orm'
import { db, sql } from '@/lib/db/client'
import { teacherAssignments, classes, academicYears, users, programs } from '@/drizzle/schema'

export type TeacherAssignmentRow = {
  id: number
  academic_year_id: number
  class_id: number
  teacher_id: number
  status: string
  class_name: string
  program_name: string
  teacher_name: string
  academic_year_name: string
  created_at: Date
  updated_at: Date
}

/**
 * Fetch teacher assignments for a specific academic year.
 */
export async function getTeacherAssignmentsByYear(yearId: number): Promise<TeacherAssignmentRow[]> {
  const rows = await sql`
    SELECT
      ta.id,
      ta.academic_year_id,
      ta.class_id,
      ta.teacher_id,
      ta.status,
      ta.created_at,
      ta.updated_at,
      c.name AS class_name,
      p.name AS program_name,
      u.full_name AS teacher_name,
      ay.name AS academic_year_name
    FROM teacher_assignments ta
    JOIN classes c ON c.id = ta.class_id
    JOIN programs p ON p.id = c.program_id
    JOIN users u ON u.id = ta.teacher_id
    JOIN academic_years ay ON ay.id = ta.academic_year_id
    WHERE ta.academic_year_id = ${yearId}
    ORDER BY p.name, c.name
  `
  return rows as TeacherAssignmentRow[]
}

/**
 * Fetch teacher assignment history for a specific class across academic years.
 */
export async function getTeacherAssignmentHistory(classId: number): Promise<TeacherAssignmentRow[]> {
  const rows = await sql`
    SELECT
      ta.id,
      ta.academic_year_id,
      ta.class_id,
      ta.teacher_id,
      ta.status,
      ta.created_at,
      ta.updated_at,
      c.name AS class_name,
      p.name AS program_name,
      u.full_name AS teacher_name,
      ay.name AS academic_year_name
    FROM teacher_assignments ta
    JOIN classes c ON c.id = ta.class_id
    JOIN programs p ON p.id = c.program_id
    JOIN users u ON u.id = ta.teacher_id
    JOIN academic_years ay ON ay.id = ta.academic_year_id
    WHERE ta.class_id = ${classId}
    ORDER BY ay.start_date DESC
  `
  return rows as TeacherAssignmentRow[]
}

/**
 * Upsert (Create or Update) a teacher assignment for a class in a specific academic year.
 * If the academic year is currently active, it will synchronize classes.teacher_id
 * to maintain Phase 1 legacy compatibility.
 */
export async function upsertTeacherAssignment(yearId: number, classId: number, teacherId: number): Promise<void> {
  // 1. Check if the year exists and its active status
  const [year] = await db.select({ isActive: academicYears.isActive })
    .from(academicYears)
    .where(eq(academicYears.id, yearId))
    .limit(1)

  if (!year) throw new Error('Academic year not found')

  // 2. Check if class exists
  const [cls] = await db.select({ id: classes.id })
    .from(classes)
    .where(eq(classes.id, classId))
    .limit(1)

  if (!cls) throw new Error('Class not found')

  // 3. Check if teacher exists, is active, and is a guru
  const [teacher] = await db.select({ id: users.id, role: users.role, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, teacherId))
    .limit(1)
  
  if (!teacher) throw new Error('Teacher not found')
  if (teacher.role !== 'guru') throw new Error('Assigned user must have the guru role')
  if (!teacher.isActive) throw new Error('Cannot assign an inactive teacher')

  // 4. Check for existing assignment in this year for this class
  const [existing] = await db.select({ id: teacherAssignments.id })
    .from(teacherAssignments)
    .where(and(
      eq(teacherAssignments.classId, classId),
      eq(teacherAssignments.academicYearId, yearId)
    ))
    .limit(1)

  if (existing) {
    // Update existing assignment
    await db.update(teacherAssignments)
      .set({ teacherId, updatedAt: new Date() })
      .where(eq(teacherAssignments.id, existing.id))
  } else {
    // Insert new assignment
    await db.insert(teacherAssignments).values({
      academicYearId: yearId,
      classId,
      teacherId,
    })
  }

  // 5. Synchronize legacy teacher_id if this is the active year
  if (year.isActive) {
    await db.update(classes)
      .set({ teacherId, updatedAt: new Date() })
      .where(eq(classes.id, classId))
  }
}
