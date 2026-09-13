import { sql } from '@/lib/db/client'

export type AdminAnalytics = {
  totalStudents: number
  totalClasses: number
  totalTeachers: number
  attendance: {
    hadir: number
    izin: number
    sakit: number
    alfa: number
  }
  hafalanRecords: number
  tahsinRecords: number
  tahsinAverages: {
    makhraj: number
    tajwid: number
    kelancaran: number
    ghunnah: number
  }
  penilaianAverages: {
    hafalan: number
    tahsin: number
    adab: number
    overall: number
  }
  reports: {
    total: number
    draft: number
    sent: number
  }
  periodStr: string
}

export async function getAdminAnalytics(monthStr?: string): Promise<AdminAnalytics> {
  const targetMonth = monthStr || new Date().toISOString().substring(0, 7) // 'YYYY-MM'

  // All-time counts
  const totalStudents = await sql`SELECT COUNT(*)::int as count FROM students WHERE deleted_at IS NULL`
  const totalClasses = await sql`SELECT COUNT(*)::int as count FROM classes WHERE is_active = true`
  const totalTeachers = await sql`SELECT COUNT(*)::int as count FROM users WHERE role = 'guru' AND is_active = true AND deleted_at IS NULL`

  // Period specific
  const attendance = await sql`
    SELECT status, COUNT(*)::int as count 
    FROM attendance 
    WHERE TO_CHAR(attendance_date, 'YYYY-MM') = ${targetMonth}
    GROUP BY status
  `
  let attStats = { hadir: 0, izin: 0, sakit: 0, alfa: 0 }
  attendance.forEach((r: any) => {
    if (r.status === 'hadir') attStats.hadir = r.count
    if (r.status === 'izin') attStats.izin = r.count
    if (r.status === 'sakit') attStats.sakit = r.count
    if (r.status === 'alfa') attStats.alfa = r.count
  })

  // Hafalan period specific
  const hafalanCount = await sql`
    SELECT COUNT(*)::int as count 
    FROM hafalan_records 
    WHERE TO_CHAR(session_date, 'YYYY-MM') = ${targetMonth}
  `

  // Tahsin period specific
  const tahsinStats = await sql`
    SELECT 
      COUNT(*)::int as count,
      ROUND(AVG(makhraj_score), 1)::float as avg_makhraj,
      ROUND(AVG(tajwid_score), 1)::float as avg_tajwid,
      ROUND(AVG(kelancaran_score), 1)::float as avg_kelancaran,
      ROUND(AVG(ghunnah_score), 1)::float as avg_ghunnah
    FROM tahsin_records 
    WHERE TO_CHAR(session_date, 'YYYY-MM') = ${targetMonth}
  `
  const ts = tahsinStats[0] as any

  // Learning Reports period specific
  const reportStats = await sql`
    SELECT 
      COUNT(*)::int as total,
      SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END)::int as draft,
      SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END)::int as sent,
      ROUND(AVG(hafalan_score), 1)::float as avg_hafalan,
      ROUND(AVG(tahsin_score), 1)::float as avg_tahsin,
      ROUND(AVG(adab_score), 1)::float as avg_adab,
      ROUND(AVG( (COALESCE(hafalan_score, 0) + COALESCE(tahsin_score, 0) + COALESCE(adab_score, 0)) / 
          NULLIF((CASE WHEN hafalan_score IS NOT NULL THEN 1 ELSE 0 END + 
                  CASE WHEN tahsin_score IS NOT NULL THEN 1 ELSE 0 END + 
                  CASE WHEN adab_score IS NOT NULL THEN 1 ELSE 0 END), 0)
      ), 1)::float as avg_overall
    FROM learning_reports
    WHERE TO_CHAR(report_date, 'YYYY-MM') = ${targetMonth}
  `
  const rs = reportStats[0] as any

  return {
    totalStudents: totalStudents[0].count as number,
    totalClasses: totalClasses[0].count as number,
    totalTeachers: totalTeachers[0].count as number,
    attendance: attStats,
    hafalanRecords: hafalanCount[0].count as number,
    tahsinRecords: ts.count as number,
    tahsinAverages: {
      makhraj: ts.avg_makhraj || 0,
      tajwid: ts.avg_tajwid || 0,
      kelancaran: ts.avg_kelancaran || 0,
      ghunnah: ts.avg_ghunnah || 0,
    },
    penilaianAverages: {
      hafalan: rs.avg_hafalan || 0,
      tahsin: rs.avg_tahsin || 0,
      adab: rs.avg_adab || 0,
      overall: rs.avg_overall || 0,
    },
    reports: {
      total: rs.total || 0,
      draft: rs.draft || 0,
      sent: rs.sent || 0,
    },
    periodStr: targetMonth
  }
}

export async function getLearningProgressChartData(monthsCount = 8) {
  const rows = await sql`
    SELECT
      TO_CHAR(report_date, 'Mon') AS m,
      DATE_TRUNC('month', report_date) AS month_date,
      ROUND(AVG(hafalan_score))::int AS hafalan,
      ROUND(AVG(tahsin_score))::int AS tahsin,
      ROUND(AVG( (COALESCE(hafalan_score, 0) + COALESCE(tahsin_score, 0) + COALESCE(adab_score, 0)) / 
          NULLIF((CASE WHEN hafalan_score IS NOT NULL THEN 1 ELSE 0 END + 
                  CASE WHEN tahsin_score IS NOT NULL THEN 1 ELSE 0 END + 
                  CASE WHEN adab_score IS NOT NULL THEN 1 ELSE 0 END), 0)
      ))::int AS score
    FROM learning_reports
    GROUP BY TO_CHAR(report_date, 'Mon'), DATE_TRUNC('month', report_date)
    ORDER BY DATE_TRUNC('month', report_date) ASC
    LIMIT ${monthsCount}
  `
  return rows.map(r => ({
    m: r.m,
    hafalan: r.hafalan || 0,
    tahsin: r.tahsin || 0,
    score: r.score || 0
  }))
}
