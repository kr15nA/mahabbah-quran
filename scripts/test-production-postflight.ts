import { db } from '../lib/db/client'
import { studentParents, students, users } from '../drizzle/schema'
import { sql, eq, isNull, and } from 'drizzle-orm'

async function run() {
  const rowCount = await db.select({ count: sql<number>`count(*)` }).from(studentParents)
  console.log('Row count:', rowCount[0].count)

  const distribution = await db.select({
    relationship: studentParents.relationship,
    count: sql<number>`count(*)`
  }).from(studentParents).groupBy(studentParents.relationship)
  console.log('Distribution:', distribution)

  const canViewAcademic = await db.select({ count: sql<number>`count(*)` }).from(studentParents).where(eq(studentParents.canViewAcademic, true))
  console.log('canViewAcademic:', canViewAcademic[0].count)

  const canViewFinance = await db.select({ count: sql<number>`count(*)` }).from(studentParents).where(eq(studentParents.canViewFinance, true))
  console.log('canViewFinance:', canViewFinance[0].count)

  const canReceiveNotification = await db.select({ count: sql<number>`count(*)` }).from(studentParents).where(eq(studentParents.canReceiveNotification, true))
  console.log('canReceiveNotification:', canReceiveNotification[0].count)

  const canManageLearning = await db.select({ count: sql<number>`count(*)` }).from(studentParents).where(eq(studentParents.canManageLearning, true))
  console.log('canManageLearning:', canManageLearning[0].count)

  const isActive = await db.select({ count: sql<number>`count(*)` }).from(studentParents).where(eq(studentParents.isActive, true))
  console.log('isActive:', isActive[0].count)

  const inactive = await db.select({ count: sql<number>`count(*)` }).from(studentParents).where(eq(studentParents.isActive, false))
  console.log('inactive:', inactive[0].count)

  const softDeleted = await db.select({ count: sql<number>`count(*)` }).from(studentParents).where(sql`${studentParents.deletedAt} IS NOT NULL`)
  console.log('softDeleted:', softDeleted[0].count)

  const activePairDuplicates = await db.select({
    studentId: studentParents.studentId,
    parentId: studentParents.parentId,
    count: sql<number>`count(*)`
  }).from(studentParents).where(and(eq(studentParents.isActive, true), isNull(studentParents.deletedAt))).groupBy(studentParents.studentId, studentParents.parentId).having(sql`count(*) > 1`)
  console.log('activePairDuplicates:', activePairDuplicates)

  const activePrimaryConflicts = await db.select({
    studentId: studentParents.studentId,
    count: sql<number>`count(*)`
  }).from(studentParents).where(and(eq(studentParents.isPrimary, true), eq(studentParents.isActive, true), isNull(studentParents.deletedAt))).groupBy(studentParents.studentId).having(sql`count(*) > 1`)
  console.log('activePrimaryConflicts:', activePrimaryConflicts)

  const orphans = await db.select({ count: sql<number>`count(*)` })
    .from(studentParents)
    .leftJoin(students, sql`${students.id} = ${studentParents.studentId}`)
    .leftJoin(users, sql`${users.id} = ${studentParents.parentId}`)
    .where(sql`${students.id} IS NULL OR ${users.id} IS NULL`)
  console.log('Orphans:', orphans[0].count)

  process.exit(0)
}
run()
