import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { db, sql } from '@/lib/db/client'
import { assertNotSelfAssessment } from '@/lib/identity/self-assessment'

async function runTests() {
  console.log('--- TEST MULTI-CONTEXT-IDENTITY-001 PHASE B ---')

  const TEST_EMAIL_GURU = 'test.identity.guru@example.com'
  const TEST_EMAIL_OTHER_GURU = 'test.identity.otherguru@example.com'
  
  try {
    // Cleanup past
    await sql`DELETE FROM students WHERE full_name LIKE 'TestIdentityStudent%'`
    await sql`DELETE FROM users WHERE email IN (${TEST_EMAIL_GURU}, ${TEST_EMAIL_OTHER_GURU})`

    const [guru] = await sql`
      INSERT INTO users (full_name, email, password_hash, role, is_active)
      VALUES ('Guru Identity', ${TEST_EMAIL_GURU}, 'hash', 'guru', TRUE)
      RETURNING id
    `

    const [otherGuru] = await sql`
      INSERT INTO users (full_name, email, password_hash, role, is_active)
      VALUES ('Other Guru', ${TEST_EMAIL_OTHER_GURU}, 'hash', 'guru', TRUE)
      RETURNING id
    `

    const [studentSelf] = await sql`
      INSERT INTO students (full_name, gender, date_of_birth, enrollment_date, user_id)
      VALUES ('TestIdentityStudentSelf', 'L', '2015-01-01', '2026-01-01', ${guru.id})
      RETURNING id
    `

    const [studentOther] = await sql`
      INSERT INTO students (full_name, gender, date_of_birth, enrollment_date, user_id)
      VALUES ('TestIdentityStudentOther', 'L', '2015-01-01', '2026-01-01', null)
      RETURNING id
    `

    // Test: Guru assesses their own student profile -> DENIED
    console.log('Testing Self-Assessment...')
    let denied = false
    try {
      await assertNotSelfAssessment({ actorUserId: guru.id, targetStudentId: studentSelf.id })
    } catch (e: any) {
      if (e.status === 403 || e.statusCode === 403) denied = true
      else throw e
    }
    if (!denied) throw new Error('Self-assessment was NOT denied.')
    console.log('✅ Self-assessment DENIED as expected')

    // Test: Guru assesses another student profile -> PASS
    console.log('Testing Other-Assessment...')
    await assertNotSelfAssessment({ actorUserId: guru.id, targetStudentId: studentOther.id })
    console.log('✅ Other-assessment PASSED as expected')

    // Test: Other guru assesses guru's student profile -> PASS
    console.log('Testing Third-Party Assessment...')
    await assertNotSelfAssessment({ actorUserId: otherGuru.id, targetStudentId: studentSelf.id })
    console.log('✅ Third-party assessment PASSED as expected')
    
  } finally {
    await sql`DELETE FROM students WHERE full_name LIKE 'TestIdentityStudent%'`
    await sql`DELETE FROM users WHERE email IN (${TEST_EMAIL_GURU}, ${TEST_EMAIL_OTHER_GURU})`
  }
}

runTests().catch(e => {
  console.error(e)
  process.exit(1)
})
