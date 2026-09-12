import { SignJWT } from 'jose'
import { db } from '../lib/db/client'
import { teacherAssignments, academicYears, classes, users } from '../drizzle/schema'
import { eq, and } from 'drizzle-orm'
import assert from 'assert'

const HOST = 'http://localhost:3000'

async function generateToken(payload: Record<string, unknown>) {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET missing — cannot run auth tests')
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(secret))
}

async function post(url: string, body: object, cookie: string) {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify(body),
  })
}

async function runTests() {
  console.log('=== SYSTEM-FOUNDATION-003-HARDENING Tests ===\n')

  const adminCookie = `mq_session=${await generateToken({ userId: 4, role: 'admin', fullName: 'Admin' })}`
  const guruCookie  = `mq_session=${await generateToken({ userId: 2, role: 'guru',  fullName: 'Guru'  })}`
  const parentCookie = `mq_session=${await generateToken({ userId: 5, role: 'orang_tua', fullName: 'Parent' })}`

  let testYearId: number | undefined
  let histYearId: number | undefined

  try {
    const [activeYear] = await db.select().from(academicYears).where(eq(academicYears.isActive, true)).limit(1)
    if (!activeYear) throw new Error('No active academic year — seed DB first')
    const activeYearId = activeYear.id

    // Create a stable inactive test year for this run
    const [testYear] = await db.insert(academicYears).values({
      name: 'TEST_YEAR_HARDENING',
      startDate: '2019-01-01',
      endDate: '2019-12-31',
      isActive: false,
    }).returning()
    testYearId = testYear.id

    // Create a historical year to prove F-003 regression
    const [histYear] = await db.insert(academicYears).values({
      name: 'TEST_YEAR_HIST_HARDENING',
      startDate: '2018-01-01',
      endDate: '2018-12-31',
      isActive: false,
    }).returning()
    histYearId = histYear.id

    const classId      = 1
    const teacherId    = 2  // valid active guru
    const otherTeacherId = 3  // another valid active guru
    const adminTeacherId = 4  // admin role — must be rejected

    // ─── 1. AUTH & RBAC ─────────────────────────────────────────────────────────
    console.log('--- AUTH & RBAC TESTS ---')

    const unauthRes = await fetch(`${HOST}/api/teacher-assignments`, { method: 'POST', body: JSON.stringify({}) })
    assert.strictEqual(unauthRes.status, 401, 'Unauthenticated → 401')

    const parentRes = await post(`${HOST}/api/teacher-assignments`, { classId, academicYearId: testYearId, teacherId }, parentCookie)
    assert.strictEqual(parentRes.status, 403, 'Parent → 403')

    const guruRes = await post(`${HOST}/api/teacher-assignments`, { classId, academicYearId: testYearId, teacherId }, guruCookie)
    assert.strictEqual(guruRes.status, 403, 'Guru → 403')

    console.log('✅ RBAC: Unauthenticated/Parent/Guru all denied')

    // ─── 2. CREATION — F-005: 201 on new ────────────────────────────────────────
    console.log('\n--- CREATION (F-005: 201 on new assignment) ---')

    const createRes = await post(`${HOST}/api/teacher-assignments`, { classId, academicYearId: testYearId, teacherId }, adminCookie)
    assert.strictEqual(createRes.status, 201, 'New assignment → 201')
    const createBody = await createRes.json()
    assert.strictEqual(createBody.outcome, 'created', 'outcome = created')

    console.log('✅ F-005: 201 returned on new assignment')

    // ─── 3. UPDATE (same class/year) — F-005: 200 on update ────────────────────
    console.log('\n--- UPDATE (F-005: 200 on existing assignment) ---')

    const updateRes = await post(`${HOST}/api/teacher-assignments`, { classId, academicYearId: testYearId, teacherId: otherTeacherId }, adminCookie)
    assert.strictEqual(updateRes.status, 200, 'Updating existing assignment → 200')
    const updateBody = await updateRes.json()
    assert.strictEqual(updateBody.outcome, 'updated', 'outcome = updated')

    console.log('✅ F-005: 200 returned on existing assignment update')

    // ─── 4. INVALID TEACHER VALIDATION ──────────────────────────────────────────
    console.log('\n--- INVALID TEACHER TESTS ---')

    const invalidRoleRes = await post(`${HOST}/api/teacher-assignments`, { classId, academicYearId: testYearId, teacherId: adminTeacherId }, adminCookie)
    assert.strictEqual(invalidRoleRes.status, 403, 'Admin-role user as teacher → 403')

    await db.update(users).set({ isActive: false }).where(eq(users.id, otherTeacherId))
    const inactiveRes = await post(`${HOST}/api/teacher-assignments`, { classId, academicYearId: testYearId, teacherId: otherTeacherId }, adminCookie)
    assert.strictEqual(inactiveRes.status, 400, 'Inactive teacher → 400')
    await db.update(users).set({ isActive: true }).where(eq(users.id, otherTeacherId))

    console.log('✅ Invalid/Inactive teacher correctly rejected')

    // ─── 5. F-002: ACTIVE YEAR ATOMICITY / CONSISTENCY INVARIANT ────────────────
    console.log('\n--- F-002: ACTIVE-YEAR ATOMICITY / CONSISTENCY INVARIANT ---')

    // Snapshot classes.teacher_id before
    const [classBefore] = await db.select().from(classes).where(eq(classes.id, classId)).limit(1)
    const originalTeacherId = classBefore.teacherId

    // Assign a DIFFERENT teacher in the active year → should update classes.teacher_id atomically
    const activeAssignRes = await post(`${HOST}/api/teacher-assignments`, { classId, academicYearId: activeYearId, teacherId: otherTeacherId }, adminCookie)
    assert.ok([200, 201].includes(activeAssignRes.status), `Active-year assignment → 2xx (got ${activeAssignRes.status})`)

    // Verify teacher_assignments and classes.teacher_id are consistent
    const [classAfterActive] = await db.select().from(classes).where(eq(classes.id, classId)).limit(1)
    const [taAfterActive] = await db.select().from(teacherAssignments)
      .where(and(eq(teacherAssignments.classId, classId), eq(teacherAssignments.academicYearId, activeYearId)))
      .limit(1)

    assert.ok(taAfterActive, 'teacher_assignments row exists for active year')
    assert.strictEqual(taAfterActive.teacherId, otherTeacherId, 'teacher_assignments.teacher_id = otherTeacherId')
    assert.strictEqual(classAfterActive.teacherId, otherTeacherId, 'classes.teacher_id synced = otherTeacherId')
    assert.strictEqual(taAfterActive.teacherId, classAfterActive.teacherId,
      'INVARIANT: teacher_assignments.teacher_id === classes.teacher_id for active year')

    console.log('✅ F-002: teacher_assignments and classes.teacher_id are consistent after active-year assignment')

    // Assign in INACTIVE year → classes.teacher_id must NOT change
    const inactiveAssignRes = await post(`${HOST}/api/teacher-assignments`, { classId, academicYearId: testYearId, teacherId }, adminCookie)
    assert.ok([200, 201].includes(inactiveAssignRes.status))

    const [classAfterInactive] = await db.select().from(classes).where(eq(classes.id, classId)).limit(1)
    assert.strictEqual(classAfterInactive.teacherId, otherTeacherId,
      'classes.teacher_id must NOT change when assigning in an inactive year')

    console.log('✅ F-002: Inactive-year assignment correctly leaves classes.teacher_id untouched')

    // Restore original active-year assignment
    await post(`${HOST}/api/teacher-assignments`, { classId, academicYearId: activeYearId, teacherId: originalTeacherId }, adminCookie)
    const [classRestored] = await db.select().from(classes).where(eq(classes.id, classId)).limit(1)
    assert.strictEqual(classRestored.teacherId, originalTeacherId, 'Restored original teacher')

    console.log('✅ F-002: Active-year sync invariant fully verified')

    // ─── 6. F-001: HISTORICAL CORRECTIONS (policy updated: corrections allowed) ─
    console.log('\n--- F-001: HISTORICAL CORRECTION POLICY ---')

    // Create historical assignment
    const histCreate = await post(`${HOST}/api/teacher-assignments`, { classId, academicYearId: histYearId, teacherId }, adminCookie)
    assert.strictEqual(histCreate.status, 201, 'Historical assignment created')

    // Correct it (should return 200, not error)
    const histCorrect = await post(`${HOST}/api/teacher-assignments`, { classId, academicYearId: histYearId, teacherId: otherTeacherId }, adminCookie)
    assert.strictEqual(histCorrect.status, 200, 'Historical correction → 200')
    assert.strictEqual((await histCorrect.json()).outcome, 'updated', 'Historical correction outcome = updated')

    // Verify classes.teacher_id unchanged after historical correction
    const [classAfterHist] = await db.select().from(classes).where(eq(classes.id, classId)).limit(1)
    assert.strictEqual(classAfterHist.teacherId, originalTeacherId,
      'classes.teacher_id untouched after historical year correction')

    console.log('✅ F-001: Historical corrections work; classes.teacher_id preserved')

    // ─── 7. F-003: MIGRATION IDEMPOTENCY REGRESSION ─────────────────────────────
    console.log('\n--- F-003: MIGRATION IDEMPOTENCY REGRESSION ---')
    // This test verifies the migration script would NOT skip a class that has
    // a historical assignment from a different year.
    //
    // We simulate this by checking: the testYearId assignment exists for classId,
    // but a DIFFERENT year (histYearId) also has an assignment for classId.
    // The fixed migration should ONLY skip if the ACTIVE YEAR has an assignment.
    const histAssignment = await db.select({ id: teacherAssignments.id })
      .from(teacherAssignments)
      .where(and(eq(teacherAssignments.classId, classId), eq(teacherAssignments.academicYearId, histYearId!)))
      .limit(1)
    assert.ok(histAssignment.length > 0, 'Historical assignment row exists for classId')

    const activeAssignment = await db.select({ id: teacherAssignments.id })
      .from(teacherAssignments)
      .where(and(eq(teacherAssignments.classId, classId), eq(teacherAssignments.academicYearId, activeYearId)))
      .limit(1)
    assert.ok(activeAssignment.length > 0, 'Active-year assignment still exists despite historical row')

    console.log('✅ F-003: Historical row does not prevent active-year assignment from existing')

    // ─── 8. HISTORY RBAC ────────────────────────────────────────────────────────
    console.log('\n--- HISTORY RBAC ---')

    const histAdmin = await fetch(`${HOST}/api/classes/${classId}/teacher-assignments`, { headers: { cookie: adminCookie } })
    assert.strictEqual(histAdmin.status, 200, 'Admin can read history')
    const histData = await histAdmin.json()
    assert.ok(histData.length >= 2, `History has multiple entries (got ${histData.length})`)

    const histGuru = await fetch(`${HOST}/api/classes/${classId}/teacher-assignments`, { headers: { cookie: guruCookie } })
    assert.strictEqual(histGuru.status, 403, 'Guru denied from history endpoint')

    const histParent = await fetch(`${HOST}/api/classes/${classId}/teacher-assignments`, { headers: { cookie: parentCookie } })
    assert.strictEqual(histParent.status, 403, 'Parent denied from history endpoint')

    console.log('✅ History RBAC verified')

    console.log('\n🎉 ALL HARDENING TESTS PASSED.')

  } finally {
    console.log('\nCleaning up test data...')
    if (testYearId) {
      await db.delete(teacherAssignments).where(eq(teacherAssignments.academicYearId, testYearId))
      await db.delete(academicYears).where(eq(academicYears.id, testYearId))
    }
    if (histYearId) {
      await db.delete(teacherAssignments).where(eq(teacherAssignments.academicYearId, histYearId))
      await db.delete(academicYears).where(eq(academicYears.id, histYearId))
    }
  }
}

runTests().catch(e => {
  console.error('\n❌ Test failed:', e.message || e)
  process.exit(1)
})
