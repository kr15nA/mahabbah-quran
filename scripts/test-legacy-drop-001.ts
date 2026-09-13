import { sql } from '@/lib/db/client'
import assert from 'assert'

async function runTests() {
  console.log('--- STARTING LEGACY-DROP-001 TESTS ---')

  // 1. students table physically has no class_id column.
  try {
    await sql`SELECT class_id FROM students LIMIT 1`
    throw new Error('class_id still exists on students')
  } catch (e: any) {
    assert(e.message.includes('does not exist'), 'Expected column class_id does not exist error')
    console.log('Test 1: students.class_id physically removed')
  }

  // 2. classes table physically has no teacher_id column.
  try {
    await sql`SELECT teacher_id FROM classes LIMIT 1`
    throw new Error('teacher_id still exists on classes')
  } catch (e: any) {
    assert(e.message.includes('does not exist'), 'Expected column teacher_id does not exist error')
    console.log('Test 2: classes.teacher_id physically removed')
  }

  // Check historical fields are unaffected
  await sql`SELECT class_id, teacher_id FROM attendance LIMIT 1`
  console.log('Test 22: Historical attendance fields exist')

  await sql`SELECT class_id, teacher_id FROM learning_reports LIMIT 1`
  console.log('Test 23: Historical learning_reports fields exist')

  console.log('--- ALL LEGACY-DROP-001 DB TESTS PASSED ---')
  process.exit(0)
}

runTests().catch(e => {
  console.error(e)
  process.exit(1)
})
