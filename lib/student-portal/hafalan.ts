import { sql } from '@/lib/db/client'
import { requireSelfStudentProfile } from '@/lib/identity/learner'
import { getLastHafalanByStudent, type HafalanRow } from '@/lib/db/queries/hafalan'

export async function getMyLatestHafalan(userId: number) {
  const profile = await requireSelfStudentProfile(userId)
  const studentId = Number(profile.id)
  return getLastHafalanByStudent(studentId)
}

export async function getMyHafalanHistory(userId: number, page: number = 1, limit: number = 20) {
  const profile = await requireSelfStudentProfile(userId)
  const studentId = Number(profile.id)
  
  const offset = (page - 1) * limit

  const dataRows = await sql`
    SELECT hr.*, s.name_latin AS surah_name_latin, s.number AS surah_number, u.full_name AS teacher_name
    FROM hafalan_records hr
    JOIN surahs s ON s.id = hr.surah_id
    LEFT JOIN users u ON u.id = hr.teacher_id
    WHERE hr.student_id = ${studentId}
    ORDER BY hr.session_date DESC, hr.id DESC
    LIMIT ${limit} OFFSET ${offset}
  `

  const countRows = await sql`
    SELECT COUNT(*)::int as total
    FROM hafalan_records hr
    WHERE hr.student_id = ${studentId}
  `

  return {
    items: dataRows as HafalanRow[],
    page,
    pageSize: limit,
    total: Number((countRows[0] as any).total)
  }
}
