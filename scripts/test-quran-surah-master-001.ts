import { db, sql } from '../lib/db/client'
import * as schema from '../drizzle/schema'
import { validateSurahAyahRange } from '../lib/quran/validators'
import { getSurahById } from '../lib/db/queries/surahs'

async function runTests() {
  console.log('Running Quran Surah Master Tests...')

  const allSurahs = await db.select().from(schema.surahs)
  
  // 1. Exactly 114 Surahs
  if (allSurahs.length !== 114) throw new Error(`Expected 114 Surahs, found ${allSurahs.length}`)
  console.log('✅ Exactly 114 Surahs found.')

  // 2. Every integer 1..114 exists once & no duplicate number
  const numbers = allSurahs.map(s => s.number).sort((a, b) => a - b)
  for (let i = 1; i <= 114; i++) {
    if (numbers[i - 1] !== i) throw new Error(`Missing or duplicate surah number at ${i}. Found: ${numbers[i - 1]}`)
  }
  console.log('✅ All Surah numbers 1..114 exist and are unique.')

  // 3. Specific Surah ayah counts and Juz spans
  const fatihah = allSurahs.find(s => s.number === 1)
  const baqarah = allSurahs.find(s => s.number === 2)
  const aliImran = allSurahs.find(s => s.number === 3)
  const nisa = allSurahs.find(s => s.number === 4)
  const kahf = allSurahs.find(s => s.number === 18)
  const yasin = allSurahs.find(s => s.number === 36)
  const mulk = allSurahs.find(s => s.number === 67)
  const naba = allSurahs.find(s => s.number === 78)
  const ikhlas = allSurahs.find(s => s.number === 112)
  const nas = allSurahs.find(s => s.number === 114)

  if (fatihah?.totalAyahs !== 7) throw new Error(`Al-Fatihah should have 7 ayahs, got ${fatihah?.totalAyahs}`)
  if (baqarah?.totalAyahs !== 286) throw new Error(`Al-Baqarah should have 286 ayahs, got ${baqarah?.totalAyahs}`)
  if (ikhlas?.totalAyahs !== 4) throw new Error(`Al-Ikhlas should have 4 ayahs, got ${ikhlas?.totalAyahs}`)
  if (nas?.totalAyahs !== 6) throw new Error(`An-Nas should have 6 ayahs, got ${nas?.totalAyahs}`)

  // Juz boundary checks
  if (baqarah?.juzStart !== 1 || baqarah?.juzEnd !== 3) throw new Error('Al-Baqarah Juz span mismatch')
  if (aliImran?.juzStart !== 3 || aliImran?.juzEnd !== 4) throw new Error('Ali Imran Juz span mismatch')
  if (nisa?.juzStart !== 4 || nisa?.juzEnd !== 6) throw new Error('An-Nisa Juz span mismatch')
  if (kahf?.juzStart !== 15 || kahf?.juzEnd !== 16) throw new Error('Al-Kahf Juz span mismatch')
  if (yasin?.juzStart !== 22 || yasin?.juzEnd !== 23) throw new Error('Ya-Sin Juz span mismatch')
  if (mulk?.juzStart !== 29 || mulk?.juzEnd !== 29) throw new Error('Al-Mulk Juz span mismatch')
  if (naba?.juzStart !== 30 || naba?.juzEnd !== 30) throw new Error('An-Naba Juz span mismatch')

  console.log('✅ Specific Surah ayah counts and Juz spans validated.')

  // Validation function tests
  console.log('Testing validateSurahAyahRange function...')
  const dummyBaqarah = {
    id: baqarah!.id,
    number: baqarah!.number,
    name_arabic: baqarah!.nameArabic,
    name_latin: baqarah!.nameLatin,
    name_translation: baqarah!.nameTranslation,
    total_ayahs: baqarah!.totalAyahs,
    juz_start: baqarah!.juzStart,
    juz_end: baqarah!.juzEnd,
  }

  // nonexistent Surah rejected
  if (validateSurahAyahRange(null, 1, 5) === null) throw new Error('Failed: nonexistent Surah should be rejected')
  
  // ayah 0 rejected
  if (validateSurahAyahRange(dummyBaqarah, 0, 5) === null) throw new Error('Failed: ayah 0 should be rejected')
  
  // negative ayah rejected
  if (validateSurahAyahRange(dummyBaqarah, -1, 5) === null) throw new Error('Failed: negative ayah should be rejected')
  
  // endAyah < startAyah rejected
  if (validateSurahAyahRange(dummyBaqarah, 10, 5) === null) throw new Error('Failed: endAyah < startAyah should be rejected')
  
  // endAyah > totalAyahs rejected
  if (validateSurahAyahRange(dummyBaqarah, 1, 287) === null) throw new Error('Failed: endAyah > totalAyahs should be rejected')
  
  // valid boundary accepted
  if (validateSurahAyahRange(dummyBaqarah, 1, 10) !== null) throw new Error('Failed: valid boundary should be accepted')
  
  // last valid ayah accepted
  if (validateSurahAyahRange(dummyBaqarah, 286, 286) !== null) throw new Error('Failed: last valid ayah should be accepted')

  console.log('✅ All validation rules passed.')

  // Check historical hafalan records
  const hafalanRecords = await db.select().from(schema.hafalanRecords)
  console.log(`✅ Existing Hafalan records: ${hafalanRecords.length} (must be preserved)`)

  const orphanHafalan = hafalanRecords.filter(h => !allSurahs.find(s => s.id === h.surahId))
  if (orphanHafalan.length !== 0) throw new Error(`Found ${orphanHafalan.length} orphan hafalan records!`)
  console.log('✅ Orphan Hafalan records: 0')

  console.log('ALL TESTS PASSED!')
  process.exit(0)
}

runTests().catch(e => {
  console.error(e)
  process.exit(1)
})
