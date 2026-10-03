import { db } from '@/lib/db/client'
import { tahfizSurahCoverage, tahfizTargets, surahs, academicYears } from '@/drizzle/schema'
import { eq, and, asc } from 'drizzle-orm'

export async function getStudentTahfizCoverageQuery(studentId: number) {
  // Join with surahs to get total_ayahs and surah name
  const rows = await db.select({
    surahId: tahfizSurahCoverage.surahId,
    ayahStart: tahfizSurahCoverage.ayahStart,
    ayahEnd: tahfizSurahCoverage.ayahEnd,
    surahNameLatin: surahs.nameLatin,
    totalAyahs: surahs.totalAyahs,
  })
  .from(tahfizSurahCoverage)
  .innerJoin(surahs, eq(surahs.id, tahfizSurahCoverage.surahId))
  .where(eq(tahfizSurahCoverage.studentId, studentId))
  .orderBy(asc(tahfizSurahCoverage.surahId), asc(tahfizSurahCoverage.ayahStart))

  return rows
}

export async function getActiveTahfizTargetQuery(studentId: number) {
  const targets = await db.select({
    id: tahfizTargets.id,
    startSurahId: tahfizTargets.startSurahId,
    startAyah: tahfizTargets.startAyah,
    endSurahId: tahfizTargets.endSurahId,
    endAyah: tahfizTargets.endAyah,
    createdAt: tahfizTargets.createdAt,
    academicYearId: tahfizTargets.academicYearId,
  })
  .from(tahfizTargets)
  .innerJoin(academicYears, and(eq(academicYears.id, tahfizTargets.academicYearId), eq(academicYears.isActive, true)))
  .where(
    and(
      eq(tahfizTargets.studentId, studentId),
      eq(tahfizTargets.status, 'ACTIVE')
    )
  )
  .limit(1)

  return targets[0] || null
}
