import { sql } from '@/lib/db/client'

export type StudentParentRow = {
  id: number
  student_id: number
  parent_id: number
  relationship: 'ayah' | 'bunda' | 'wali'
  is_primary: boolean
  parent_name?: string
  parent_email?: string
  parent_phone?: string
  student_name?: string
  student_nickname?: string
  student_photo?: string
  class_name?: string
  program_name?: string
  teacher_name?: string
  created_at: Date
}

export async function getParentsByStudent(studentId: number): Promise<StudentParentRow[]> {
  const rows = await sql`
    SELECT sp.*, u.full_name AS parent_name, u.email AS parent_email, u.phone AS parent_phone
    FROM student_parents sp
    JOIN users u ON u.id = sp.parent_id
    WHERE sp.student_id = ${studentId}
  `
  return rows as StudentParentRow[]
}

export async function getChildrenByParent(parentId: number): Promise<StudentParentRow[]> {
  const rows = await sql`
    SELECT sp.*, s.full_name AS student_name, s.nickname AS student_nickname, s.photo_url AS student_photo,
      c.name AS class_name, p.name AS program_name, u.full_name AS teacher_name
    FROM student_parents sp
    JOIN students s ON s.id = sp.student_id
    JOIN classes c ON c.id = s.class_id
    JOIN programs p ON p.id = c.program_id
    JOIN users u ON u.id = c.teacher_id
    WHERE sp.parent_id = ${parentId} AND s.deleted_at IS NULL
  `
  return rows as StudentParentRow[]
}

export async function linkParentToStudent(data: {
  student_id: number
  parent_id: number
  relationship?: 'ayah' | 'bunda' | 'wali'
  is_primary?: boolean
}): Promise<number> {
  const rows = await sql`
    INSERT INTO student_parents (student_id, parent_id, relationship, is_primary)
    VALUES (${data.student_id}, ${data.parent_id}, ${data.relationship ?? 'wali'}, ${data.is_primary ?? false})
    ON CONFLICT (student_id, parent_id) DO NOTHING
    RETURNING id
  `
  return (rows[0] as { id: number })?.id ?? 0
}
