import { db } from '../lib/db/client'
import { studentParents, students, users } from '../drizzle/schema'
import { sql } from 'drizzle-orm'

async function run() {
  const rowCount = await db.select({ count: sql<number>`count(*)` }).from(studentParents)
  console.log('Row count:', rowCount[0].count)

  const distribution = await db.select({
    relationship: studentParents.relationship,
    count: sql<number>`count(*)`
  }).from(studentParents).groupBy(studentParents.relationship)
  console.log('Distribution:', distribution)

  const duplicates = await db.select({
    studentId: studentParents.studentId,
    parentId: studentParents.parentId,
    count: sql<number>`count(*)`
  }).from(studentParents).groupBy(studentParents.studentId, studentParents.parentId).having(sql`count(*) > 1`)
  console.log('Duplicates:', duplicates)

  const orphans = await db.select({ count: sql<number>`count(*)` })
    .from(studentParents)
    .leftJoin(students, sql`${students.id} = ${studentParents.studentId}`)
    .leftJoin(users, sql`${users.id} = ${studentParents.parentId}`)
    .where(sql`${students.id} IS NULL OR ${users.id} IS NULL`)
  console.log('Orphans:', orphans[0].count)

  const primaryConflicts = await db.select({
    studentId: studentParents.studentId,
    count: sql<number>`count(*)`
  }).from(studentParents).where(sql`${studentParents.isPrimary} = true`).groupBy(studentParents.studentId).having(sql`count(*) > 1`)
  console.log('Primary conflicts:', primaryConflicts)

  process.exit(0)
}
run()
