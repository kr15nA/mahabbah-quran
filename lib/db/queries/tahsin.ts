import { sql } from '@/lib/db/client'

export type TahsinRow = {
  id: number
  student_id: number
  teacher_id: number
  session_date: string
  makhraj_score: number | null
  tajwid_score: number | null
  kelancaran_score: number | null
  ghunnah_score: number | null
  created_at: Date
}

export async function getTahsinByStudent(studentId: number, limit = 20): Promise<TahsinRow[]> {
  const rows = await sql`
    SELECT * FROM tahsin_records
    WHERE student_id = ${studentId}
    ORDER BY session_date DESC, id DESC
    LIMIT ${limit}
  `
  return rows as TahsinRow[]
}

export async function insertTahsinRecord(data: {
  student_id: number
  teacher_id: number
  session_date: string
  makhraj_score?: number
  tajwid_score?: number
  kelancaran_score?: number
  ghunnah_score?: number
}): Promise<number> {
  const rows = await sql`
    INSERT INTO tahsin_records (student_id, teacher_id, session_date, makhraj_score, tajwid_score, kelancaran_score, ghunnah_score)
    VALUES (${data.student_id}, ${data.teacher_id}, ${data.session_date}, ${data.makhraj_score ?? null}, ${data.tajwid_score ?? null}, ${data.kelancaran_score ?? null}, ${data.ghunnah_score ?? null})
    RETURNING id
  `
  return (rows[0] as { id: number }).id
}

export async function getTahsinAverageByStudent(studentId: number) {
  const rows = await sql`
    SELECT
      ROUND(AVG(makhraj_score), 1) AS avg_makhraj,
      ROUND(AVG(tajwid_score), 1) AS avg_tajwid,
      ROUND(AVG(kelancaran_score), 1) AS avg_kelancaran,
      ROUND(AVG(ghunnah_score), 1) AS avg_ghunnah
    FROM tahsin_records
    WHERE student_id = ${studentId}
  `
  return rows[0] as {
    avg_makhraj: number | null
    avg_tajwid: number | null
    avg_kelancaran: number | null
    avg_ghunnah: number | null
  }
}
