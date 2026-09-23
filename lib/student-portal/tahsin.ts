import { sql } from '@/lib/db/client'
import { requireSelfStudentProfile } from '@/lib/identity/learner'

export type MyTahsinRow = {
  id: number
  session_date: string
  makhraj_score: number | null
  tajwid_score: number | null
  kelancaran_score: number | null
  ghunnah_score: number | null
  teacher_name: string | null
}

export async function getMyLatestTahsin(userId: number) {
  const profile = await requireSelfStudentProfile(userId)
  const studentId = Number(profile.id)
  
  const rows = await sql`
    SELECT tr.id, tr.session_date, tr.makhraj_score, tr.tajwid_score, tr.kelancaran_score, tr.ghunnah_score, u.full_name AS teacher_name
    FROM tahsin_records tr
    LEFT JOIN users u ON u.id = tr.teacher_id
    WHERE tr.student_id = ${studentId}
    ORDER BY tr.session_date DESC, tr.id DESC
    LIMIT 1
  `
  return (rows[0] as MyTahsinRow) ?? null
}

export async function getMyTahsinHistory(userId: number, page: number = 1, limit: number = 20) {
  const profile = await requireSelfStudentProfile(userId)
  const studentId = Number(profile.id)
  
  const offset = (page - 1) * limit

  const dataRows = await sql`
    SELECT tr.id, tr.session_date, tr.makhraj_score, tr.tajwid_score, tr.kelancaran_score, tr.ghunnah_score, u.full_name AS teacher_name
    FROM tahsin_records tr
    LEFT JOIN users u ON u.id = tr.teacher_id
    WHERE tr.student_id = ${studentId}
    ORDER BY tr.session_date DESC, tr.id DESC
    LIMIT ${limit} OFFSET ${offset}
  `

  const countRows = await sql`
    SELECT COUNT(*)::int as total
    FROM tahsin_records tr
    WHERE tr.student_id = ${studentId}
  `

  return {
    items: dataRows as MyTahsinRow[],
    page,
    pageSize: limit,
    total: Number((countRows[0] as any).total)
  }
}
