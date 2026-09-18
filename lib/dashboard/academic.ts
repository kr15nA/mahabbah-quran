import { sql } from '@/lib/db/client'

export type AcademicContext = {
  id: number
  name: string
}

export type PrimaryStats = {
  santriAktif: number
  guruAktif: number
  kelasAktif: number
  programAktif: number
}

export type AttendanceToday = {
  hadir: number
  izin: number
  sakit: number
  alfa: number
}

export type AttendanceTrend = {
  m: string
  hadir: number
  izin: number
  sakit: number
  alfa: number
}

export type LearningActivity = {
  m: string
  hafalan: number
  tahsin: number
  penilaian: number
}

export async function getAcademicDashboardContext(): Promise<AcademicContext | null> {
  const rows = await sql`
    SELECT id, name FROM academic_years WHERE is_active = TRUE LIMIT 1
  `
  if (rows.length === 0) return null
  return rows[0] as AcademicContext
}

export async function getAcademicPrimaryStats(context: AcademicContext): Promise<PrimaryStats> {
  // 1. Santri Aktif
  const santriRows = await sql`
    SELECT COUNT(DISTINCT s.id)::int as count
    FROM students s
    JOIN enrollments e ON e.student_id = s.id
    WHERE s.status = 'active' 
      AND s.deleted_at IS NULL
      AND e.status = 'active'
      AND e.academic_year_id = ${context.id}
  `

  // 2. Guru Aktif
  const guruRows = await sql`
    SELECT COUNT(DISTINCT u.id)::int as count
    FROM users u
    JOIN teacher_assignments ta ON ta.teacher_id = u.id
    WHERE u.is_active = TRUE 
      AND u.deleted_at IS NULL
      AND ta.status = 'active'
      AND ta.academic_year_id = ${context.id}
  `

  // 3. Kelas Aktif (in current year context via enrollments)
  const kelasRows = await sql`
    SELECT COUNT(DISTINCT c.id)::int as count
    FROM classes c
    JOIN enrollments e ON e.class_id = c.id
    WHERE e.academic_year_id = ${context.id}
      AND e.status = 'active'
      AND c.is_active = TRUE
  `

  // 4. Program Aktif (global)
  const programRows = await sql`
    SELECT COUNT(id)::int as count
    FROM programs
    WHERE is_active = TRUE
  `

  return {
    santriAktif: santriRows[0].count,
    guruAktif: guruRows[0].count,
    kelasAktif: kelasRows[0].count,
    programAktif: programRows[0].count,
  }
}

export async function getAttendanceToday(): Promise<AttendanceToday> {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
  
  const rows = await sql`
    SELECT status, COUNT(*)::int as c 
    FROM attendance 
    WHERE attendance_date = ${today}::date
    GROUP BY status
  `

  const stats = { hadir: 0, izin: 0, sakit: 0, alfa: 0 }
  for (const r of rows) {
    if (r.status === 'hadir') stats.hadir = r.c
    if (r.status === 'izin') stats.izin = r.c
    if (r.status === 'sakit') stats.sakit = r.c
    if (r.status === 'alfa') stats.alfa = r.c
  }
  return stats
}

export async function getAttendanceTrend7Days(): Promise<AttendanceTrend[]> {
  const end = new Date()
  const start = new Date(end)
  start.setDate(end.getDate() - 6) // exactly today - 6 to today inclusive = 7 days

  const endStr = end.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
  const startStr = start.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })

  const rows = await sql`
    SELECT 
      attendance_date, 
      status, 
      COUNT(*)::int as c
    FROM attendance
    WHERE attendance_date >= ${startStr}::date AND attendance_date <= ${endStr}::date
    GROUP BY attendance_date, status
  `

  const trendMap = new Map<string, AttendanceTrend>()
  for (let i = 0; i <= 6; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    const dStr = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
    const label = dStr.split('-').slice(1).join('/') // MM/DD
    trendMap.set(dStr, { m: label, hadir: 0, izin: 0, sakit: 0, alfa: 0 })
  }

  for (const r of rows) {
    const dStr = new Date(r.attendance_date as string).toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
    const day = trendMap.get(dStr)
    if (day) {
      if (r.status === 'hadir') day.hadir = r.c
      if (r.status === 'izin') day.izin = r.c
      if (r.status === 'sakit') day.sakit = r.c
      if (r.status === 'alfa') day.alfa = r.c
    }
  }

  return Array.from(trendMap.values())
}

export async function getLearningActivityStats(): Promise<{ hafalan: number, tahsin: number, penilaian: number }> {
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })
  const start = new Date()
  start.setDate(start.getDate() - 6)
  const startStr = start.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })

  const hRows = await sql`
    SELECT COUNT(DISTINCT student_id)::int as c 
    FROM hafalan_records 
    WHERE session_date >= ${startStr}::date AND session_date <= ${todayStr}::date
  `
  
  const tRows = await sql`
    SELECT COUNT(DISTINCT student_id)::int as c 
    FROM tahsin_records 
    WHERE session_date >= ${startStr}::date AND session_date <= ${todayStr}::date
  `

  const pRows = await sql`
    SELECT COUNT(DISTINCT student_id)::int as c 
    FROM learning_reports 
    WHERE report_date >= ${startStr}::date AND report_date <= ${todayStr}::date
  `

  return {
    hafalan: hRows[0].c,
    tahsin: tRows[0].c,
    penilaian: pRows[0].c
  }
}

export async function getLearningActivityChart6Weeks(): Promise<LearningActivity[]> {
  const rows = await sql`
    WITH RECURSIVE weeks AS (
      SELECT 
        date_trunc('week', current_date AT TIME ZONE 'Asia/Jakarta' - interval '5 weeks')::date AS week_start
      UNION ALL
      SELECT (week_start + interval '1 week')::date
      FROM weeks
      WHERE week_start < date_trunc('week', current_date AT TIME ZONE 'Asia/Jakarta')::date
    ),
    hafalan_activity AS (
      SELECT date_trunc('week', session_date)::date as w, COUNT(DISTINCT student_id)::int as c
      FROM hafalan_records
      WHERE session_date >= current_date AT TIME ZONE 'Asia/Jakarta' - interval '6 weeks'
      GROUP BY 1
    ),
    tahsin_activity AS (
      SELECT date_trunc('week', session_date)::date as w, COUNT(DISTINCT student_id)::int as c
      FROM tahsin_records
      WHERE session_date >= current_date AT TIME ZONE 'Asia/Jakarta' - interval '6 weeks'
      GROUP BY 1
    ),
    penilaian_activity AS (
      SELECT date_trunc('week', report_date)::date as w, COUNT(DISTINCT student_id)::int as c
      FROM learning_reports
      WHERE report_date >= current_date AT TIME ZONE 'Asia/Jakarta' - interval '6 weeks'
      GROUP BY 1
    )
    SELECT 
      w.week_start,
      COALESCE(h.c, 0) as hafalan_count,
      COALESCE(t.c, 0) as tahsin_count,
      COALESCE(p.c, 0) as penilaian_count
    FROM weeks w
    LEFT JOIN hafalan_activity h ON h.w = w.week_start
    LEFT JOIN tahsin_activity t ON t.w = w.week_start
    LEFT JOIN penilaian_activity p ON p.w = w.week_start
    ORDER BY w.week_start ASC
  `

  return rows.map(r => ({
    m: new Date(r.week_start as string).toLocaleDateString('en-CA', { day: 'numeric', month: 'short' }),
    hafalan: r.hafalan_count,
    tahsin: r.tahsin_count,
    penilaian: r.penilaian_count
  }))
}
