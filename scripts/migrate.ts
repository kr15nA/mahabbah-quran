import { neon, neonConfig } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { migrate } from 'drizzle-orm/neon-http/migrator'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

neonConfig.fetchConnectionCache = true

async function runMigrate() {
  console.log('--- RUNNING DRIZZLE MIGRATIONS ---')
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set')
    process.exit(1)
  }

  const sql = neon(process.env.DATABASE_URL)
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
