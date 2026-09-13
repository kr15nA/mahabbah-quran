import { sql } from '@/lib/db/client'

export type AttendanceRow = {
  id: number
  student_id: number
  class_id: number
  teacher_id: number
  attendance_date: string
  status: 'hadir' | 'izin' | 'sakit' | 'alfa'
  notes: string | null
  student_name?: string
}

export type MonthlyAttendanceStat = {
  month: string
  hadir: number
  izin: number
  sakit: number
  alfa: number
}

export type SearchAttendanceRow = {
  id: number | null
  student_id: number
  class_id: number
  teacher_id: number | null
  attendance_date: string | null
  status: 'hadir' | 'izin' | 'sakit' | 'alfa' | null
  notes: string | null
  student_name: string
  class_name: string
  teacher_name: string
}

export async function getAttendanceByClassDate(classId: number, date: string): Promise<AttendanceRow[]> {
  const rows = await sql`
    SELECT a.id, a.student_id, a.class_id, a.teacher_id, a.attendance_date, a.status, a.notes, s.full_name AS student_name
    FROM enrollments e
    JOIN academic_years ay ON ay.id = e.academic_year_id AND ay.is_active = TRUE
    JOIN students s ON s.id = e.student_id
    LEFT JOIN attendance a ON a.student_id = s.id AND a.attendance_date = ${date}
    WHERE e.class_id = ${classId} AND s.deleted_at IS NULL
    ORDER BY s.full_name
  `
  return rows as AttendanceRow[]
}

export async function getAttendanceSummaryByStudent(studentId: number, month?: string) {
  const rows = await sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'hadir')::int AS hadir,
      COUNT(*) FILTER (WHERE status = 'izin')::int AS izin,
      COUNT(*) FILTER (WHERE status = 'sakit')::int AS sakit,
      COUNT(*) FILTER (WHERE status = 'alfa')::int AS alfa,
      COUNT(*)::int AS total
    FROM attendance
    WHERE student_id = ${studentId}
      AND (${month ?? null}::text IS NULL OR TO_CHAR(attendance_date, 'YYYY-MM') = ${month})
  `
  return rows[0] as { hadir: number; izin: number; sakit: number; alfa: number; total: number }
}

export async function getAttendanceByStudentMonth(studentId: number, month?: string): Promise<AttendanceRow[]> {
  const rows = await sql`
    SELECT a.id, a.student_id, a.class_id, a.teacher_id, a.attendance_date, a.status, a.notes
    FROM attendance a
    WHERE a.student_id = ${studentId}
      AND (${month ?? null}::text IS NULL OR TO_CHAR(a.attendance_date, 'YYYY-MM') = ${month})
    ORDER BY a.attendance_date DESC
  `
  return rows as AttendanceRow[]
}

export async function getMonthlyAttendanceStats(classId?: number, monthsCount = 8): Promise<MonthlyAttendanceStat[]> {
  const rows = await sql`
    SELECT
      TO_CHAR(attendance_date, 'Mon') AS month,
      COUNT(*) FILTER (WHERE status = 'hadir')::int AS hadir,
      COUNT(*) FILTER (WHERE status = 'izin')::int AS izin,
      COUNT(*) FILTER (WHERE status = 'sakit')::int AS sakit,
      COUNT(*) FILTER (WHERE status = 'alfa')::int AS alfa
    FROM attendance
    WHERE (${classId ?? null}::bigint IS NULL OR class_id = ${classId})
    GROUP BY TO_CHAR(attendance_date, 'Mon'), DATE_TRUNC('month', attendance_date)
    ORDER BY DATE_TRUNC('month', attendance_date) ASC
    LIMIT ${monthsCount}
  `
  return rows as MonthlyAttendanceStat[]
}

export async function upsertAttendance(data: {
  student_id: number
  class_id: number
  teacher_id: number
  attendance_date: string
  status: 'hadir' | 'izin' | 'sakit' | 'alfa'
  notes?: string
}): Promise<void> {
  await sql`
    INSERT INTO attendance (student_id, class_id, teacher_id, attendance_date, status, notes)
    VALUES (${data.student_id}, ${data.class_id}, ${data.teacher_id}, ${data.attendance_date}, ${data.status}, ${data.notes ?? null})
    ON CONFLICT (student_id, attendance_date)
    DO UPDATE SET status = EXCLUDED.status, notes = EXCLUDED.notes, updated_at = NOW()
  `
}

export async function searchAttendance(params: {
  date: string
  classId?: number | null
  status?: string | null
  studentName?: string | null
  limit: number
  offset: number
}): Promise<{ data: SearchAttendanceRow[]; total: number }> {
  const searchPattern = params.studentName ? `%${params.studentName}%` : null

  const dataRows = await sql`
    SELECT 
      a.id,
      s.id AS student_id,
      c.id AS class_id,
      a.teacher_id,
      a.attendance_date,
      a.status,
      a.notes,
      s.full_name AS student_name,
      c.name AS class_name,
      u.full_name AS teacher_name
    FROM students s
    JOIN enrollments e ON e.student_id = s.id
    JOIN academic_years ay ON ay.id = e.academic_year_id AND ay.is_active = TRUE
    JOIN classes c ON c.id = e.class_id
    JOIN teacher_assignments ta ON ta.class_id = c.id AND ta.academic_year_id = ay.id
    JOIN users u ON u.id = ta.teacher_id
    LEFT JOIN attendance a ON a.student_id = s.id AND a.attendance_date = ${params.date}
    WHERE s.deleted_at IS NULL
      AND (${params.classId ?? null}::bigint IS NULL OR e.class_id = ${params.classId})
      AND (${searchPattern}::text IS NULL OR s.full_name ILIKE ${searchPattern})
      AND (${params.status ?? null}::text IS NULL OR a.status = ${params.status})
    ORDER BY c.name ASC, s.full_name ASC
    LIMIT ${params.limit} OFFSET ${params.offset}
  `

  const countRows = await sql`
    SELECT COUNT(*)::int as total
    FROM students s
    JOIN enrollments e ON e.student_id = s.id
    JOIN academic_years ay ON ay.id = e.academic_year_id AND ay.is_active = TRUE
    LEFT JOIN attendance a ON a.student_id = s.id AND a.attendance_date = ${params.date}
    WHERE s.deleted_at IS NULL
      AND (${params.classId ?? null}::bigint IS NULL OR e.class_id = ${params.classId})
      AND (${searchPattern}::text IS NULL OR s.full_name ILIKE ${searchPattern})
      AND (${params.status ?? null}::text IS NULL OR a.status = ${params.status})
  `

  return {
    data: dataRows as SearchAttendanceRow[],
    total: Number((countRows[0] as any).total)
  }
}

