import { db } from '../lib/db/client'
import * as schema from '../drizzle/schema'
import { eq, notInArray } from 'drizzle-orm'

async function check() {
  const allSurahs = await db.select().from(schema.surahs)
  console.log(`Current production Surah count: ${allSurahs.length}`)

  const seen = new Set()
  let dups = 0
  for (const s of allSurahs) {
    if (seen.has(s.number)) dups++
    seen.add(s.number)
  }
  console.log(`Duplicate Surah numbers: ${dups}`)

  const allHafalan = await db.select().from(schema.hafalanRecords)
  console.log(`Historical Hafalan count: ${allHafalan.length}`)

  const validSurahIds = allSurahs.map(s => s.id)
  let orphanCount = 0
  if (validSurahIds.length > 0) {
    const orphans = await db.select().from(schema.hafalanRecords).where(notInArray(schema.hafalanRecords.surahId, validSurahIds))
    orphanCount = orphans.length
  } else {
    orphanCount = allHafalan.length
  }
  console.log(`Orphan Hafalan references: ${orphanCount}`)
}

check().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
