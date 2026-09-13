import { sql } from '@/lib/db/client'

export type ClassRow = {
  id: number
  program_id: number
  /** @deprecated use current_teacher_id instead */
  teacher_id?: number | null
  current_teacher_id?: number | null
  name: string
  level: string | null
  is_active: boolean
  teacher_name?: string
  program_name?: string
  student_count?: number
  created_at: Date
  updated_at: Date
}

export async function getClassesByTeacher(teacherId: number): Promise<ClassRow[]> {
  const rows = await sql`
    SELECT
      c.id, c.program_id, c.name, c.level, c.is_active, c.created_at, c.updated_at,
      ta.teacher_id AS current_teacher_id, ta.teacher_id AS teacher_id,
      p.name AS program_name, u.full_name AS teacher_name,
      COUNT(s.id)::int AS student_count
    FROM classes c
    JOIN programs p ON p.id = c.program_id
    JOIN teacher_assignments ta ON ta.class_id = c.id AND ta.academic_year_id = (SELECT id FROM academic_years WHERE is_active = TRUE LIMIT 1)
    JOIN users u ON u.id = ta.teacher_id
    LEFT JOIN enrollments e ON e.class_id = c.id AND e.academic_year_id = ta.academic_year_id
    LEFT JOIN students s ON s.id = e.student_id AND s.deleted_at IS NULL
    WHERE ta.teacher_id = ${teacherId} AND c.is_active = TRUE
    GROUP BY c.id, p.name, u.full_name, ta.teacher_id
    ORDER BY c.name
  `
  return rows as ClassRow[]
}

export async function searchClasses(params: {
  search?: string
  isActiveFilter?: boolean | null
  limit: number
  offset: number
}): Promise<{ data: ClassRow[]; total: number }> {
  const searchPattern = params.search ? `%${params.search}%` : null
  const { isActiveFilter, limit, offset } = params

  const dataRows = await sql`
    SELECT 
      c.id, c.program_id, c.name, c.level, c.is_active, c.created_at, c.updated_at,
      ta.teacher_id AS current_teacher_id, ta.teacher_id AS teacher_id,
      p.name AS program_name, 
      u.full_name AS teacher_name,
      COUNT(DISTINCT s.id)::int AS student_count
    FROM classes c
    JOIN programs p ON p.id = c.program_id
    LEFT JOIN teacher_assignments ta ON ta.class_id = c.id AND ta.academic_year_id = (SELECT id FROM academic_years WHERE is_active = TRUE LIMIT 1)
    LEFT JOIN users u ON u.id = ta.teacher_id
    LEFT JOIN enrollments e ON e.class_id = c.id AND e.academic_year_id = (SELECT id FROM academic_years WHERE is_active = TRUE LIMIT 1)
    LEFT JOIN students s ON s.id = e.student_id AND s.deleted_at IS NULL
    WHERE (${searchPattern}::text IS NULL OR c.name ILIKE ${searchPattern} OR u.full_name ILIKE ${searchPattern})
      AND (${isActiveFilter}::boolean IS NULL OR c.is_active = ${isActiveFilter})
    GROUP BY c.id, p.name, u.full_name, ta.teacher_id
    ORDER BY c.created_at DESC, c.id DESC
    LIMIT ${limit} OFFSET ${offset}
  `

  const countRows = await sql`
    SELECT COUNT(*) as total
    FROM classes c
    LEFT JOIN teacher_assignments ta ON ta.class_id = c.id AND ta.academic_year_id = (SELECT id FROM academic_years WHERE is_active = TRUE LIMIT 1)
    LEFT JOIN users u ON u.id = ta.teacher_id
    WHERE (${searchPattern}::text IS NULL OR c.name ILIKE ${searchPattern} OR u.full_name ILIKE ${searchPattern})
      AND (${isActiveFilter}::boolean IS NULL OR c.is_active = ${isActiveFilter})
  `

  return {
    data: dataRows as ClassRow[],
    total: Number((countRows[0] as any).total),
  }
}

export async function getClassesByParent(parentId: number): Promise<ClassRow[]> {
  const rows = await sql`
    SELECT DISTINCT
      c.id, c.program_id, c.name, c.level, c.is_active, c.created_at, c.updated_at,
      ta.teacher_id AS current_teacher_id, ta.teacher_id AS teacher_id,
      p.name AS program_name, u.full_name AS teacher_name,
      0 AS student_count
    FROM classes c
    JOIN programs p ON p.id = c.program_id
    LEFT JOIN teacher_assignments ta ON ta.class_id = c.id AND ta.academic_year_id = (SELECT id FROM academic_years WHERE is_active = TRUE LIMIT 1)
    LEFT JOIN users u ON u.id = ta.teacher_id
    JOIN enrollments e ON e.class_id = c.id AND e.academic_year_id = (SELECT id FROM academic_years WHERE is_active = TRUE LIMIT 1)
    JOIN students s ON s.id = e.student_id
    JOIN student_parents sp ON sp.student_id = s.id
    WHERE sp.parent_id = ${parentId} AND c.is_active = TRUE AND s.deleted_at IS NULL
    ORDER BY c.name
  `
  return rows as ClassRow[]
}

export async function getClassById(id: number): Promise<ClassRow | null> {
  const rows = await sql`
    SELECT
      c.id, c.program_id, c.name, c.level, c.is_active, c.created_at, c.updated_at,
      ta.teacher_id AS current_teacher_id, ta.teacher_id AS teacher_id,
      p.name AS program_name, u.full_name AS teacher_name
    FROM classes c
    JOIN programs p ON p.id = c.program_id
    LEFT JOIN teacher_assignments ta ON ta.class_id = c.id AND ta.academic_year_id = (SELECT id FROM academic_years WHERE is_active = TRUE LIMIT 1)
    LEFT JOIN users u ON u.id = ta.teacher_id
    WHERE c.id = ${id}
    LIMIT 1
  `
  return (rows[0] as ClassRow) ?? null
}

export async function getAllClasses(): Promise<ClassRow[]> {
  const rows = await sql`
    SELECT
      c.id, c.program_id, c.name, c.level, c.is_active, c.created_at, c.updated_at,
      ta.teacher_id AS current_teacher_id, ta.teacher_id AS teacher_id,
      p.name AS program_name, u.full_name AS teacher_name,
      COUNT(s.id)::int AS student_count
    FROM classes c
    JOIN programs p ON p.id = c.program_id
    LEFT JOIN teacher_assignments ta ON ta.class_id = c.id AND ta.academic_year_id = (SELECT id FROM academic_years WHERE is_active = TRUE LIMIT 1)
    LEFT JOIN users u ON u.id = ta.teacher_id
    LEFT JOIN enrollments e ON e.class_id = c.id AND e.academic_year_id = (SELECT id FROM academic_years WHERE is_active = TRUE LIMIT 1)
    LEFT JOIN students s ON s.id = e.student_id AND s.deleted_at IS NULL
    WHERE c.is_active = TRUE
    GROUP BY c.id, p.name, u.full_name, ta.teacher_id
    ORDER BY c.name
  `
  return rows as ClassRow[]
}

export async function insertClass(data: {
  program_id: number
  teacher_id: number
  name: string
  level?: string
}): Promise<number> {
  const rows = await sql`
    WITH active_year AS (
      SELECT id FROM academic_years WHERE is_active = TRUE LIMIT 1
    ),
    new_class AS (
      INSERT INTO classes (program_id, name, level)
      SELECT ${data.program_id}, ${data.name}, ${data.level ?? null}
      FROM active_year
      RETURNING id
    ),
    new_assignment AS (
      INSERT INTO teacher_assignments (class_id, teacher_id, academic_year_id)
      SELECT c.id, ${data.teacher_id}, ay.id
      FROM new_class c, active_year ay
      RETURNING id
    )
    SELECT id FROM new_class
  `
  if (rows.length === 0) {
    throw new Error('Active academic year required for class creation')
  }
  return (rows[0] as { id: number }).id
}

export type UpdateClassData = Partial<{ name: string; level: string; is_active: boolean }>

export async function updateClass(
  id: number,
  data: UpdateClassData
): Promise<void> {
  if (data.name !== undefined) {
    await sql`UPDATE classes SET name = ${data.name}, updated_at = NOW() WHERE id = ${id}`
  }
  if (data.level !== undefined) {
    await sql`UPDATE classes SET level = ${data.level}, updated_at = NOW() WHERE id = ${id}`
  }
  if (data.is_active !== undefined) {
    await sql`UPDATE classes SET is_active = ${data.is_active}, updated_at = NOW() WHERE id = ${id}`
  }
}
