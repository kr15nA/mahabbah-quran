import { SignJWT } from 'jose'
import { db } from '../lib/db/client'
import { teacherAssignments, academicYears, classes, users } from '../drizzle/schema'
import { eq } from 'drizzle-orm'
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
  console.log('Running SYSTEM-FOUNDATION-003 Tests...')

  const adminCookie = `mq_session=${await generateToken({ userId: 1, role: 'admin', fullName: 'Admin' })}`
  const guruCookie = `mq_session=${await generateToken({ userId: 2, role: 'guru', fullName: 'Guru' })}`
  const parentCookie = `mq_session=${await generateToken({ userId: 5, role: 'orang_tua', fullName: 'Parent' })}`

  let testYearId: number | undefined
  let activeYearId: number | undefined

  try {
    // 0. Setup a test academic year (inactive) and find the active one
    const [active] = await db.select().from(academicYears).where(eq(academicYears.isActive, true)).limit(1)
    activeYearId = active.id

    const [testYear] = await db.insert(academicYears).values({
      name: 'TEST_YEAR_TEACHER',
      startDate: '2020-01-01',
      endDate: '2020-12-31',
      isActive: false
    }).returning()
    testYearId = testYear.id

    // Use Class 1
    const classId = 1
    const teacherId = 2 // valid guru
    const otherTeacherId = 3 // another valid guru
    const invalidTeacherId = 4 // admin

    // 1. Auth & Admin Creation
    console.log('\n--- CREATION & AUTH TESTS ---')
    const unauthRes = await fetch(`${HOST}/api/teacher-assignments`, { method: 'POST', body: JSON.stringify({ classId, academicYearId: testYearId, teacherId }) })
    assert.strictEqual(unauthRes.status, 401, 'Unauthenticated denied')

    const parentRes = await fetch(`${HOST}/api/teacher-assignments`, { method: 'POST', headers: { cookie: parentCookie }, body: JSON.stringify({ classId, academicYearId: testYearId, teacherId }) })
    assert.strictEqual(parentRes.status, 403, 'Parent denied')

    const guruRes = await fetch(`${HOST}/api/teacher-assignments`, { method: 'POST', headers: { cookie: guruCookie }, body: JSON.stringify({ classId, academicYearId: testYearId, teacherId }) })
    assert.strictEqual(guruRes.status, 403, 'Guru denied')

    const adminRes = await fetch(`${HOST}/api/teacher-assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: adminCookie },
      body: JSON.stringify({ classId, academicYearId: testYearId, teacherId })
    })
    assert.strictEqual(adminRes.status, 201, 'Admin can create assignment')
    console.log('✅ Creation and Auth verified')

    // 2. Duplicate Prevention
    console.log('\n--- DUPLICATE TESTS ---')
    const dupRes = await fetch(`${HOST}/api/teacher-assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: adminCookie },
      body: JSON.stringify({ classId, academicYearId: testYearId, teacherId })
    })
    // It should UPSERT and return 201
    assert.strictEqual(dupRes.status, 201, 'Upsert handles same teacher')
    console.log('✅ Duplicate/Upsert handled')

    // 3. Invalid Role / Inactive Teacher
    console.log('\n--- INVALID TEACHER TESTS ---')
    const invalidRoleRes = await fetch(`${HOST}/api/teacher-assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: adminCookie },
      body: JSON.stringify({ classId, academicYearId: testYearId, teacherId: invalidTeacherId })
    })
    assert.strictEqual(invalidRoleRes.status, 403, 'Invalid teacher role (admin) rejected')

    // Temporarily make teacherId 3 inactive to test
    await db.update(users).set({ isActive: false }).where(eq(users.id, otherTeacherId))
    const inactiveRes = await fetch(`${HOST}/api/teacher-assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: adminCookie },
      body: JSON.stringify({ classId, academicYearId: testYearId, teacherId: otherTeacherId })
    })
    assert.strictEqual(inactiveRes.status, 400, 'Inactive teacher rejected')
    // Restore
    await db.update(users).set({ isActive: true }).where(eq(users.id, otherTeacherId))
    console.log('✅ Invalid/Inactive teacher rejected')

    // 4. Same-year Teacher Change & Active Year Sync
    console.log('\n--- TEACHER CHANGE TESTS ---')
    // Get current teacherId for active year
    const [currentClass] = await db.select().from(classes).where(eq(classes.id, classId)).limit(1)
    const originalTeacherId = currentClass.teacherId

    // Move in inactive year
    await fetch(`${HOST}/api/teacher-assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: adminCookie },
      body: JSON.stringify({ classId, academicYearId: testYearId, teacherId: otherTeacherId })
    })

    const [checkClass1] = await db.select().from(classes).where(eq(classes.id, classId)).limit(1)
    assert.strictEqual(checkClass1.teacherId, originalTeacherId, 'Inactive year assignment change MUST NOT update classes.teacher_id')

    // Move in active year
    await fetch(`${HOST}/api/teacher-assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: adminCookie },
      body: JSON.stringify({ classId, academicYearId: activeYearId, teacherId: otherTeacherId })
    })

    const [checkClass2] = await db.select().from(classes).where(eq(classes.id, classId)).limit(1)
    assert.strictEqual(checkClass2.teacherId, otherTeacherId, 'Active year assignment change MUST update classes.teacher_id')

    // Restore original teacher for active year
    await fetch(`${HOST}/api/teacher-assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: adminCookie },
      body: JSON.stringify({ classId, academicYearId: activeYearId, teacherId: originalTeacherId })
    })

    console.log('✅ Teacher change logic & legacy sync verified')

    // 5. History Reading & RBAC
    console.log('\n--- HISTORY RBAC TESTS ---')
    // Admin
    const histAdmin = await fetch(`${HOST}/api/classes/${classId}/teacher-assignments`, { headers: { cookie: adminCookie } })
    assert.strictEqual(histAdmin.status, 200, 'Admin can read history')
    const histData = await histAdmin.json()
    assert.ok(histData.length >= 2, 'History shows multiple years')

    // Guru can't read assignment endpoints since they are ADMIN only per prompt "Admin/Super Admin: manage assignments. Guru: read own authorized scope only" - Wait, the API GET /api/classes/[id]/teacher-assignments requires SUPER_ADMIN.
    const histGuru = await fetch(`${HOST}/api/classes/${classId}/teacher-assignments`, { headers: { cookie: guruCookie } })
    assert.strictEqual(histGuru.status, 403, 'Guru denied from admin endpoint')

    const histParent = await fetch(`${HOST}/api/classes/${classId}/teacher-assignments`, { headers: { cookie: parentCookie } })
    assert.strictEqual(histParent.status, 403, 'Parent denied from admin endpoint')

    console.log('✅ History RBAC verified')

    console.log('\n🎉 ALL TESTS PASSED.')

  } finally {
    console.log('\nCleaning up test data...')
    if (testYearId) {
      await db.delete(teacherAssignments).where(eq(teacherAssignments.academicYearId, testYearId))
      await db.delete(academicYears).where(eq(academicYears.id, testYearId))
    }
  }
}

runTests().catch(e => {
  console.error('\n❌ Test failed:', e)
  process.exit(1)
})
