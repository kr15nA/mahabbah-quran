type SurahData = {
  id: number
  totalAyahs: number
  number: number
}

type CoverageRange = {
  surahId: number
  ayahStart: number
  ayahEnd: number
}

type Target = {
  startSurahId: number
  startAyah: number
  endSurahId: number
  endAyah: number
}

export type TargetProgressResult = {
  coveredAyahs: number
  totalTargetAyahs: number
  percentage: number
  isCovered: boolean
}

/**
 * Calculates progress for a specific target based on textual Quran order.
 * Expects surah objects to contain `id`, `number` (canonical quran order), and `totalAyahs`.
 */
export function calculateTargetProgress(
  target: Target | null,
  surahs: SurahData[],
  coverage: CoverageRange[]
): TargetProgressResult {
  if (!target || surahs.length === 0) {
    return { coveredAyahs: 0, totalTargetAyahs: 0, percentage: 0, isCovered: false }
  }

  const startSurah = surahs.find(s => s.id === target.startSurahId)
  const endSurah = surahs.find(s => s.id === target.endSurahId)

  if (!startSurah || !endSurah) {
    return { coveredAyahs: 0, totalTargetAyahs: 0, percentage: 0, isCovered: false }
  }

  // Determine all surahs involved in the target
  const targetSurahs = surahs
    .filter(s => s.number >= startSurah.number && s.number <= endSurah.number)
    .sort((a, b) => a.number - b.number)

  if (targetSurahs.length === 0) {
    return { coveredAyahs: 0, totalTargetAyahs: 0, percentage: 0, isCovered: false }
  }

  let totalTargetAyahs = 0
  let coveredAyahs = 0

  for (const surah of targetSurahs) {
    let tStart = 1
    let tEnd = surah.totalAyahs

    if (surah.id === target.startSurahId) {
      tStart = target.startAyah
    }
    if (surah.id === target.endSurahId) {
      tEnd = target.endAyah
    }

    if (tEnd < tStart) continue // Should not happen with valid targets

    totalTargetAyahs += (tEnd - tStart + 1)

    // Intersect coverage for this surah
    const surahCoverage = coverage.filter(c => c.surahId === surah.id)
    
    for (const c of surahCoverage) {
      // Find intersection of [c.ayahStart, c.ayahEnd] and [tStart, tEnd]
      const overlapStart = Math.max(c.ayahStart, tStart)
      const overlapEnd = Math.min(c.ayahEnd, tEnd)

      if (overlapStart <= overlapEnd) {
        coveredAyahs += (overlapEnd - overlapStart + 1)
      }
    }
  }

  let percentage = 0
  if (totalTargetAyahs > 0) {
    percentage = Math.round((coveredAyahs / totalTargetAyahs) * 100)
    // ensure bounded
    percentage = Math.max(0, Math.min(100, percentage))
  }

  return {
    coveredAyahs,
    totalTargetAyahs,
    percentage,
    isCovered: totalTargetAyahs > 0 && coveredAyahs >= totalTargetAyahs
  }
}

export type CoverageInput = {
  surahId: number
  surahNameLatin: string
  totalAyahs: number
  ayahStart: number
  ayahEnd: number
}

export type AggregatedSurahCoverage = {
  surahId: number
  name: string
  total: number
  covered: number
  ranges: string[]
  formattedRanges: string
}

export function aggregateSurahCoverage(coverage: CoverageInput[]): AggregatedSurahCoverage[] {
  const map = new Map<number, AggregatedSurahCoverage>()
  
  for (const c of coverage) {
    if (!map.has(c.surahId)) {
      map.set(c.surahId, {
        surahId: c.surahId,
        name: c.surahNameLatin,
        total: c.totalAyahs,
        covered: 0,
        ranges: [],
        formattedRanges: ''
      })
    }
    
    const stat = map.get(c.surahId)!
    const len = (c.ayahEnd - c.ayahStart) + 1
    stat.covered += len
    stat.ranges.push(`${c.ayahStart}-${c.ayahEnd}`)
  }
  
  const result = Array.from(map.values())
  for (const stat of result) {
    stat.formattedRanges = stat.ranges.join(', ')
  }
  
  return result
}
