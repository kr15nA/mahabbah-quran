import { db } from '../lib/db/client'
import { sql } from 'drizzle-orm'

async function main() {
  console.log('Checking constraints...')
  const constCheck = await db.execute(sql`
    SELECT conname, pg_get_constraintdef(oid) 
    FROM pg_constraint 
    WHERE conrelid = 'tasmi_sessions'::regclass
  `)
  console.log(constCheck.rows)
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); })
