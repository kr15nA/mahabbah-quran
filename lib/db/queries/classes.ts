import { sql } from '@/lib/db/client'

export type ClassRow = {
  id: number
  program_id: number
  teacher_id: number
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
    SELECT c.*, p.name AS program_name, u.full_name AS teacher_name,
      COUNT(s.id)::int AS student_count
    FROM classes c
    JOIN programs p ON p.id = c.program_id
    JOIN users u ON u.id = c.teacher_id
    LEFT JOIN students s ON s.class_id = c.id AND s.deleted_at IS NULL
    WHERE c.teacher_id = ${teacherId} AND c.is_active = TRUE
    GROUP BY c.id, p.name, u.full_name
    ORDER BY c.name
  `
  return rows as ClassRow[]
}

export async function getClassesByParent(parentId: number): Promise<ClassRow[]> {
  const rows = await sql`
    SELECT DISTINCT c.*, p.name AS program_name, u.full_name AS teacher_name,
      0 AS student_count
    FROM classes c
    JOIN programs p ON p.id = c.program_id
    JOIN users u ON u.id = c.teacher_id
    JOIN students s ON s.class_id = c.id
    JOIN student_parents sp ON sp.student_id = s.id
    WHERE sp.parent_id = ${parentId} AND c.is_active = TRUE AND s.deleted_at IS NULL
    ORDER BY c.name
  `
  return rows as ClassRow[]
}

export async function getClassById(id: number): Promise<ClassRow | null> {
  const rows = await sql`
    SELECT c.*, p.name AS program_name, u.full_name AS teacher_name
    FROM classes c
    JOIN programs p ON p.id = c.program_id
    JOIN users u ON u.id = c.teacher_id
    WHERE c.id = ${id}
    LIMIT 1
  `
  return (rows[0] as ClassRow) ?? null
}

export async function getAllClasses(): Promise<ClassRow[]> {
  const rows = await sql`
    SELECT c.*, p.name AS program_name, u.full_name AS teacher_name,
      COUNT(s.id)::int AS student_count
    FROM classes c
    JOIN programs p ON p.id = c.program_id
    JOIN users u ON u.id = c.teacher_id
    LEFT JOIN students s ON s.class_id = c.id AND s.deleted_at IS NULL
    WHERE c.is_active = TRUE
    GROUP BY c.id, p.name, u.full_name
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
    INSERT INTO classes (program_id, teacher_id, name, level)
    VALUES (${data.program_id}, ${data.teacher_id}, ${data.name}, ${data.level ?? null})
    RETURNING id
  `
  return (rows[0] as { id: number }).id
}

export async function updateClass(
  id: number,
  data: Partial<{ teacher_id: number; name: string; level: string; is_active: boolean }>
): Promise<void> {
  if (data.teacher_id !== undefined) {
    await sql`UPDATE classes SET teacher_id = ${data.teacher_id}, updated_at = NOW() WHERE id = ${id}`
  }
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
