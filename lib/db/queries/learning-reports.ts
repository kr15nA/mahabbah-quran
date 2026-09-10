import { sql } from '@/lib/db/client'

export type LearningReportRow = {
  id: number
  student_id: number
  teacher_id: number
  report_date: string
  attendance_status: 'hadir' | 'izin' | 'sakit' | 'alfa'
  hafalan_record_id: number | null
  tahsin_record_id: number | null
  hafalan_score: number | null
  tahsin_score: number | null
  adab_score: number | null
  teacher_notes: string | null
  ai_report_text: string | null
  ai_parent_advice: string | null
  status: 'draft' | 'sent' | 'reviewed'
  sent_to_parent_at: Date | null
  student_name?: string
  student_photo?: string
  class_name?: string
  teacher_name?: string
  surah_name_latin?: string
  ayah_start?: number
  ayah_end?: number
  hafalan_type?: string
  makhraj_score?: number
  tajwid_score?: number
  kelancaran_score?: number
  ghunnah_score?: number
  created_at: Date
  updated_at: Date
}

export async function getLearningReportsByTeacherDate(teacherId: number, date?: string): Promise<LearningReportRow[]> {
  const targetDate = date ?? new Date().toISOString().split('T')[0]
  const rows = await sql`
    SELECT
      lr.*,
      s.full_name AS student_name,
      s.photo_url AS student_photo,
      c.name AS class_name,
      sr.name_latin AS surah_name_latin,
      hr.ayah_start,
      hr.ayah_end,
      hr.type AS hafalan_type
    FROM learning_reports lr
    JOIN students s ON s.id = lr.student_id
    JOIN classes c ON c.id = s.class_id
    LEFT JOIN hafalan_records hr ON hr.id = lr.hafalan_record_id
    LEFT JOIN surahs sr ON sr.id = hr.surah_id
    WHERE lr.teacher_id = ${teacherId} AND lr.report_date = ${targetDate}
    ORDER BY s.full_name
  `
  return rows as LearningReportRow[]
}

export async function getLearningReportsByStudent(studentId: number, limit = 20): Promise<LearningReportRow[]> {
  const rows = await sql`
    SELECT
      lr.*,
      s.full_name AS student_name,
      u.full_name AS teacher_name,
      c.name AS class_name,
      sr.name_latin AS surah_name_latin,
      hr.ayah_start,
      hr.ayah_end,
      hr.type AS hafalan_type
    FROM learning_reports lr
    JOIN students s ON s.id = lr.student_id
    JOIN users u ON u.id = lr.teacher_id
    JOIN classes c ON c.id = s.class_id
    LEFT JOIN hafalan_records hr ON hr.id = lr.hafalan_record_id
    LEFT JOIN surahs sr ON sr.id = hr.surah_id
    WHERE lr.student_id = ${studentId}
    ORDER BY lr.report_date DESC, lr.id DESC
    LIMIT ${limit}
  `
  return rows as LearningReportRow[]
}

export async function getLearningReportById(id: number): Promise<LearningReportRow | null> {
  const rows = await sql`
    SELECT
      lr.*,
      s.full_name AS student_name,
      s.photo_url AS student_photo,
      u.full_name AS teacher_name,
      c.name AS class_name,
      sr.name_latin AS surah_name_latin,
      hr.ayah_start,
      hr.ayah_end,
      hr.type AS hafalan_type,
      tr.makhraj_score,
      tr.tajwid_score,
      tr.kelancaran_score,
      tr.ghunnah_score
    FROM learning_reports lr
    JOIN students s ON s.id = lr.student_id
    JOIN users u ON u.id = lr.teacher_id
    JOIN classes c ON c.id = s.class_id
    LEFT JOIN hafalan_records hr ON hr.id = lr.hafalan_record_id
    LEFT JOIN surahs sr ON sr.id = hr.surah_id
    LEFT JOIN tahsin_records tr ON tr.id = lr.tahsin_record_id
    WHERE lr.id = ${id}
    LIMIT 1
  `
  return (rows[0] as LearningReportRow) ?? null
}

export async function insertLearningReport(data: {
  student_id: number
  teacher_id: number
  report_date: string
  attendance_status: string
  hafalan_record_id?: number
  tahsin_record_id?: number
  hafalan_score?: number
  tahsin_score?: number
  adab_score?: number
  teacher_notes?: string
  status?: string
}): Promise<number> {
  const rows = await sql`
    INSERT INTO learning_reports (
      student_id, teacher_id, report_date, attendance_status,
      hafalan_record_id, tahsin_record_id, hafalan_score, tahsin_score, adab_score, teacher_notes, status
    ) VALUES (
      ${data.student_id}, ${data.teacher_id}, ${data.report_date}, ${data.attendance_status},
      ${data.hafalan_record_id ?? null}, ${data.tahsin_record_id ?? null}, ${data.hafalan_score ?? null},
      ${data.tahsin_score ?? null}, ${data.adab_score ?? null}, ${data.teacher_notes ?? null}, ${data.status ?? 'draft'}
    )
    ON CONFLICT (student_id, report_date) DO UPDATE SET
      attendance_status = EXCLUDED.attendance_status,
      hafalan_record_id = COALESCE(EXCLUDED.hafalan_record_id, learning_reports.hafalan_record_id),
      tahsin_record_id = COALESCE(EXCLUDED.tahsin_record_id, learning_reports.tahsin_record_id),
      hafalan_score = EXCLUDED.hafalan_score,
      tahsin_score = EXCLUDED.tahsin_score,
      adab_score = EXCLUDED.adab_score,
      teacher_notes = EXCLUDED.teacher_notes,
      updated_at = NOW()
    RETURNING id
  `
  return (rows[0] as { id: number }).id
}

export async function updateLearningReport(id: number, data: Partial<LearningReportRow>): Promise<void> {
  if (data.ai_report_text !== undefined) {
    await sql`UPDATE learning_reports SET ai_report_text = ${data.ai_report_text}, updated_at = NOW() WHERE id = ${id}`
  }
  if (data.ai_parent_advice !== undefined) {
    await sql`UPDATE learning_reports SET ai_parent_advice = ${data.ai_parent_advice}, updated_at = NOW() WHERE id = ${id}`
  }
  if (data.teacher_notes !== undefined) {
    await sql`UPDATE learning_reports SET teacher_notes = ${data.teacher_notes}, updated_at = NOW() WHERE id = ${id}`
  }
  if (data.status !== undefined) {
    await sql`UPDATE learning_reports SET status = ${data.status}, updated_at = NOW() WHERE id = ${id}`
  }
}

export async function markReportSent(id: number): Promise<void> {
  await sql`
    UPDATE learning_reports
    SET status = 'sent', sent_to_parent_at = NOW(), updated_at = NOW()
    WHERE id = ${id}
  `
}

export async function getUnsentReportsCount(teacherId: number): Promise<number> {
  const rows = await sql`
    SELECT COUNT(*)::int AS count
    FROM learning_reports
    WHERE teacher_id = ${teacherId} AND status = 'draft' AND report_date = CURRENT_DATE
  `
  return (rows[0] as { count: number }).count
}

export async function getAllReportsAdmin(): Promise<LearningReportRow[]> {
  const rows = await sql`
    SELECT
      lr.*,
      s.full_name AS student_name,
      u.full_name AS teacher_name,
      c.name AS class_name,
      sr.name_latin AS surah_name_latin,
      hr.ayah_start,
      hr.ayah_end
    FROM learning_reports lr
    JOIN students s ON s.id = lr.student_id
    JOIN users u ON u.id = lr.teacher_id
    JOIN classes c ON c.id = s.class_id
    LEFT JOIN hafalan_records hr ON hr.id = lr.hafalan_record_id
    LEFT JOIN surahs sr ON sr.id = hr.surah_id
    ORDER BY lr.report_date DESC, lr.id DESC
    LIMIT 50
  `
  return rows as LearningReportRow[]
}
