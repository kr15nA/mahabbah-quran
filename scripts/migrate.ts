import { neon, neonConfig } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { migrate } from 'drizzle-orm/neon-http/migrator'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

import { getDatabaseUrl } from '../lib/config/env'

neonConfig.fetchConnectionCache = true

async function runMigrate() {
  console.log('--- RUNNING DRIZZLE MIGRATIONS ---')
  const dbUrl = getDatabaseUrl()
  const sql = neon(dbUrl)
  const db = drizzle(sql)

  try {
    await migrate(db, { migrationsFolder: 'drizzle/migrations' })
    console.log('✅ Migrations applied successfully.')
    process.exit(0)
  } catch (err) {
    console.error('❌ Migration failed:', err)
    process.exit(1)
  }
}

runMigrate()
