import { db } from '../lib/db/client'
import { students, enrollments, academicYears } from '../drizzle/schema'
import { eq, isNull } from 'drizzle-orm'
import assert from 'assert'

async function migrate() {
  console.log('--- SYSTEM-FOUNDATION-002: Enrollments Migration ---')

  // 1. Identify active academic year
  const [activeYear] = await db.select()
    .from(academicYears)
    .where(eq(academicYears.isActive, true))
    .limit(1)

  if (!activeYear) {
    console.error('❌ MIGRATION FAILED: No active academic year found.')
    console.error('Please activate an academic year before running this migration.')
    process.exit(1)
  }

  console.log(`✅ Found active academic year: ${activeYear.name} (ID: ${activeYear.id})`)

  // 2. Snapshot current students
  const currentStudents = await db.select({
    id: students.id,
    classId: students.classId
  }).from(students).where(isNull(students.deletedAt))

  console.log(`Snapshot: Found ${currentStudents.length} active students.`)

  const classMapBefore = new Map(currentStudents.map(s => [s.id, s.classId]))

  // 3. Perform Migration
  let createdCount = 0
  let skippedCount = 0

  for (const student of currentStudents) {
    // Check if already enrolled
    const [existing] = await db.select({ id: enrollments.id })
      .from(enrollments)
      .where(
        eq(enrollments.studentId, student.id)
      )
      .limit(1) // we check across any year to avoid duplicate backfills if already done

    if (existing) {
      skippedCount++
      continue
    }

    // Create enrollment
    await db.insert(enrollments).values({
      studentId: student.id,
      academicYearId: activeYear.id,
      classId: student.classId,
      enrollmentDate: new Date().toISOString().split('T')[0]
    })
    createdCount++
  }

  console.log(`Migration Complete: Created ${createdCount} enrollments. Skipped ${skippedCount} already enrolled.`)

  // 4. Verify after migration
  const afterStudents = await db.select({
    id: students.id,
    classId: students.classId
  }).from(students).where(isNull(students.deletedAt))

  assert.strictEqual(afterStudents.length, currentStudents.length, 'Student count changed!')

  for (const student of afterStudents) {
    const beforeClassId = classMapBefore.get(student.id)
    assert.strictEqual(student.classId, beforeClassId, `Class ID changed for student ${student.id}!`)

    // Verify enrollment exists and is unique for this year
    const studentEnrollments = await db.select()
      .from(enrollments)
      .where(eq(enrollments.studentId, student.id))
    
    assert.strictEqual(studentEnrollments.length, 1, `Student ${student.id} should have exactly 1 enrollment`)
    assert.strictEqual(studentEnrollments[0].classId, student.classId, `Enrollment classId mismatch for student ${student.id}`)
    assert.strictEqual(studentEnrollments[0].academicYearId, activeYear.id, `Enrollment year mismatch for student ${student.id}`)
  }

  console.log('✅ VERIFICATION PASSED: No data mutated. Legacy class_id preserved. Enrollments seeded safely.')
}

migrate().catch(e => {
  console.error('\n❌ Migration failed:', e)
  process.exit(1)
})
