import { sql } from '@/lib/db/client'

export type SurahRow = {
  id: number
  number: number
  name_arabic: string
  name_latin: string
  name_translation: string | null
  total_ayahs: number
  juz_start: number
  juz_end: number
}

export async function getAllSurahs(): Promise<SurahRow[]> {
  const rows = await sql`
    SELECT * FROM surahs
    ORDER BY number ASC
  `
  return rows as SurahRow[]
}

export async function getSurahsByJuz(juz: number): Promise<SurahRow[]> {
  const rows = await sql`
    SELECT * FROM surahs
    WHERE ${juz} BETWEEN juz_start AND juz_end
    ORDER BY number ASC
  `
  return rows as SurahRow[]
}

export async function getSurahById(id: number): Promise<SurahRow | null> {
  const rows = await sql`
    SELECT * FROM surahs
    WHERE id = ${id}
    LIMIT 1
  `
  return (rows[0] as SurahRow) ?? null
}
