import {
  getTargetRemainingAyahs,
  getFirstUncoveredRange,
  calculateActivity30Days,
  getMurajaahRecency,
  isTargetStalled,
  Target,
  SurahData,
  CoverageRange,
  HafalanRecord
} from '../lib/tahfiz/smart'
import { getBusinessDate } from '../lib/tahfiz/date'

let passCount = 0
let failCount = 0

function assertEq(name: string, actual: any, expected: any) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    console.log(`✅ [PASS] ${name}`)
    passCount++
  } else {
    console.error(`❌ [FAIL] ${name}`)
    console.error(`   Expected: ${JSON.stringify(expected)}`)
    console.error(`   Actual:   ${JSON.stringify(actual)}`)
    failCount++
  }
}

function runTests() {
  console.log('=== SMART TAHFIZ PURE ENGINE TESTS ===\n')

  const dummySurahs: SurahData[] = [
    { id: 1, totalAyahs: 7, number: 1, nameLatin: 'Al-Fatihah' },
    { id: 2, totalAyahs: 286, number: 2, nameLatin: 'Al-Baqarah' }
  ]

  const t1: Target = {
    startSurahId: 2, startAyah: 1, endSurahId: 2, endAyah: 10, createdAt: '2026-10-01'
  }

  assertEq('same-Surah fully uncovered gap', getFirstUncoveredRange(t1, dummySurahs, []), {
    surahId: 2, surahNameLatin: 'Al-Baqarah', ayahStart: 1, ayahEnd: 10
  })

  assertEq('same-Surah partial coverage gap', getFirstUncoveredRange(t1, dummySurahs, [
    { surahId: 2, ayahStart: 1, ayahEnd: 3 }
  ]), {
    surahId: 2, surahNameLatin: 'Al-Baqarah', ayahStart: 4, ayahEnd: 10
  })

  assertEq('multiple separated gaps returns first', getFirstUncoveredRange(t1, dummySurahs, [
    { surahId: 2, ayahStart: 1, ayahEnd: 3 },
    { surahId: 2, ayahStart: 7, ayahEnd: 10 }
  ]), {
    surahId: 2, surahNameLatin: 'Al-Baqarah', ayahStart: 4, ayahEnd: 6
  })

  assertEq('fully covered target returns null', getFirstUncoveredRange(t1, dummySurahs, [
    { surahId: 2, ayahStart: 1, ayahEnd: 10 }
  ]), null)

  assertEq('no active target returns null', getFirstUncoveredRange(null, dummySurahs, []), null)

  const t2: Target = {
    startSurahId: 1, startAyah: 5, endSurahId: 2, endAyah: 5, createdAt: '2026-10-01'
  }

  assertEq('cross-Surah target first gap', getFirstUncoveredRange(t2, dummySurahs, [
    { surahId: 1, ayahStart: 1, ayahEnd: 7 }
  ]), {
    surahId: 2, surahNameLatin: 'Al-Baqarah', ayahStart: 1, ayahEnd: 5
  })

  assertEq('coverage outside target ignored', getFirstUncoveredRange(t1, dummySurahs, [
    { surahId: 1, ayahStart: 1, ayahEnd: 7 }
  ]), {
    surahId: 2, surahNameLatin: 'Al-Baqarah', ayahStart: 1, ayahEnd: 10
  })

  const records: HafalanRecord[] = [
    { id: 1, surahId: 2, sessionDate: '2026-10-02', ayahStart: 1, ayahEnd: 5, type: 'hafalan_baru' },
    { id: 2, surahId: 2, sessionDate: '2026-10-01', ayahStart: 1, ayahEnd: 3, type: 'muraja_ah' },
    { id: 3, surahId: 2, sessionDate: '2026-09-01', ayahStart: 1, ayahEnd: 3, type: 'muraja_ah' }
  ]

  const act30 = calculateActivity30Days(records, '2026-10-03')
  assertEq('30-day activity counts', act30, { hafalanBaru: 1, murajaah: 1 })

  const recency = getMurajaahRecency(t1, records, '2026-10-03')
  assertEq('Murajaah recency', recency, { daysSinceLast: 2, status: 'HAS_MURAJAAH' })

  assertEq('No Murajaah record', getMurajaahRecency(t1, [records[0]], '2026-10-03'), { daysSinceLast: null, status: 'NO_MURAJAAH_RECORD' })

  assertEq('stalled at 13 days', isTargetStalled(t1, [{ id: 1, surahId: 2, sessionDate: '2026-09-20', ayahStart: 1, ayahEnd: 5, type: 'hafalan_baru' }], '2026-10-03'), false)
  assertEq('stalled at 14 days', isTargetStalled(t1, [{ id: 1, surahId: 2, sessionDate: '2026-09-19', ayahStart: 1, ayahEnd: 5, type: 'hafalan_baru' }], '2026-10-03'), true)
  assertEq('recent target activity = not stalled', isTargetStalled(t1, [{ id: 1, surahId: 2, sessionDate: '2026-10-02', ayahStart: 1, ayahEnd: 5, type: 'hafalan_baru' }], '2026-10-03'), false)
  
  assertEq('Remaining ayahs calc', getTargetRemainingAyahs(t1, dummySurahs, [{ surahId: 2, ayahStart: 1, ayahEnd: 3 }]), 7)

  // 15. UTC to Asia/Jakarta rollover test
  const instant = new Date('2026-10-03T17:30:00Z') // UTC 17:30 is 00:30 next day in Jakarta (+07:00)
  const businessDate = getBusinessDate(instant)
  assertEq('UTC to Asia/Jakarta rollover', businessDate, '2026-10-04')

  // 16. Exact 30-day window count
  const actRecords = [
    { id: 1, type: 'hafalan_baru', sessionDate: '2026-10-30', surahId: 1, ayahStart: 1, ayahEnd: 2 }, // included
    { id: 2, type: 'hafalan_baru', sessionDate: '2026-10-01', surahId: 1, ayahStart: 1, ayahEnd: 2 }, // included
    { id: 3, type: 'hafalan_baru', sessionDate: '2026-09-30', surahId: 1, ayahStart: 1, ayahEnd: 2 }  // excluded
  ]
  const exactAct30 = calculateActivity30Days(actRecords as any, '2026-10-30')
  assertEq('30-day activity counts exactly', exactAct30.hafalanBaru, 2)

  // 17. Pure input immutability
  const t: Target = { startSurahId: 1, startAyah: 1, endSurahId: 1, endAyah: 10, createdAt: '2026-10-01' }
  const s: SurahData[] = [{ id: 1, totalAyahs: 10, number: 1, nameLatin: 'Al-Fatihah' }]
  const c: CoverageRange[] = [{ surahId: 1, ayahStart: 1, ayahEnd: 5 }]
  const r: HafalanRecord[] = [{ id: 1, type: 'hafalan_baru', sessionDate: '2026-10-02', surahId: 1, ayahStart: 1, ayahEnd: 5 }]
  
  const tStr = JSON.stringify(t)
  const sStr = JSON.stringify(s)
  const cStr = JSON.stringify(c)
  const rStr = JSON.stringify(r)

  getTargetRemainingAyahs(t, s, c)
  getFirstUncoveredRange(t, s, c)
  calculateActivity30Days(r, '2026-10-05')
  getMurajaahRecency(t, r, '2026-10-05')
  isTargetStalled(t, r, '2026-10-05')

  let passed = true
  if (JSON.stringify(t) !== tStr) passed = false
  if (JSON.stringify(s) !== sStr) passed = false
  if (JSON.stringify(c) !== cStr) passed = false
  if (JSON.stringify(r) !== rStr) passed = false

  assertEq('pure engine input immutability', passed, true)

  console.log(`\nResults: ${passCount} PASS, ${failCount} FAIL`)
  if (failCount > 0) {
    process.exit(1)
  }
}

runTests()
