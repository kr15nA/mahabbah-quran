import { SignJWT } from 'jose'
import { db } from '../lib/db/client'
import { auditLogs, academicYears, classes, users, teacherAssignments } from '../drizzle/schema'
import { eq, and, desc } from 'drizzle-orm'
import { _stripSensitiveForTesting } from '../lib/audit/logger'
import assert from 'assert'

const HOST = 'http://localhost:3000'

async function generateToken(payload: Record<string, unknown>) {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET missing — cannot run tests')
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

async function get(url: string, cookie: string) {
  return fetch(url, { headers: { cookie } })
}

async function runTests() {
  console.log('=== AUDIT-LOG-001 Tests ===\n')

  const adminCookie = `mq_session=${await generateToken({ userId: 4, role: 'admin', fullName: 'Admin' })}`
  const guruCookie  = `mq_session=${await generateToken({ userId: 2, role: 'guru',  fullName: 'Guru'  })}`
  
  let testYearId: number | undefined
  let testGuruId: number | undefined

  try {
    const [activeYear] = await db.select().from(academicYears).where(eq(academicYears.isActive, true)).limit(1)
    if (!activeYear) throw new Error('No active academic year — seed DB first')
    const activeYearId = activeYear.id

    // ─── 1 & 2 & 13. UNAUTHENTICATED / UNAUTHORIZED / FAILURES ──────────
    console.log('--- FAILURE MUTATIONS ---')
    const auditCountBefore = await db.select({ id: auditLogs.id }).from(auditLogs)

    // Unauthenticated
    await fetch(`${HOST}/api/academic-years`, { method: 'POST', body: JSON.stringify({ name: 'Fail', startDate: '2020-01-01', endDate: '2020-12-31' }) })
    // Unauthorized
    await post(`${HOST}/api/academic-years`, { name: 'Fail', startDate: '2020-01-01', endDate: '2020-12-31' }, guruCookie)
    // Failed business mutation (validation error)
    await post(`${HOST}/api/academic-years`, { name: 'Fail', startDate: 'bad-date', endDate: '2020-12-31' }, adminCookie)

    const auditCountAfter = await db.select({ id: auditLogs.id }).from(auditLogs)
    assert.strictEqual(auditCountAfter.length, auditCountBefore.length, 'No audit logs created on unauthenticated, unauthorized, or failed mutations')
    console.log('✅ Failed mutations do not create audit records')

    // ─── 3 & 4. AUTHORIZED MUTATION / ACTOR IDENTITY ─────────────────────
    console.log('\n--- SUCCESSFUL MUTATION & ACTOR IDENTITY ---')
    const createYearRes = await post(`${HOST}/api/academic-years`, { name: 'Audit Test Year', startDate: '2029-01-01', endDate: '2029-12-31' }, adminCookie)
    assert.strictEqual(createYearRes.status, 201)
    const newYear = await createYearRes.json()
    testYearId = newYear.id

    const [createAudit] = await db.select().from(auditLogs).where(eq(auditLogs.entityId, testYearId!)).orderBy(desc(auditLogs.createdAt)).limit(1)
    assert.ok(createAudit, 'Audit row created')
    assert.strictEqual(createAudit.actorUserId, 4, 'Actor user ID is correct')
    assert.strictEqual(createAudit.action, 'CREATE')
    assert.strictEqual(createAudit.entityType, 'ACADEMIC_YEAR')
    console.log('✅ Authorized mutation creates correct audit record')

    // ─── 6. SENSITIVE FIELDS ─────────────────────────────────────────────
    console.log('\n--- SENSITIVE FIELDS ---')
    const stripped = _stripSensitiveForTesting({
      name: 'Safe',
      password: 'mypassword',
      password_hash: 'hashed',
      passwordHash: 'hashed2',
      fcm_token: 'token',
      apiKey: 'secret',
    })
    assert.ok(stripped.name === 'Safe')
    assert.ok(!('password' in stripped))
    assert.ok(!('password_hash' in stripped))
    assert.ok(!('fcm_token' in stripped))
    
    // Create Guru to test sensitive strip
    const createGuruRes = await post(`${HOST}/api/guru`, {
      full_name: 'Audit Test Guru',
      password: 'password123',
    }, adminCookie)
    assert.strictEqual(createGuruRes.status, 201)
    const newGuru = await createGuruRes.json()
    testGuruId = Number(newGuru.data.id)

    const [guruAudit] = await db.select().from(auditLogs).where(and(eq(auditLogs.entityId, testGuruId), eq(auditLogs.entityType, 'USER'))).limit(1)
    assert.ok(guruAudit)
    assert.ok(!(guruAudit.newValues as any)?.password)
    assert.ok(!(guruAudit.newValues as any)?.password_hash)
    console.log('✅ Sensitive fields stripped from audit payloads')

    // ─── 7 & 8 & 9. TEACHER ASSIGNMENTS (Old/New & History) ─────────────
    console.log('\n--- TEACHER ASSIGNMENTS ---')
    const classId = 1
    // Get existing assignment
    const [existingTa] = await db.select().from(teacherAssignments).where(and(eq(teacherAssignments.academicYearId, activeYearId), eq(teacherAssignments.classId, classId))).limit(1)
    const originalTeacherId = existingTa ? existingTa.teacherId : null

    // Assign new teacher to active year
    const taRes = await post(`${HOST}/api/teacher-assignments`, { academicYearId: activeYearId, classId, teacherId: testGuruId }, adminCookie)
    if (![200, 201].includes(taRes.status)) {
      console.log('Teacher Assignment Error:', await taRes.text())
    }
    assert.ok([200, 201].includes(taRes.status))

    const [taAudit] = await db.select().from(auditLogs).where(and(eq(auditLogs.entityType, 'TEACHER_ASSIGNMENT'))).orderBy(desc(auditLogs.createdAt)).limit(1)
    
    assert.ok(taAudit)
    assert.strictEqual((taAudit.newValues as any).teacherId, testGuruId)
    if (taRes.status === 200) {
      assert.strictEqual(taAudit.action, 'UPDATE')
      assert.strictEqual((taAudit.oldValues as any).teacherId, originalTeacherId)
    } else {
      assert.strictEqual(taAudit.action, 'CREATE')
    }
    console.log('✅ Teacher assignment records old and new teacher correctly')

    // Historical teacher correction
    const histTaRes = await post(`${HOST}/api/teacher-assignments`, { academicYearId: testYearId!, classId, teacherId: 2 }, adminCookie)
    assert.strictEqual(histTaRes.status, 201)
    const [histTaAudit] = await db.select().from(auditLogs).where(and(eq(auditLogs.entityType, 'TEACHER_ASSIGNMENT'), eq(auditLogs.action, 'CREATE'))).orderBy(desc(auditLogs.createdAt)).limit(1)
    assert.ok(histTaAudit)
    assert.strictEqual((histTaAudit.newValues as any).teacherId, 2)
    console.log('✅ Historical teacher correction creates audit record')

    // Restore original active assignment
    if (originalTeacherId) {
      await post(`${HOST}/api/teacher-assignments`, { academicYearId: activeYearId, classId, teacherId: originalTeacherId }, adminCookie)
    }

    // ─── 10. ACTOR SURVIVES SOFT DELETE ─────────────────────────────────
    console.log('\n--- ACTOR SURVIVAL ---')
    // Simulate actor deletion (soft delete in users table)
    await db.update(users).set({ deletedAt: new Date() }).where(eq(users.id, 4))
    const [survivedAudit] = await db.select().from(auditLogs).where(eq(auditLogs.entityId, testYearId!)).limit(1)
    assert.ok(survivedAudit)
    assert.strictEqual(survivedAudit.actorUserId, 4)
    // Restore actor
    await db.update(users).set({ deletedAt: null }).where(eq(users.id, 4))
    console.log('✅ Audit records survive actor soft delete')

    // ─── 11. READ API & PAGINATION ──────────────────────────────────────
    console.log('\n--- READ API ---')
    const readRes1 = await get(`${HOST}/api/audit-logs?limit=1`, adminCookie)
    const logs1 = await readRes1.json()
    assert.strictEqual(logs1.length, 1)

    const readRes2 = await get(`${HOST}/api/audit-logs?limit=2`, adminCookie)
    const logs2 = await readRes2.json()
    assert.strictEqual(logs2.length, 2)
    assert.strictEqual(logs1[0].id, logs2[0].id, 'Newest first order respected')
    
    // Filters test
    const readRes3 = await get(`${HOST}/api/audit-logs?entityType=USER`, adminCookie)
    const logs3 = await readRes3.json()
    assert.ok(logs3.every((l: any) => l.entityType === 'USER'))

    const readResGuru = await get(`${HOST}/api/audit-logs`, guruCookie)
    assert.strictEqual(readResGuru.status, 403, 'Guru denied access to audit logs')
    
    console.log('✅ Audit reads are filtered and paginated correctly')

    console.log('\n🎉 ALL AUDIT LOG TESTS PASSED.')

  } finally {
    console.log('\nCleaning up test data...')
    if (testYearId) {
      await db.delete(teacherAssignments).where(eq(teacherAssignments.academicYearId, testYearId))
      await db.delete(auditLogs).where(eq(auditLogs.entityId, testYearId))
      await db.delete(academicYears).where(eq(academicYears.id, testYearId))
    }
    if (testGuruId) {
      await db.delete(teacherAssignments).where(eq(teacherAssignments.teacherId, testGuruId))
      await db.delete(auditLogs).where(and(eq(auditLogs.entityType, 'USER'), eq(auditLogs.entityId, testGuruId)))
      await db.delete(users).where(eq(users.id, testGuruId))
    }
  }
}

runTests().catch(e => {
  console.error('\n❌ Test failed:', e.message || e)
  process.exit(1)
})
