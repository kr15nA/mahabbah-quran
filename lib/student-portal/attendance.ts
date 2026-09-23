import { sql } from '@/lib/db/client'
import { requireSelfStudentProfile } from '@/lib/identity/learner'
import { getAttendanceSummaryByStudent } from '@/lib/db/queries/attendance'

export type MyAttendanceRow = {
  id: number
  attendance_date: string
  status: 'hadir' | 'izin' | 'sakit' | 'alfa'
}

export async function getMyAttendanceSummary(userId: number, month?: string) {
  const profile = await requireSelfStudentProfile(userId)
  const studentId = Number(profile.id)
  return getAttendanceSummaryByStudent(studentId, month)
}

export async function getMyAttendanceHistory(userId: number, month?: string, page: number = 1, limit: number = 20) {
  const profile = await requireSelfStudentProfile(userId)
  const studentId = Number(profile.id)
  
  const offset = (page - 1) * limit

  const dataRows = await sql`
    SELECT id, attendance_date, status
    FROM attendance
    WHERE student_id = ${studentId}
      AND (${month ?? null}::text IS NULL OR TO_CHAR(attendance_date, 'YYYY-MM') = ${month})
    ORDER BY attendance_date DESC
    LIMIT ${limit} OFFSET ${offset}
  `

  const countRows = await sql`
    SELECT COUNT(*)::int as total
    FROM attendance
    WHERE student_id = ${studentId}
      AND (${month ?? null}::text IS NULL OR TO_CHAR(attendance_date, 'YYYY-MM') = ${month})
  `

  return {
    items: dataRows as MyAttendanceRow[],
    page,
    pageSize: limit,
    total: Number((countRows[0] as any).total)
  }
}
