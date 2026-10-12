import { sql } from '@/lib/db/client'

export type HomeMurajaahRow = {
  id: number
  student_id: number
  parent_user_id: number
  surah_id: number
  session_date: string
  ayah_start: number
  ayah_end: number
  notes: string | null
  status: 'PENDING' | 'VERIFIED' | 'REJECTED'
  verified_by_teacher_id: number | null
  verified_at: Date | null
  verification_notes: string | null
  created_at: Date
  updated_at: Date
}

export type HomeMurajaahWithDetails = HomeMurajaahRow & {
  surah_name_latin: string
  surah_name_arabic: string
  parent_name?: string
  student_name?: string
  class_name?: string
  teacher_name?: string | null
}

export async function createHomeMurajaah(data: {
  studentId: number
  parentUserId: number
  surahId: number
  sessionDate: string
  ayahStart: number
  ayahEnd: number
  notes?: string | null
}): Promise<number> {
  const rows = await sql`
    INSERT INTO home_murajaah_records (
      student_id,
      parent_user_id,
      surah_id,
      session_date,
      ayah_start,
      ayah_end,
      notes,
      status,
      created_at,
      updated_at
    )
    VALUES (
      ${data.studentId},
      ${data.parentUserId},
      ${data.surahId},
      ${data.sessionDate},
      ${data.ayahStart},
      ${data.ayahEnd},
      ${data.notes ?? null},
      'PENDING',
      NOW(),
      NOW()
    )
    RETURNING id
  `
  return (rows[0] as { id: number }).id
}

export async function getHomeMurajaahById(id: number): Promise<HomeMurajaahRow | null> {
  const rows = await sql`
    SELECT * FROM home_murajaah_records
    WHERE id = ${id}
    LIMIT 1
  `
  return (rows[0] as HomeMurajaahRow) ?? null
}

export async function getHomeMurajaahByStudent(studentId: number, limit = 50): Promise<HomeMurajaahWithDetails[]> {
  const rows = await sql`
    SELECT 
      hm.*,
      s.name_latin AS surah_name_latin,
      s.name_arabic AS surah_name_arabic,
      u.full_name AS teacher_name,
      p.full_name AS parent_name
    FROM home_murajaah_records hm
    JOIN surahs s ON s.id = hm.surah_id
    JOIN users p ON p.id = hm.parent_user_id
    LEFT JOIN users u ON u.id = hm.verified_by_teacher_id
    WHERE hm.student_id = ${studentId}
    ORDER BY hm.session_date DESC, hm.id DESC
    LIMIT ${limit}
  `
  return rows as HomeMurajaahWithDetails[]
}

export async function getPendingHomeMurajaahForTeacher(teacherUserId: number, limit = 50): Promise<HomeMurajaahWithDetails[]> {
  const rows = await sql`
    SELECT 
      hm.*,
      s.name_latin AS surah_name_latin,
      s.name_arabic AS surah_name_arabic,
      st.full_name AS student_name,
      c.name AS class_name,
      p.full_name AS parent_name
    FROM home_murajaah_records hm
    JOIN surahs s ON s.id = hm.surah_id
    JOIN students st ON st.id = hm.student_id
    JOIN users p ON p.id = hm.parent_user_id
    JOIN enrollments e ON e.student_id = st.id AND e.academic_year_id = (SELECT id FROM academic_years WHERE is_active = TRUE LIMIT 1)
    JOIN classes c ON c.id = e.class_id
    JOIN teacher_assignments ta ON ta.class_id = c.id 
      AND ta.academic_year_id = e.academic_year_id 
      AND ta.teacher_id = ${teacherUserId}
    WHERE hm.status = 'PENDING'
      AND st.deleted_at IS NULL
    ORDER BY hm.session_date DESC, hm.id DESC
    LIMIT ${limit}
  `
  return rows as HomeMurajaahWithDetails[]
}

export async function verifyHomeMurajaahRecord(
  id: number,
  teacherUserId: number,
  status: 'VERIFIED' | 'REJECTED',
  verificationNotes?: string | null
): Promise<HomeMurajaahRow | null> {
  const rows = await sql`
    UPDATE home_murajaah_records
    SET 
      status = ${status},
      verified_by_teacher_id = ${teacherUserId},
      verified_at = NOW(),
      verification_notes = ${verificationNotes ?? null},
      updated_at = NOW()
    WHERE id = ${id} AND status = 'PENDING'
    RETURNING *
  `
  return (rows[0] as HomeMurajaahRow) ?? null
}
