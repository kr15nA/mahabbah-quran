import { sql } from '@/lib/db/client'

export type HafalanRow = {
  id: number
  student_id: number
  teacher_id: number
  surah_id: number
  session_date: string
  ayah_start: number
  ayah_end: number
  type: 'hafalan_baru' | 'muraja_ah'
  score: number | null
  surah_name_latin?: string
  surah_number?: number
  teacher_name?: string
  created_at: Date
}

export async function getHafalanByStudent(studentId: number, limit = 20): Promise<HafalanRow[]> {
  const rows = await sql`
    SELECT hr.*, s.name_latin AS surah_name_latin, s.number AS surah_number, u.full_name AS teacher_name
    FROM hafalan_records hr
    JOIN surahs s ON s.id = hr.surah_id
    JOIN users u ON u.id = hr.teacher_id
    WHERE hr.student_id = ${studentId}
    ORDER BY hr.session_date DESC, hr.id DESC
    LIMIT ${limit}
  `
  return rows as HafalanRow[]
}

export async function getLastHafalanByStudent(studentId: number): Promise<HafalanRow | null> {
  const rows = await sql`
    SELECT hr.*, s.name_latin AS surah_name_latin, s.number AS surah_number
    FROM hafalan_records hr
    JOIN surahs s ON s.id = hr.surah_id
    WHERE hr.student_id = ${studentId}
    ORDER BY hr.session_date DESC, hr.id DESC
    LIMIT 1
  `
  return (rows[0] as HafalanRow) ?? null
}

export async function insertHafalanRecord(data: {
  student_id: number
  teacher_id: number
  surah_id: number
  session_date: string
  ayah_start: number
  ayah_end: number
  type: 'hafalan_baru' | 'muraja_ah'
  score?: number
}): Promise<number> {
  const rows = await sql`
    INSERT INTO hafalan_records (student_id, teacher_id, surah_id, session_date, ayah_start, ayah_end, type, score)
    VALUES (${data.student_id}, ${data.teacher_id}, ${data.surah_id}, ${data.session_date}, ${data.ayah_start}, ${data.ayah_end}, ${data.type}, ${data.score ?? null})
    RETURNING id
  `
  return (rows[0] as { id: number }).id
}

export async function getHafalanProgressChart(classId?: number, monthsCount = 8) {
  const rows = await sql`
    SELECT
      TO_CHAR(session_date, 'Mon') AS month,
      ROUND(AVG(score))::int AS score
    FROM hafalan_records
    GROUP BY TO_CHAR(session_date, 'Mon'), DATE_TRUNC('month', session_date)
    ORDER BY DATE_TRUNC('month', session_date) ASC
    LIMIT ${monthsCount}
  `
  return rows as { month: string; score: number }[]
}

export type SearchHafalanRow = HafalanRow & {
  student_name: string
  class_name: string
}

export async function searchHafalan(params: {
  search?: string | null
  limit: number
  offset: number
}): Promise<{ data: SearchHafalanRow[]; total: number }> {
  const searchPattern = params.search ? `%${params.search}%` : null

  const dataRows = await sql`
    SELECT 
      hr.*, 
      s.name_latin AS surah_name_latin, 
      s.number AS surah_number, 
      u.full_name AS teacher_name,
      st.full_name AS student_name,
      c.name AS class_name
    FROM hafalan_records hr
    JOIN surahs s ON s.id = hr.surah_id
    JOIN users u ON u.id = hr.teacher_id
    JOIN students st ON st.id = hr.student_id
    JOIN enrollments e ON e.student_id = st.id AND e.academic_year_id = (SELECT id FROM academic_years WHERE is_active = TRUE LIMIT 1)
    JOIN classes c ON c.id = e.class_id
    WHERE st.deleted_at IS NULL
      AND (${searchPattern}::text IS NULL OR st.full_name ILIKE ${searchPattern})
    ORDER BY hr.session_date DESC, hr.id DESC
    LIMIT ${params.limit} OFFSET ${params.offset}
  `

  const countRows = await sql`
    SELECT COUNT(*)::int as total
    FROM hafalan_records hr
    JOIN students st ON st.id = hr.student_id
    WHERE st.deleted_at IS NULL
      AND (${searchPattern}::text IS NULL OR st.full_name ILIKE ${searchPattern})
  `

  return {
    data: dataRows as SearchHafalanRow[],
    total: Number((countRows[0] as any).total)
  }
}
