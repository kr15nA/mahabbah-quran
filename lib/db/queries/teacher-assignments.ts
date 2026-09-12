import { eq } from 'drizzle-orm'
import { db, sql } from '@/lib/db/client'
import { teacherAssignments, classes, academicYears, users } from '@/drizzle/schema'

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
 * Returns all academic years ordered chronologically (newest first).
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
 * Upsert a teacher assignment for a class in a specific academic year.
 *
 * Atomicity guarantee (F-002):
 *   For the active academic year, both the teacher_assignments upsert AND the
 *   classes.teacher_id synchronization are performed in a single SQL statement
 *   (INSERT ... ON CONFLICT DO UPDATE + conditional UPDATE via CTE).
 *   This prevents any state where teacher_assignments is updated but
 *   classes.teacher_id is stale.
 *
 * Historical assignment policy (F-001):
 *   Assignments for inactive academic years may be corrected by Admin.
 *   Such corrections DO NOT touch classes.teacher_id — enforced at the DB level
 *   by the conditional UPDATE inside the CTE.
 *   Actor attribution for corrections will be handled by the future Audit Log task.
 *
 * @returns 'created' if a new assignment was inserted, 'updated' if an existing one was changed.
 */
export async function upsertTeacherAssignment(
  yearId: number,
  classId: number,
  teacherId: number
): Promise<'created' | 'updated'> {
  // Step 1: Validate preconditions (read-only checks; aborts before any write on failure).
  const [year] = await db.select({ isActive: academicYears.isActive })
    .from(academicYears)
    .where(eq(academicYears.id, yearId))
    .limit(1)

  if (!year) throw new Error('Academic year not found')

  const [cls] = await db.select({ id: classes.id })
    .from(classes)
    .where(eq(classes.id, classId))
    .limit(1)

  if (!cls) throw new Error('Class not found')

  const [teacher] = await db.select({ id: users.id, role: users.role, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, teacherId))
    .limit(1)

  if (!teacher) throw new Error('Teacher not found')
  if (teacher.role !== 'guru') throw new Error('Assigned user must have the guru role')
  if (!teacher.isActive) throw new Error('Cannot assign an inactive teacher')

  // Step 2: Atomic upsert + conditional legacy sync in a single SQL CTE round-trip.
  //
  // The CTE:
  //   1. Upserts teacher_assignments using INSERT ... ON CONFLICT DO UPDATE.
  //      `xmax = 0` is a PostgreSQL internal flag: 0 means row was freshly inserted,
  //      non-zero means it was updated via the conflict path.
  //   2. Conditionally updates classes.teacher_id ONLY when the academic year
  //      is_active = TRUE — enforced at the database level, not application level.
  //      If the year is inactive, the UPDATE in sync_classes affects 0 rows silently.
  //
  // Both operations execute atomically within the same PostgreSQL statement.
  const upsertResult = await sql`
    WITH upserted AS (
      INSERT INTO teacher_assignments (academic_year_id, class_id, teacher_id)
      VALUES (${yearId}, ${classId}, ${teacherId})
      ON CONFLICT (academic_year_id, class_id) DO UPDATE
        SET teacher_id = EXCLUDED.teacher_id,
            updated_at = NOW()
      RETURNING id, (xmax = 0) AS is_insert
    ),
    sync_classes AS (
      UPDATE classes
         SET teacher_id = ${teacherId}, updated_at = NOW()
       WHERE id = ${classId}
         AND EXISTS (
           SELECT 1 FROM academic_years
            WHERE id = ${yearId}
              AND is_active = TRUE
         )
    )
    SELECT is_insert FROM upserted
  `

  const isInsert = (upsertResult[0] as { is_insert: boolean }).is_insert
  return isInsert ? 'created' : 'updated'
}
