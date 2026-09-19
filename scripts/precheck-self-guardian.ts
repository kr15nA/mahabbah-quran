import { db } from '@/lib/db/client'
import { students, studentParents } from '@/drizzle/schema'
import { eq, and, isNull } from 'drizzle-orm'

async function runPrecheck() {
  console.log('Running precheck for existing active self-guardian relationships...')
  
  const results = await db
    .select({
      studentId: students.id,
      parentId: studentParents.parentId
    })
    .from(students)
    .innerJoin(studentParents, eq(students.id, studentParents.studentId))
    .where(
      and(
        eq(students.userId, studentParents.parentId),
        eq(studentParents.isActive, true),
        isNull(studentParents.deletedAt)
      )
    )

  console.log(`existing active self-guardian relationships: ${results.length}`)
  if (results.length > 0) {
    console.log(results)
  }
  process.exit(0)
}

runPrecheck().catch(console.error)
