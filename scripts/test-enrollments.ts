import { SignJWT } from 'jose'
import { db } from '../lib/db/client'
import { enrollments, academicYears, students } from '../drizzle/schema'
import { eq, like } from 'drizzle-orm'
import assert from 'assert'

const HOST = 'http://localhost:3000'

async function generateToken(payload: any) {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET missing')
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(secret))
}

async function runTests() {
  console.log('Running SYSTEM-FOUNDATION-002 Tests...')

  const adminCookie = `mq_session=${await generateToken({ userId: 1, role: 'admin', fullName: 'Admin' })}`
  
  // Need to find real users for testing
  // Guru usually ID 2 or 3. Parent usually ID 4 or 5. Let's find one that's linked.
  const guruCookie = `mq_session=${await generateToken({ userId: 2, role: 'guru', fullName: 'Guru' })}`
  const parentCookie = `mq_session=${await generateToken({ userId: 5, role: 'orang_tua', fullName: 'Parent' })}`
  // From earlier tasks, student 1 is linked to parent 5 and taught by guru 2

  let testYearId: number | undefined
  let activeYearId: number | undefined

  try {
    // 0. Setup a test academic year (inactive) and find the active one
    const [active] = await db.select().from(academicYears).where(eq(academicYears.isActive, true)).limit(1)
    activeYearId = active.id

    const [testYear] = await db.insert(academicYears).values({
      name: 'TEST_YEAR_ENROLL',
      startDate: '2020-01-01',
      endDate: '2020-12-31',
      isActive: false
    }).returning()
    testYearId = testYear.id

    const studentId = 1
    const classId = 1
    const otherClassId = 2

    // 1. Auth & Admin Creation
    console.log('\n--- CREATION & AUTH TESTS ---')
    const unauthRes = await fetch(`${HOST}/api/enrollments`, { method: 'POST', body: JSON.stringify({ studentId, academicYearId: testYearId, classId }) })
    assert.strictEqual(unauthRes.status, 401, 'Unauthenticated denied')

    const parentRes = await fetch(`${HOST}/api/enrollments`, { method: 'POST', headers: { cookie: parentCookie }, body: JSON.stringify({ studentId, academicYearId: testYearId, classId }) })
    assert.strictEqual(parentRes.status, 403, 'Parent denied')

    const guruRes = await fetch(`${HOST}/api/enrollments`, { method: 'POST', headers: { cookie: guruCookie }, body: JSON.stringify({ studentId, academicYearId: testYearId, classId }) })
    assert.strictEqual(guruRes.status, 403, 'Guru denied')

    const adminRes = await fetch(`${HOST}/api/enrollments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: adminCookie },
      body: JSON.stringify({ studentId, academicYearId: testYearId, classId })
    })
    assert.strictEqual(adminRes.status, 201, 'Admin can create enrollment')
    console.log('✅ Creation and Auth verified')

    // 2. Duplicate Prevention
    console.log('\n--- DUPLICATE TESTS ---')
    const dupRes = await fetch(`${HOST}/api/enrollments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: adminCookie },
      body: JSON.stringify({ studentId, academicYearId: testYearId, classId })
    })
    // It should UPSERT and return 201 now (updating the class)
    assert.strictEqual(dupRes.status, 201, 'Upsert handles same class')
    console.log('✅ Duplicate/Upsert handled')

    // 3. Invalid IDs
    console.log('\n--- INVALID ID TESTS ---')
    const invalidRes = await fetch(`${HOST}/api/enrollments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: adminCookie },
      body: JSON.stringify({ studentId: 9999, academicYearId: testYearId, classId })
    })
    assert.strictEqual(invalidRes.status, 404, 'Invalid student rejected')
    console.log('✅ Invalid student rejected')

    // 4. Same-year Class Change & Active Year Sync
    console.log('\n--- CLASS CHANGE TESTS ---')
    // Get current classId
    const [currentStudent] = await db.select().from(students).where(eq(students.id, studentId)).limit(1)
    const originalClassId = currentStudent.classId

    // Move in inactive year
    await fetch(`${HOST}/api/enrollments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: adminCookie },
      body: JSON.stringify({ studentId, academicYearId: testYearId, classId: otherClassId })
    })

    const [checkStudent1] = await db.select().from(students).where(eq(students.id, studentId)).limit(1)
    assert.strictEqual(checkStudent1.classId, originalClassId, 'Inactive year class change MUST NOT update students.class_id')

    // Move in active year
    await fetch(`${HOST}/api/enrollments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: adminCookie },
      body: JSON.stringify({ studentId, academicYearId: activeYearId, classId: otherClassId })
    })

    const [checkStudent2] = await db.select().from(students).where(eq(students.id, studentId)).limit(1)
    assert.strictEqual(checkStudent2.classId, otherClassId, 'Active year class change MUST update students.class_id')

    // Restore original class for active year
    await fetch(`${HOST}/api/enrollments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: adminCookie },
      body: JSON.stringify({ studentId, academicYearId: activeYearId, classId: originalClassId })
    })

    console.log('✅ Class change logic & legacy sync verified')

    // 5. History Reading & RBAC
    console.log('\n--- HISTORY RBAC TESTS ---')
    // Admin
    const histAdmin = await fetch(`${HOST}/api/students/${studentId}/enrollments`, { headers: { cookie: adminCookie } })
    assert.strictEqual(histAdmin.status, 200, 'Admin can read history')
    const histData = await histAdmin.json()
    assert.ok(histData.length >= 2, 'History shows multiple years')

    // Parent
    const histParent = await fetch(`${HOST}/api/students/${studentId}/enrollments`, { headers: { cookie: parentCookie } })
    assert.strictEqual(histParent.status, 200, 'Parent can read own child history')

    // Parent wrong child (assuming child 10 is not theirs)
    const histParentWrong = await fetch(`${HOST}/api/students/10/enrollments`, { headers: { cookie: parentCookie } })
    assert.strictEqual(histParentWrong.status, 403, 'Parent denied wrong child')

    console.log('✅ History RBAC verified')

    console.log('\n🎉 ALL TESTS PASSED.')

  } finally {
    console.log('\nCleaning up test data...')
    if (testYearId) {
      await db.delete(enrollments).where(eq(enrollments.academicYearId, testYearId))
      await db.delete(academicYears).where(eq(academicYears.id, testYearId))
    }
  }
}

runTests().catch(e => {
  console.error('\n❌ Test failed:', e)
  process.exit(1)
})
