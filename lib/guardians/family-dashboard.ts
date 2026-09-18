import { sql } from '@/lib/db/client'
import { getAuthorizedAcademicChildren, SafeChildDisplay, studentIdToDbNumber } from './parent-context'

export type AttendanceMetric = {
  available: boolean
  hasData: boolean
  hadir: number
  izin: number
  sakit: number
  alfa: number
}

export type HafalanMetric = {
  available: boolean
  record: {
    date: string
    surahName: string
    startAyah: number
    endAyah: number
    score: number | null
  } | null
}

export type TahsinMetric = {
  available: boolean
  record: {
    date: string
    makhrajScore: number | null
    tajwidScore: number | null
    kelancaranScore: number | null
    ghunnahScore: number | null
  } | null
}

export type ReportMetric = {
  available: boolean
  record: {
    id: number
    date: string
    title: string | null
  } | null
}

export type FamilyChildDashboardDTO = SafeChildDisplay & {
  attendance: AttendanceMetric
  hafalan: HafalanMetric
  tahsin: TahsinMetric
  report: ReportMetric
}

export async function getFamilyDashboardData(userId: number): Promise<FamilyChildDashboardDTO[]> {
  const children = await getAuthorizedAcademicChildren(userId)
  
  if (children.length === 0) {
    return []
  }

  const dbStudentIds = children.map(c => studentIdToDbNumber(c.student_id))

  // Asia/Jakarta timezone current calendar month boundaries
  const nowInJakarta = new Intl.DateTimeFormat('en-CA', { 
    timeZone: 'Asia/Jakarta', 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  }).format(new Date())
  
  const year = nowInJakarta.substring(0, 4)
  const month = nowInJakarta.substring(5, 7)
  
  const startDate = `${year}-${month}-01`
  const nextM = parseInt(month, 10) === 12 ? 1 : parseInt(month, 10) + 1
  const nextY = parseInt(month, 10) === 12 ? parseInt(year, 10) + 1 : parseInt(year, 10)
  const endDate = `${nextY}-${String(nextM).padStart(2, '0')}-01`

  // Batched Queries
  const attendanceQuery = sql`
    SELECT student_id, status, COUNT(*) as count
    FROM attendance
    WHERE student_id = ANY(${dbStudentIds}::int8[])
      AND attendance_date >= ${startDate}
      AND attendance_date < ${endDate}
    GROUP BY student_id, status
  `

  const hafalanQuery = sql`
    SELECT DISTINCT ON (h.student_id)
      h.student_id, h.session_date, h.ayah_start, h.ayah_end, h.score, s.name_latin as surah_name
    FROM hafalan_records h
    JOIN surahs s ON s.id = h.surah_id
    WHERE h.student_id = ANY(${dbStudentIds}::int8[])
    ORDER BY h.student_id, h.session_date DESC, h.id DESC
  `

  const tahsinQuery = sql`
    SELECT DISTINCT ON (student_id)
      student_id, session_date, makhraj_score, tajwid_score, kelancaran_score, ghunnah_score
    FROM tahsin_records
    WHERE student_id = ANY(${dbStudentIds}::int8[])
    ORDER BY student_id, session_date DESC, id DESC
  `

  const reportQuery = sql`
    SELECT DISTINCT ON (student_id)
      id, student_id, report_date, NULL as title
    FROM learning_reports
    WHERE student_id = ANY(${dbStudentIds}::int8[])
      AND status = 'sent'
    ORDER BY student_id, report_date DESC, id DESC
  `

  const results = await Promise.allSettled([
    attendanceQuery,
    hafalanQuery,
    tahsinQuery,
    reportQuery
  ])

  const attendanceMap = new Map<string, AttendanceMetric>()
  const hafalanMap = new Map<string, HafalanMetric>()
  const tahsinMap = new Map<string, TahsinMetric>()
  const reportMap = new Map<string, ReportMetric>()

  for (const child of children) {
    attendanceMap.set(child.student_id, { available: false, hasData: false, hadir: 0, izin: 0, sakit: 0, alfa: 0 })
    hafalanMap.set(child.student_id, { available: false, record: null })
    tahsinMap.set(child.student_id, { available: false, record: null })
    reportMap.set(child.student_id, { available: false, record: null })
  }

  // Attendance
  if (results[0].status === 'fulfilled') {
    for (const child of children) {
      const entry = attendanceMap.get(child.student_id)!
      entry.available = true
    }
    for (const row of results[0].value) {
      const canonicalId = row.student_id.toString()
      const entry = attendanceMap.get(canonicalId)
      if (entry) {
        entry.hasData = true
        const count = Number(row.count)
        if (row.status === 'hadir') entry.hadir = count
        else if (row.status === 'izin') entry.izin = count
        else if (row.status === 'sakit') entry.sakit = count
        else if (row.status === 'alfa') entry.alfa = count
      }
    }
  } else {
    console.error('Failed to batch fetch attendance:', results[0].reason)
  }

  // Hafalan
  if (results[1].status === 'fulfilled') {
    for (const child of children) {
      hafalanMap.get(child.student_id)!.available = true
    }
    for (const row of results[1].value) {
      const canonicalId = row.student_id.toString()
      const entry = hafalanMap.get(canonicalId)
      if (entry) {
        entry.record = {
          date: new Date(row.session_date).toISOString(),
          surahName: row.surah_name,
          startAyah: row.ayah_start,
          endAyah: row.ayah_end,
          score: row.score
        }
      }
    }
  } else {
    console.error('Failed to batch fetch hafalan:', results[1].reason)
  }

  // Tahsin
  if (results[2].status === 'fulfilled') {
    for (const child of children) {
      tahsinMap.get(child.student_id)!.available = true
    }
    for (const row of results[2].value) {
      const canonicalId = row.student_id.toString()
      const entry = tahsinMap.get(canonicalId)
      if (entry) {
        entry.record = {
          date: new Date(row.session_date).toISOString(),
          makhrajScore: row.makhraj_score,
          tajwidScore: row.tajwid_score,
          kelancaranScore: row.kelancaran_score,
          ghunnahScore: row.ghunnah_score
        }
      }
    }
  } else {
    console.error('Failed to batch fetch tahsin:', results[2].reason)
  }

  // Reports
  if (results[3].status === 'fulfilled') {
    for (const child of children) {
      reportMap.get(child.student_id)!.available = true
    }
    for (const row of results[3].value) {
      const canonicalId = row.student_id.toString()
      const entry = reportMap.get(canonicalId)
      if (entry) {
        entry.record = {
          id: row.id,
          date: new Date(row.report_date).toISOString(),
          title: row.title
        }
      }
    }
  } else {
    console.error('Failed to batch fetch reports:', results[3].reason)
  }

  return children.map(child => ({
    ...child,
    attendance: attendanceMap.get(child.student_id)!,
    hafalan: hafalanMap.get(child.student_id)!,
    tahsin: tahsinMap.get(child.student_id)!,
    report: reportMap.get(child.student_id)!
  })).sort((a, b) => a.student_name.localeCompare(b.student_name))
}
