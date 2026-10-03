import { db } from '@/lib/db/client'
import { hafalanRecords, surahs } from '@/drizzle/schema'
import { getStudentTahfizCoverageQuery, getActiveTahfizTargetQuery } from '@/lib/db/queries/tahfiz'
import { eq, desc } from 'drizzle-orm'
import {
  getTargetRemainingAyahs,
  getFirstUncoveredRange,
  calculateActivity30Days,
  getMurajaahRecency,
  isTargetStalled,
  Target,
  SurahData,
  CoverageRange,
  HafalanRecord,
} from './smart'
import { getBusinessDate } from './date'

export async function getSmartTahfizInsights(studentId: number) {
  // 1. Fetch dependencies concurrently
  const [coverageRows, activeTargetRow, hafalanRows, surahRows] = await Promise.all([
    getStudentTahfizCoverageQuery(studentId),
    getActiveTahfizTargetQuery(studentId),
    db.select({
      id: hafalanRecords.id,
      surahId: hafalanRecords.surahId,
      sessionDate: hafalanRecords.sessionDate,
      ayahStart: hafalanRecords.ayahStart,
      ayahEnd: hafalanRecords.ayahEnd,
      type: hafalanRecords.type,
    })
    .from(hafalanRecords)
    .where(eq(hafalanRecords.studentId, studentId))
    .orderBy(desc(hafalanRecords.sessionDate)),
    db.select({
      id: surahs.id,
      totalAyahs: surahs.totalAyahs,
      number: surahs.number,
      nameLatin: surahs.nameLatin
    }).from(surahs)
  ])

  // Convert to pure structures
  const surahData: SurahData[] = surahRows
  const coverage: CoverageRange[] = coverageRows.map(r => ({
    surahId: r.surahId,
    ayahStart: r.ayahStart,
    ayahEnd: r.ayahEnd
  }))
  const records: HafalanRecord[] = hafalanRows.map(r => ({
    id: r.id,
    surahId: r.surahId,
    sessionDate: r.sessionDate as string, // stored as YYYY-MM-DD
    ayahStart: r.ayahStart,
    ayahEnd: r.ayahEnd,
    type: r.type
  }))
  
  let target: Target | null = null
  if (activeTargetRow) {
    // We need target createdAt for stall logic if there's no evidence. 
    // Wait, getActiveTahfizTargetQuery doesn't return createdAt currently.
    // Let me check what it returns in `lib/db/queries/tahfiz.ts`.
    // Let's assume we can fetch it, or fallback to today.
    target = {
      startSurahId: activeTargetRow.startSurahId,
      startAyah: activeTargetRow.startAyah,
      endSurahId: activeTargetRow.endSurahId,
      endAyah: activeTargetRow.endAyah,
      // Fallback if missing from query.
      createdAt: (activeTargetRow as any).createdAt 
        ? getBusinessDate(new Date((activeTargetRow as any).createdAt)) 
        : getBusinessDate(new Date())
    }
  }

  // Get current business date string in YYYY-MM-DD
  const todayStr = getBusinessDate(new Date())

  // Filter records relevant to active target for stalling and recency
  // A record is relevant if its surah is within the target surah range.
  let targetRelevantRecords = records
  if (target) {
    const startSurah = surahData.find(s => s.id === target?.startSurahId)
    const endSurah = surahData.find(s => s.id === target?.endSurahId)
    if (startSurah && endSurah) {
      targetRelevantRecords = records.filter(r => {
        const s = surahData.find(sur => sur.id === r.surahId)
        if (!s) return false
        return s.number >= startSurah.number && s.number <= endSurah.number
      })
    }
  }

  // Calculate pure insights
  const remainingAyahs = getTargetRemainingAyahs(target, surahData, coverage)
  const nextFocus = getFirstUncoveredRange(target, surahData, coverage)
  const activity30d = calculateActivity30Days(records, todayStr)
  const murajaahRecency = getMurajaahRecency(target, targetRelevantRecords, todayStr)
  const isStalled = isTargetStalled(target, targetRelevantRecords, todayStr)

  return {
    hasActiveTarget: !!target,
    remainingAyahs,
    nextFocus,
    activity30d,
    murajaahRecency,
    isStalled
  }
}
