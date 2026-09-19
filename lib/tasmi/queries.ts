import { db } from '@/lib/db/client'
import { tasmiSessions, surahs, users } from '@/drizzle/schema'
import { eq, desc, and, sql } from 'drizzle-orm'

export type TasmiHistoryRow = {
  id: number
  mode: 'SURAH' | 'JUZ_RANGE'
  sessionDate: string
  score: number | null
  status: 'PASSED' | 'NEEDS_REVIEW'
  notes: string | null
  
  // SURAH
  surahId: number | null
  surahNameLatin: string | null
  surahNumber: number | null
  totalAyahs: number | null

  // JUZ_RANGE
  startJuz: number | null
  endJuz: number | null
  juzCount: number | null

  // EXAMINER
  examinerName: string
}

export async function getTasmiHistory(studentId: number, limit = 20, offset = 0): Promise<{ data: TasmiHistoryRow[]; total: number }> {
  const dataRows = await db.select({
    id: tasmiSessions.id,
    mode: tasmiSessions.mode,
    sessionDate: sql<string>`TO_CHAR(${tasmiSessions.sessionDate}, 'YYYY-MM-DD')`,
    score: tasmiSessions.score,
    status: tasmiSessions.status,
    notes: tasmiSessions.notes,
    
    surahId: tasmiSessions.surahId,
    surahNameLatin: surahs.nameLatin,
    surahNumber: surahs.number,
    totalAyahs: surahs.totalAyahs,

    startJuz: tasmiSessions.startJuz,
    endJuz: tasmiSessions.endJuz,
    juzCount: sql<number>`${tasmiSessions.endJuz} - ${tasmiSessions.startJuz} + 1`,

    examinerName: users.fullName,
  })
  .from(tasmiSessions)
  .leftJoin(surahs, eq(tasmiSessions.surahId, surahs.id))
  .innerJoin(users, eq(tasmiSessions.examinerId, users.id))
  .where(eq(tasmiSessions.studentId, studentId))
  .orderBy(desc(tasmiSessions.sessionDate), desc(tasmiSessions.id))
  .limit(limit)
  .offset(offset)

  const countRow = await db.select({ count: sql<number>`count(*)` })
    .from(tasmiSessions)
    .where(eq(tasmiSessions.studentId, studentId))

  return {
    data: dataRows as TasmiHistoryRow[],
    total: Number(countRow[0]?.count || 0)
  }
}

export async function getLatestTasmi(studentId: number): Promise<TasmiHistoryRow | null> {
  const data = await getTasmiHistory(studentId, 1, 0)
  return data.data[0] ?? null
}

export async function getTasmiAchievement(studentId: number): Promise<{ highestPassedJuzCount: number }> {
  // Highest PASSED single-sitting Juz range
  const row = await db.select({
    maxJuz: sql<number>`MAX(${tasmiSessions.endJuz} - ${tasmiSessions.startJuz} + 1)`
  })
  .from(tasmiSessions)
  .where(and(
    eq(tasmiSessions.studentId, studentId),
    eq(tasmiSessions.mode, 'JUZ_RANGE'),
    eq(tasmiSessions.status, 'PASSED')
  ))

  return {
    highestPassedJuzCount: Number(row[0]?.maxJuz || 0)
  }
}
