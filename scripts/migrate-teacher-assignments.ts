import { db } from '../lib/db/client'
import { classes, teacherAssignments, academicYears, users } from '../drizzle/schema'
import { eq, inArray, and } from 'drizzle-orm'
import assert from 'assert'

async function migrate() {
  console.log('--- SYSTEM-FOUNDATION-003: Teacher Assignments Migration ---')

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

  // 2. Snapshot current classes
  const currentClasses = await db.select({
    id: classes.id,
    teacherId: classes.teacherId
  }).from(classes).where(eq(classes.isActive, true))

  console.log(`Snapshot: Found ${currentClasses.length} active classes.`)

  const classMapBefore = new Map(currentClasses.map(c => [c.id, c.teacherId]))

  // 3. Fetch teachers to validate
  const teacherIds = Array.from(new Set(currentClasses.map(c => c.teacherId)))
  const validTeachers = await db.select({
    id: users.id,
    role: users.role,
    isActive: users.isActive
  }).from(users).where(inArray(users.id, teacherIds))

  const validTeacherIds = new Set(
    validTeachers
      .filter(t => t.role === 'guru' && t.isActive)
      .map(t => t.id)
  )

  // 4. Perform Migration
  let createdCount = 0
  let skippedCount = 0

  for (const cls of currentClasses) {
    if (!validTeacherIds.has(cls.teacherId)) {
      console.log(`⚠️ Skipping class ${cls.id}: Teacher ${cls.teacherId} is not a valid active guru.`)
      skippedCount++
      continue
    }

    // Check if already assigned FOR THIS SPECIFIC ACTIVE YEAR (F-003 fix)
    // Previously this checked any year — now scoped to activeYear.id so a historical
    // assignment for a different year does not prevent creating the active-year row.
    const [existing] = await db.select({ id: teacherAssignments.id })
      .from(teacherAssignments)
      .where(
        and(
          eq(teacherAssignments.classId, cls.id),
          eq(teacherAssignments.academicYearId, activeYear.id)
        )
      )
      .limit(1)

    if (existing) {
      skippedCount++
      continue
    }

    // Create assignment
    await db.insert(teacherAssignments).values({
      classId: cls.id,
      academicYearId: activeYear.id,
      teacherId: cls.teacherId,
    })
    createdCount++
  }

  console.log(`Migration Complete: Created ${createdCount} teacher assignments. Skipped ${skippedCount}.`)

  // 5. Verify after migration
  const afterClasses = await db.select({
    id: classes.id,
    teacherId: classes.teacherId
  }).from(classes).where(eq(classes.isActive, true))

  assert.strictEqual(afterClasses.length, currentClasses.length, 'Class count changed!')

  for (const cls of afterClasses) {
    const beforeTeacherId = classMapBefore.get(cls.id)
    assert.strictEqual(cls.teacherId, beforeTeacherId, `Teacher ID changed for class ${cls.id}!`)

    if (validTeacherIds.has(cls.teacherId)) {
      // Verify assignment exists and is unique for this year
      const classAssignments = await db.select()
        .from(teacherAssignments)
        .where(eq(teacherAssignments.classId, cls.id))
      
      assert.strictEqual(classAssignments.length, 1, `Class ${cls.id} should have exactly 1 assignment`)
      assert.strictEqual(classAssignments[0].teacherId, cls.teacherId, `Assignment teacherId mismatch for class ${cls.id}`)
      assert.strictEqual(classAssignments[0].academicYearId, activeYear.id, `Assignment year mismatch for class ${cls.id}`)
    }
  }

  console.log('✅ VERIFICATION PASSED: No data mutated. Legacy teacher_id preserved. Assignments seeded safely.')
}

migrate().catch(e => {
  console.error('\n❌ Migration failed:', e)
  process.exit(1)
})
