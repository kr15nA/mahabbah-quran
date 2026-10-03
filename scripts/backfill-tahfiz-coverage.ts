import { txDb as db } from '../lib/db/tx'
import { hafalanRecords, tahfizSurahCoverage } from '../drizzle/schema'
import { assertSafeMutatingDbTestEnvironment } from './lib/assert-safe-mutating-db-test'
import { normalizeCoverageRanges } from '../lib/tahfiz/normalize'
import { sql } from 'drizzle-orm'

async function runBackfill() {
  assertSafeMutatingDbTestEnvironment()
  
  console.log('Starting Tahfiz Foundation Coverage Backfill...')
  
  // Clean projection entirely (idempotency)
  await db.execute(sql`TRUNCATE TABLE tahfiz_surah_coverage`)

  const records = await db.select().from(hafalanRecords)
  const grouped = new Map<string, { start: number; end: number }[]>()
  
  for (const r of records) {
    const key = `${r.studentId}-${r.surahId}`
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)!.push({ start: r.ayahStart, end: r.ayahEnd })
  }
  
  let insertedRows = 0

  await db.transaction(async (tx) => {
    for (const [key, ranges] of grouped.entries()) {
      const [studentIdStr, surahIdStr] = key.split('-')
      const studentId = parseInt(studentIdStr, 10)
      const surahId = parseInt(surahIdStr, 10)

      const normalized = normalizeCoverageRanges(ranges.map(r => ({ ayahStart: r.start, ayahEnd: r.end })))
      
      if (normalized.length > 0) {
        const inserts = normalized.map(r => ({
          studentId,
          surahId,
          ayahStart: r.ayahStart,
          ayahEnd: r.ayahEnd,
        }))
        await tx.insert(tahfizSurahCoverage).values(inserts)
        insertedRows += inserts.length
      }
    }
  })

  console.log(`Backfill completed. Processed ${records.length} records into ${insertedRows} normalized coverage ranges across ${grouped.size} groups.`)
}

runBackfill().catch(console.error).then(() => process.exit(0))
