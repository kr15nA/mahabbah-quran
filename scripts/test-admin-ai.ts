import { db } from '../lib/db/client'
import { users, students } from '../drizzle/schema'
import { eq, isNull } from 'drizzle-orm'
import * as assert from 'assert'
import { SignJWT } from 'jose'

function getJwtSecretKey() {
  return new TextEncoder().encode(process.env.JWT_SECRET || 'mahabbah-secret-key-for-development')
}

async function createToken(user: any) {
  const token = await new SignJWT({ userId: user.id, role: user.role, fullName: user.fullName })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getJwtSecretKey())
  return `mq_session=${token}`
}

async function runTests() {
  console.log('Running Admin AI Security Tests...\n')
  const HOST = 'http://localhost:3000'
  const PERIOD = '2026-09'

  // Get Users
  const [admin] = await db.select().from(users).where(eq(users.role, 'admin')).limit(1)
  const [guru] = await db.select().from(users).where(eq(users.role, 'guru')).limit(1)
  const [parent] = await db.select().from(users).where(eq(users.role, 'orang_tua')).limit(1)

  const adminCookie = await createToken(admin)
  const guruCookie = await createToken(guru)
  const parentCookie = await createToken(parent)

  // Get a test student
  const [student] = await db.select().from(students).where(isNull(students.deletedAt)).limit(1)
  const studentId = student.id

  // 1. Unauthenticated Denied
  const resUnauth = await fetch(`${HOST}/api/ai/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId, period: PERIOD })
  })
  assert.strictEqual(resUnauth.status, 401, 'Unauthenticated user should be denied (401)')
  console.log('✅ Unauthenticated user cannot access AI')

  // 2. Parent Denied
  const resParent = await fetch(`${HOST}/api/ai/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: parentCookie },
    body: JSON.stringify({ studentId, period: PERIOD })
  })
  assert.strictEqual(resParent.status, 403, 'Parent should be denied (403)')
  console.log('✅ Parent cannot access AI')

  // 3. Guru Denied
  const resGuru = await fetch(`${HOST}/api/ai/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: guruCookie },
    body: JSON.stringify({ studentId, period: PERIOD })
  })
  assert.strictEqual(resGuru.status, 403, 'Guru should be denied (403)')
  console.log('✅ Guru cannot access AI')

  // 4. Missing Params Error
  const resMissing = await fetch(`${HOST}/api/ai/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: adminCookie },
    body: JSON.stringify({ studentId: null, period: null })
  })
  assert.strictEqual(resMissing.status, 400, 'Missing params should return 400')
  console.log('✅ Missing params handled securely')

  // 5. Admin Allowed + Valid Output Structure (or Graceful API Error)
  const resAdmin = await fetch(`${HOST}/api/ai/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: adminCookie },
    body: JSON.stringify({ studentId, period: PERIOD })
  })

  // Because the actual API key might not be set or we might hit rate limits, we should accept 200 or 503
  if (resAdmin.status === 200) {
    const data = await resAdmin.json()
    assert.ok(data.answer, 'Missing "answer" in AI response')
    assert.ok(typeof data.answer.summary === 'string', 'Summary is not a string')
    assert.ok(Array.isArray(data.answer.strengths), 'Strengths is not an array')
    assert.ok(Array.isArray(data.answer.concerns), 'Concerns is not an array')
    console.log('✅ Admin can access AI and output schema is valid')
  } else if (resAdmin.status === 503) {
    const errorData = await resAdmin.json()
    assert.match(errorData.error, /Konfigurasi AI/i, 'Error should be a configuration error')
    console.log('✅ Admin can access AI, missing API key handled gracefully (503)')
  } else {
    const errorData = await resAdmin.json().catch(() => ({ error: 'unparseable' }))
    throw new Error(`Unexpected status ${resAdmin.status} from Admin API call. Error: ${JSON.stringify(errorData)}`)
  }

  // 6. Test with an invalid student
  const resInvalidStudent = await fetch(`${HOST}/api/ai/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: adminCookie },
    body: JSON.stringify({ studentId: 999999, period: PERIOD })
  })
  assert.strictEqual(resInvalidStudent.status, 404, 'Invalid student should return 404')
  console.log('✅ Invalid student ID is rejected')

  console.log('\n🎉 All Admin AI Security Checks Passed!')
}

runTests().catch(err => {
  console.error('\n❌ Test Failed:', err)
  process.exit(1)
})
