import { describe, test } from 'node:test'
import assert from 'node:assert'
import { calculateTargetProgress, aggregateSurahCoverage } from '../lib/tahfiz/progress'

export async function runTahfizGuruTests() {
  const mockSurahs = [
    { id: 1, number: 1, totalAyahs: 7 },
    { id: 2, number: 2, totalAyahs: 286 },
    { id: 3, number: 3, totalAyahs: 200 }
  ]

  // T1: Target 20-50, Coverage 1-30. Covered = 11, Total = 31
  let result = calculateTargetProgress(
    { startSurahId: 2, startAyah: 20, endSurahId: 2, endAyah: 50 },
    mockSurahs,
    [{ surahId: 2, ayahStart: 1, ayahEnd: 30 }]
  )
  assert.strictEqual(result.coveredAyahs, 11, 'T1 covered')
  assert.strictEqual(result.totalTargetAyahs, 31, 'T1 total')

  // T2: Target 20-50, Coverage 1-25, 30-40, 60-70. Covered = 6 + 11 = 17
  result = calculateTargetProgress(
    { startSurahId: 2, startAyah: 20, endSurahId: 2, endAyah: 50 },
    mockSurahs,
    [
      { surahId: 2, ayahStart: 1, ayahEnd: 25 },
      { surahId: 2, ayahStart: 30, ayahEnd: 40 },
      { surahId: 2, ayahStart: 60, ayahEnd: 70 }
    ]
  )
  assert.strictEqual(result.coveredAyahs, 17, 'T2 covered')
  assert.strictEqual(result.totalTargetAyahs, 31, 'T2 total')

  // T3: Target 20-50, Coverage 20-50 -> 100%
  result = calculateTargetProgress(
    { startSurahId: 2, startAyah: 20, endSurahId: 2, endAyah: 50 },
    mockSurahs,
    [{ surahId: 2, ayahStart: 20, ayahEnd: 50 }]
  )
  assert.strictEqual(result.percentage, 100, 'T3 percentage')
  assert.strictEqual(result.isCovered, true, 'T3 isCovered')

  // T4: Outside target
  result = calculateTargetProgress(
    { startSurahId: 2, startAyah: 20, endSurahId: 2, endAyah: 50 },
    mockSurahs,
    [{ surahId: 2, ayahStart: 1, ayahEnd: 10 }, { surahId: 2, ayahStart: 60, ayahEnd: 70 }]
  )
  assert.strictEqual(result.coveredAyahs, 0, 'T4 covered')
  assert.strictEqual(result.percentage, 0, 'T4 percentage')

  // T5: Cross Surah (Surah 1: 5-7, Surah 2: 1-286, Surah 3: 1-10) 
  // Total: (7-5+1) + 286 + 10 = 3 + 286 + 10 = 299
  result = calculateTargetProgress(
    { startSurahId: 1, startAyah: 5, endSurahId: 3, endAyah: 10 },
    mockSurahs,
    [
      { surahId: 1, ayahStart: 1, ayahEnd: 7 }, // 5-7 inside = 3
      { surahId: 2, ayahStart: 10, ayahEnd: 20 }, // 11 inside
      { surahId: 3, ayahStart: 1, ayahEnd: 5 } // 1-5 inside = 5
    ]
  )
  assert.strictEqual(result.totalTargetAyahs, 299, 'T5 total')
  assert.strictEqual(result.coveredAyahs, 3 + 11 + 5, 'T5 covered')

  // T6: Coverage exists outside target surahs -> ignored
  result = calculateTargetProgress(
    { startSurahId: 2, startAyah: 1, endSurahId: 2, endAyah: 50 },
    mockSurahs,
    [{ surahId: 1, ayahStart: 1, ayahEnd: 7 }, { surahId: 2, ayahStart: 1, ayahEnd: 5 }]
  )
  assert.strictEqual(result.coveredAyahs, 5, 'T6 covered')

  // T7 & T8 handled naturally by intersection logic.

  console.log('✅ calculateTargetProgress tests passed')

  // C1: coverage 1-10 => 10 covered ayahs
  let agg = aggregateSurahCoverage([{ surahId: 1, surahNameLatin: 'Al-Fatihah', totalAyahs: 7, ayahStart: 1, ayahEnd: 10 }])
  assert.strictEqual(agg[0].covered, 10, 'C1 covered count')

  // C2: coverage 1-10 + 20-30 => 21 covered ayahs
  agg = aggregateSurahCoverage([
    { surahId: 1, surahNameLatin: 'Al-Baqarah', totalAyahs: 286, ayahStart: 1, ayahEnd: 10 },
    { surahId: 1, surahNameLatin: 'Al-Baqarah', totalAyahs: 286, ayahStart: 20, ayahEnd: 30 }
  ])
  assert.strictEqual(agg[0].covered, 21, 'C2 covered count')

  // C3: normalized 1-20 => 20 covered ayahs
  agg = aggregateSurahCoverage([{ surahId: 1, surahNameLatin: 'Al-Baqarah', totalAyahs: 286, ayahStart: 1, ayahEnd: 20 }])
  assert.strictEqual(agg[0].covered, 20, 'C3 covered count')

  // C4: gap representation preserves two ranges rather than 1-30
  agg = aggregateSurahCoverage([
    { surahId: 1, surahNameLatin: 'Al-Baqarah', totalAyahs: 286, ayahStart: 1, ayahEnd: 10 },
    { surahId: 1, surahNameLatin: 'Al-Baqarah', totalAyahs: 286, ayahStart: 20, ayahEnd: 30 }
  ])
  assert.strictEqual(agg[0].formattedRanges, '1-10, 20-30', 'C4 gap representation')
  console.log('✅ aggregateSurahCoverage tests passed')
}

if (require.main === module) {
  runTahfizGuruTests().catch(console.error)
}
