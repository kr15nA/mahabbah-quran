import { sql } from '@/lib/db/client'

export type StudentRow = {
  id: number
  user_id: number | null
  class_id: number
  full_name: string
  nickname: string | null
  photo_url: string | null
  date_of_birth: string | null
  gender: 'male' | 'female' | null
  enrollment_date: string
  status: 'active' | 'inactive' | 'graduated' | 'transferred'
  class_name?: string
  program_name?: string
  teacher_name?: string
  hafalan_progress?: number
  attendance_pct?: number
  last_score?: number
  last_surah_latin?: string
  last_ayah_end?: number
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
}

export type AtRiskStudent = {
  id: number
  name: string
  class_name: string
  issue: string
  severity: 'danger' | 'warning'
}

export async function getStudentsByTeacher(teacherId: number): Promise<StudentRow[]> {
  const rows = await sql`
    SELECT
      s.*,
      c.name AS class_name,
      p.name AS program_name,
      u.full_name AS teacher_name,
      COALESCE(ROUND(AVG(hr.score)), 75)::int AS last_score,
      COALESCE(ROUND(
        (COUNT(DISTINCT att.id) FILTER (WHERE att.status = 'hadir')::numeric / NULLIF(COUNT(DISTINCT att.id), 0)) * 100
      ), 100)::int AS attendance_pct
    FROM students s
    JOIN classes c ON c.id = s.class_id
    JOIN programs p ON p.id = c.program_id
    JOIN users u ON u.id = c.teacher_id
    LEFT JOIN hafalan_records hr ON hr.student_id = s.id
    LEFT JOIN attendance att ON att.student_id = s.id
    WHERE c.teacher_id = ${teacherId}
      AND s.deleted_at IS NULL
    GROUP BY s.id, c.name, p.name, u.full_name
    ORDER BY s.full_name
  `
  return rows as StudentRow[]
}

export async function getStudentsByClass(classId: number): Promise<StudentRow[]> {
  const rows = await sql`
    SELECT s.*, c.name AS class_name, p.name AS program_name
    FROM students s
    JOIN classes c ON c.id = s.class_id
    JOIN programs p ON p.id = c.program_id
    WHERE s.class_id = ${classId} AND s.deleted_at IS NULL
    ORDER BY s.full_name
  `
  return rows as StudentRow[]
}

export async function getStudentById(id: number): Promise<StudentRow | null> {
  const rows = await sql`
    SELECT s.*, c.name AS class_name, p.name AS program_name, u.full_name AS teacher_name
    FROM students s
    JOIN classes c ON c.id = s.class_id
    JOIN programs p ON p.id = c.program_id
    JOIN users u ON u.id = c.teacher_id
    WHERE s.id = ${id} AND s.deleted_at IS NULL
    LIMIT 1
  `
  return (rows[0] as StudentRow) ?? null
}

export async function searchStudents(query?: string, filters?: {
  program_id?: number
  class_id?: number
  status?: string
}, pagination?: {
  limit: number
  offset: number
}): Promise<{ data: StudentRow[], total: number }> {
  const q = query ? `%${query}%` : null
  const limit = pagination?.limit ?? null
  const offset = pagination?.offset ?? null
  
  const rows = await sql`
    SELECT
      s.*,
      c.name AS class_name,
      p.name AS program_name,
      u.full_name AS teacher_name,
      COALESCE(ROUND(AVG(hr.score)), 80)::int AS last_score,
      COALESCE(ROUND(
        (COUNT(DISTINCT att.id) FILTER (WHERE att.status = 'hadir')::numeric / NULLIF(COUNT(DISTINCT att.id), 0)) * 100
      ), 90)::int AS attendance_pct,
      COUNT(*) OVER() AS total_count
    FROM students s
    JOIN classes c ON c.id = s.class_id
    JOIN programs p ON p.id = c.program_id
    JOIN users u ON u.id = c.teacher_id
    LEFT JOIN hafalan_records hr ON hr.student_id = s.id
    LEFT JOIN attendance att ON att.student_id = s.id
    WHERE s.deleted_at IS NULL
      AND (${q}::text IS NULL OR s.full_name ILIKE ${q}::text)
      AND (${filters?.class_id ?? null}::bigint IS NULL OR s.class_id = ${filters?.class_id})
      AND (${filters?.program_id ?? null}::bigint IS NULL OR p.id = ${filters?.program_id})
      AND (${filters?.status ?? null}::text IS NULL OR s.status = ${filters?.status})
    GROUP BY s.id, c.name, p.name, u.full_name
    ORDER BY s.full_name
    LIMIT ${limit}
    OFFSET ${offset}
  `
  const total = rows.length > 0 ? Number(rows[0].total_count) : 0
  return { data: rows as StudentRow[], total }
}

export async function insertStudent(data: {
  class_id: number
  full_name: string
  nickname?: string
  gender?: string
  date_of_birth?: string
  enrollment_date: string
  photo_url?: string
}): Promise<number> {
  const rows = await sql`
    INSERT INTO students (class_id, full_name, nickname, gender, date_of_birth, enrollment_date, photo_url)
    VALUES (${data.class_id}, ${data.full_name}, ${data.nickname ?? null}, ${data.gender ?? null}, ${data.date_of_birth ?? null}, ${data.enrollment_date}, ${data.photo_url ?? null})
    RETURNING id
  `
  return (rows[0] as { id: number }).id
}

export async function updateStudent(id: number, data: Partial<StudentRow>): Promise<void> {
  if (data.full_name) {
    await sql`UPDATE students SET full_name = ${data.full_name}, updated_at = NOW() WHERE id = ${id}`
  }
  if (data.class_id) {
    await sql`UPDATE students SET class_id = ${data.class_id}, updated_at = NOW() WHERE id = ${id}`
  }
  if (data.status) {
    await sql`UPDATE students SET status = ${data.status}, updated_at = NOW() WHERE id = ${id}`
  }
}

export async function softDeleteStudent(id: number): Promise<void> {
  await sql`
    UPDATE students SET deleted_at = NOW(), status = 'inactive' WHERE id = ${id}
  `
}

export async function getAtRiskStudents(): Promise<AtRiskStudent[]> {
  const rows = await sql`
    WITH att_stats AS (
      SELECT
        student_id,
        ROUND((COUNT(*) FILTER (WHERE status = 'hadir')::numeric / NULLIF(COUNT(*), 0)) * 100) AS att_pct
      FROM attendance
      WHERE attendance_date >= (CURRENT_DATE - INTERVAL '30 days')
      GROUP BY student_id
    ),
    hafalan_stats AS (
      SELECT
        student_id,
        AVG(score) AS avg_score
      FROM (
        SELECT student_id, score,
               ROW_NUMBER() OVER (PARTITION BY student_id ORDER BY session_date DESC) as rn
        FROM hafalan_records
      ) t
      WHERE rn <= 3
      GROUP BY student_id
    )
    SELECT
      s.id,
      s.full_name AS name,
      c.name AS class_name,
      CASE
        WHEN hs.avg_score < 60 THEN 'Nilai hafalan < 60 (3 sesi berturut)'
        WHEN att.att_pct < 70 THEN CONCAT('Kehadiran bulan ini ', att.att_pct, '%')
        ELSE 'Perlu perhatian khusus'
      END AS issue,
      CASE
        WHEN hs.avg_score < 60 THEN 'danger'
        ELSE 'warning'
      END AS severity
    FROM students s
    JOIN classes c ON c.id = s.class_id
    LEFT JOIN att_stats att ON att.student_id = s.id
    LEFT JOIN hafalan_stats hs ON hs.student_id = s.id
    WHERE s.deleted_at IS NULL
      AND (att.att_pct < 70 OR hs.avg_score < 60)
    ORDER BY s.full_name
    LIMIT 10
  `
  return rows as AtRiskStudent[]
}
