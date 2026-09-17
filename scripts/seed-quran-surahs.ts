import { db } from '../lib/db/client'
import { sql } from 'drizzle-orm'
import * as schema from '../drizzle/schema'
import fs from 'fs'
import path from 'path'

// Hardcoded Juz mapping for all 114 Surahs
const juzMapping: Record<number, {start: number, end: number}> = {
  1: {start: 1, end: 1}, 2: {start: 1, end: 3}, 3: {start: 3, end: 4}, 4: {start: 4, end: 6}, 5: {start: 6, end: 7},
  6: {start: 7, end: 8}, 7: {start: 8, end: 9}, 8: {start: 9, end: 10}, 9: {start: 10, end: 11}, 10: {start: 11, end: 11},
  11: {start: 11, end: 12}, 12: {start: 12, end: 13}, 13: {start: 13, end: 13}, 14: {start: 13, end: 13}, 15: {start: 14, end: 14},
  16: {start: 14, end: 14}, 17: {start: 15, end: 15}, 18: {start: 15, end: 16}, 19: {start: 16, end: 16}, 20: {start: 16, end: 16},
  21: {start: 17, end: 17}, 22: {start: 17, end: 17}, 23: {start: 18, end: 18}, 24: {start: 18, end: 18}, 25: {start: 18, end: 19},
  26: {start: 19, end: 19}, 27: {start: 19, end: 20}, 28: {start: 20, end: 20}, 29: {start: 20, end: 21}, 30: {start: 21, end: 21},
  31: {start: 21, end: 21}, 32: {start: 21, end: 21}, 33: {start: 21, end: 22}, 34: {start: 22, end: 22}, 35: {start: 22, end: 22},
  36: {start: 22, end: 23}, 37: {start: 23, end: 23}, 38: {start: 23, end: 23}, 39: {start: 23, end: 24}, 40: {start: 24, end: 24},
  41: {start: 24, end: 25}, 42: {start: 25, end: 25}, 43: {start: 25, end: 25}, 44: {start: 25, end: 25}, 45: {start: 25, end: 25},
  46: {start: 26, end: 26}, 47: {start: 26, end: 26}, 48: {start: 26, end: 26}, 49: {start: 26, end: 26}, 50: {start: 26, end: 26},
  51: {start: 26, end: 27}, 52: {start: 27, end: 27}, 53: {start: 27, end: 27}, 54: {start: 27, end: 27}, 55: {start: 27, end: 27},
  56: {start: 27, end: 27}, 57: {start: 27, end: 27}, 58: {start: 28, end: 28}, 59: {start: 28, end: 28}, 60: {start: 28, end: 28},
  61: {start: 28, end: 28}, 62: {start: 28, end: 28}, 63: {start: 28, end: 28}, 64: {start: 28, end: 28}, 65: {start: 28, end: 28},
  66: {start: 28, end: 28}, 67: {start: 29, end: 29}, 68: {start: 29, end: 29}, 69: {start: 29, end: 29}, 70: {start: 29, end: 29},
  71: {start: 29, end: 29}, 72: {start: 29, end: 29}, 73: {start: 29, end: 29}, 74: {start: 29, end: 29}, 75: {start: 29, end: 29},
  76: {start: 29, end: 29}, 77: {start: 29, end: 29},
}
for (let i = 78; i <= 114; i++) { juzMapping[i] = {start: 30, end: 30} }

async function seedSurahs() {
  console.log('Reading Surahs metadata from canonical local file...')
  
  const dataPath = path.join(process.cwd(), 'scripts', 'data', 'canonical-surahs.json')
  const fileData = fs.readFileSync(dataPath, 'utf-8')
  const json = JSON.parse(fileData)
  
  if (json.code !== 200 || !Array.isArray(json.data)) {
    throw new Error('Invalid canonical source format')
  }

  const surahsData = json.data
  
  if (!Array.isArray(surahsData) || surahsData.length !== 114) {
    throw new Error('Invalid surah data payload')
  }
  
  // Validation pass
  const seenNumbers = new Set<number>()
  for (const s of surahsData) {
    if (s.nomor < 1 || s.nomor > 114) {
      throw new Error(`Invalid surah number: ${s.nomor}`)
    }
    if (seenNumbers.has(s.nomor)) {
      throw new Error(`Duplicate surah number: ${s.nomor}`)
    }
    seenNumbers.add(s.nomor)
    if (!juzMapping[s.nomor]) {
      throw new Error(`Missing juz mapping for surah: ${s.nomor}`)
    }
  }

  if (seenNumbers.size !== 114) {
    throw new Error(`Missing surahs. Found: ${seenNumbers.size}`)
  }

  console.log('Source validation passed (114 Surahs found). Inserting into database...')

  const toInsert = surahsData.map((s: any) => ({
    number: s.nomor,
    nameArabic: s.nama,
    nameLatin: s.namaLatin,
    nameTranslation: s.arti,
    totalAyahs: s.jumlahAyat,
    juzStart: juzMapping[s.nomor].start,
    juzEnd: juzMapping[s.nomor].end,
  }))

  let updatedCount = 0
  let insertedCount = 0

  for (const row of toInsert) {
    // Idempotent upsert by 'number' (which is unique)
    const result = await db.insert(schema.surahs).values(row)
      .onConflictDoUpdate({
        target: schema.surahs.number,
        set: {
          nameArabic: row.nameArabic,
          nameLatin: row.nameLatin,
          nameTranslation: row.nameTranslation,
          totalAyahs: row.totalAyahs,
          juzStart: row.juzStart,
          juzEnd: row.juzEnd,
        },
      })
      .returning({ id: schema.surahs.id })
    
    // We can't strictly distinguish insert/update natively via returning with onConflictDoUpdate easily in postgres without checking xmax,
    // so we just log progress
  }
  
  console.log('Successfully upserted 114 Surahs!')
  
  const allSurahs = await db.select().from(schema.surahs)
  console.log(`Total rows in surahs table: ${allSurahs.length}`)

  if (allSurahs.length !== 114) {
    console.error('Warning: Surah count is not 114!')
  }
}

seedSurahs().then(() => {
  console.log('Seed completed.')
  process.exit(0)
}).catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
