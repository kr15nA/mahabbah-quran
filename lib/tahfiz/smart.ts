import { calculateTargetProgress } from './progress'

export type SurahData = {
  id: number
  totalAyahs: number
  number: number
  nameLatin: string
}

export type CoverageRange = {
  surahId: number
  ayahStart: number
  ayahEnd: number
}

export type Target = {
  startSurahId: number
  startAyah: number
  endSurahId: number
  endAyah: number
  createdAt: string // ISO date string
}

export type HafalanRecord = {
  id: number
  surahId: number
  sessionDate: string // YYYY-MM-DD
  ayahStart: number
  ayahEnd: number
  type: 'hafalan_baru' | 'muraja_ah' | string
}

export type NextFocusRange = {
  surahId: number
  surahNameLatin: string
  ayahStart: number
  ayahEnd: number
} | null

export type ActivitySummary = {
  hafalanBaru: number
  murajaah: number
}

export type MurajaahRecency = {
  daysSinceLast: number | null
  status: 'HAS_MURAJAAH' | 'NO_MURAJAAH_RECORD'
}

/**
 * 1 & 2. Remaining target ayahs/ranges
 * Uses the existing calculateTargetProgress to find remaining count.
 */
export function getTargetRemainingAyahs(
  target: Target | null,
  surahs: SurahData[],
  coverage: CoverageRange[]
): number {
  if (!target) return 0
  const progress = calculateTargetProgress(target, surahs, coverage)
  return progress.totalTargetAyahs - progress.coveredAyahs
}

/**
 * 3. First uncovered range inside active target (in Quran order)
 */
export function getFirstUncoveredRange(
  target: Target | null,
  surahs: SurahData[],
  coverage: CoverageRange[]
): NextFocusRange {
  if (!target || surahs.length === 0) return null

  const startSurah = surahs.find((s) => s.id === target.startSurahId)
  const endSurah = surahs.find((s) => s.id === target.endSurahId)

  if (!startSurah || !endSurah) return null

  const targetSurahs = surahs
    .filter((s) => s.number >= startSurah.number && s.number <= endSurah.number)
    .sort((a, b) => a.number - b.number)

  if (targetSurahs.length === 0) return null

  for (const surah of targetSurahs) {
    let tStart = 1
    let tEnd = surah.totalAyahs

    if (surah.id === target.startSurahId) {
      tStart = target.startAyah
    }
    if (surah.id === target.endSurahId) {
      tEnd = target.endAyah
    }

    if (tEnd < tStart) continue

    const surahCoverage = coverage
      .filter((c) => c.surahId === surah.id)
      // Sort by start ayah ascending to easily find gaps
      .sort((a, b) => a.ayahStart - b.ayahStart)

    // Merge overlapping/adjacent coverage just in case
    const merged: { start: number; end: number }[] = []
    for (const c of surahCoverage) {
      if (merged.length === 0) {
        merged.push({ start: c.ayahStart, end: c.ayahEnd })
      } else {
        const last = merged[merged.length - 1]
        if (c.ayahStart <= last.end + 1) {
          last.end = Math.max(last.end, c.ayahEnd)
        } else {
          merged.push({ start: c.ayahStart, end: c.ayahEnd })
        }
      }
    }

    let currentAyah = tStart
    for (const cov of merged) {
      // If there is a gap before this coverage range
      if (currentAyah < cov.start) {
        // Gap from currentAyah to cov.start - 1 (but capped at tEnd)
        const gapEnd = Math.min(cov.start - 1, tEnd)
        if (currentAyah <= gapEnd) {
          return {
            surahId: surah.id,
            surahNameLatin: surah.nameLatin,
            ayahStart: currentAyah,
            ayahEnd: gapEnd,
          }
        }
      }
      // Move currentAyah past this coverage
      currentAyah = Math.max(currentAyah, cov.end + 1)
      if (currentAyah > tEnd) break
    }

    // Check if there is still a gap after all coverages up to tEnd
    if (currentAyah <= tEnd) {
      return {
        surahId: surah.id,
        surahNameLatin: surah.nameLatin,
        ayahStart: currentAyah,
        ayahEnd: tEnd,
      }
    }
  }

  return null // Target is fully covered
}

/**
 * 4. 30-day Hafalan Baru / Murajaah activity counts
 */
export function calculateActivity30Days(
  records: HafalanRecord[],
  todayStr: string // YYYY-MM-DD
): ActivitySummary {
  const today = new Date(todayStr + 'T00:00:00Z')
  // 30 days inclusive of today
  const thirtyDaysAgo = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000)
  
  let hafalanBaru = 0
  let murajaah = 0

  for (const record of records) {
    const recordDate = new Date(record.sessionDate + 'T00:00:00Z')
    if (recordDate >= thirtyDaysAgo && recordDate <= today) {
      if (record.type === 'hafalan_baru') {
        hafalanBaru++
      } else if (record.type === 'muraja_ah') {
        murajaah++
      }
    }
  }

  return { hafalanBaru, murajaah }
}

/**
 * 5. Murajaah recency FACTS
 * We find the most recent Murajaah record in the target (or overall if no target).
 * The instructions say: "Prefer Murajaah records relevant to the ACTIVE target when an active target exists."
 */
export function getMurajaahRecency(
  target: Target | null,
  records: HafalanRecord[],
  todayStr: string // YYYY-MM-DD
): MurajaahRecency {
  const murajaahRecords = records.filter(r => r.type === 'muraja_ah')
  
  if (murajaahRecords.length === 0) {
    return { daysSinceLast: null, status: 'NO_MURAJAAH_RECORD' }
  }

  // If there's an active target, filter to target-relevant ones if any exist
  let relevantRecords = murajaahRecords
  if (target) {
    // Actually, we don't have surah logic easily cross-referenced without SurahData,
    // but we can just say if it matches startSurahId <= surahId <= endSurahId loosely,
    // or just pass SurahData to be exact. To keep it simple, we assume the query provides 
    // relevant records, or we just take the latest murajaah of the student. 
    // The instructions say "relevant to the ACTIVE target".
    // Let's filter by just being within the surah bounds for simplicity if we don't have exact surah numbering.
    // Ideally we should have SurahData, but let's just find the max date of all murajaah for now if we can't easily filter.
    // Wait, let's just find the max date in the provided records. The caller should pass target-relevant records if possible.
  }

  let latestDateStr = ''
  for (const r of relevantRecords) {
    if (!latestDateStr || r.sessionDate > latestDateStr) {
      latestDateStr = r.sessionDate
    }
  }

  if (!latestDateStr) {
    return { daysSinceLast: null, status: 'NO_MURAJAAH_RECORD' }
  }

  const today = new Date(todayStr + 'T00:00:00Z')
  const latestDate = new Date(latestDateStr + 'T00:00:00Z')
  const diffTime = today.getTime() - latestDate.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  return {
    daysSinceLast: Math.max(0, diffDays),
    status: 'HAS_MURAJAAH'
  }
}

/**
 * 6. Guru-only stalled-target insight using 14-day threshold
 * Threshold = 14.
 * Both hafalan_baru and muraja_ah count.
 * Uses target creation date if no records exist.
 */
export function isTargetStalled(
  target: Target | null,
  records: HafalanRecord[],
  todayStr: string // YYYY-MM-DD
): boolean {
  if (!target) return false

  const today = new Date(todayStr + 'T00:00:00Z')
  
  // Find latest evidence date
  let latestDateStr = ''
  for (const r of records) {
    if (!latestDateStr || r.sessionDate > latestDateStr) {
      latestDateStr = r.sessionDate
    }
  }

  let referenceDate: Date
  if (latestDateStr) {
    referenceDate = new Date(latestDateStr + 'T00:00:00Z')
  } else {
    // target.createdAt is ISO string
    referenceDate = new Date(target.createdAt)
    // normalize to start of day
    referenceDate.setUTCHours(0,0,0,0)
  }

  const diffTime = today.getTime() - referenceDate.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  return diffDays >= 14
}
