import { sql } from '@/lib/db/client'
import { db } from '@/lib/db/client'
import { students } from '@/drizzle/schema'
import { isNotNull } from 'drizzle-orm'
import { sql as drizzleSql } from 'drizzle-orm'

async function checkDuplicates() {
  const result = await db
    .select({
      userId: students.userId,
      count: drizzleSql<number>`count(*)`.as('count'),
    })
    .from(students)
    .where(isNotNull(students.userId))
    .groupBy(students.userId)
    .having(drizzleSql`count(*) > 1`)
  
  const allNotNull = await db.select({ id: students.id }).from(students).where(isNotNull(students.userId))
  
  console.log('Duplicates:', result.length)
  console.log('Non-null user_id count:', allNotNull.length)
  process.exit(0)
}

checkDuplicates().catch(console.error)
