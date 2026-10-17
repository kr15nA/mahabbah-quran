import assert from 'assert'
import { NextRequest } from 'next/server'
import { SignJWT } from 'jose'
import { db } from '../lib/db/client'
import { users } from '../drizzle/schema'
import { eq, inArray } from 'drizzle-orm'
import { executeImport } from '../lib/import-export'
import { middleware } from '../middleware'
import { GET as cronGet } from '../app/api/cron/recurring-billing/route'
import { getJwtSecretKey, getSession } from '../lib/auth/session'
import { assertSafeMutatingDbTestEnvironment } from './lib/assert-safe-mutating-db-test'

async function generateToken(payload: Record<string, unknown>, expiresIn = '1h') {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getJwtSecretKey())
}

async function runSecFollowupTests() {
  assertSafeMutatingDbTestEnvironment()
  console.log('=== STABILIZATION-SPRINT-01: SEC-FOLLOWUP-001 VERIFICATION SUITE ===\n')

  const testId = Date.now().toString().slice(-6)
  const createdUserIds: number[] = []
  const originalCronSecret = process.env.CRON_SECRET

  try {
    // =========================================================================
    // A1. CRON MIDDLEWARE TRAILING-SLASH AND BOUNDARY HARDENING
    // =========================================================================
    console.log('--- A1. CRON MIDDLEWARE TRAILING-SLASH & BOUNDARY HARDENING ---')

    // 1.1 Canonical recurring-billing path bypasses middleware without JWT
    const canonicalReq = new NextRequest('http://localhost:3000/api/cron/recurring-billing')
    const canonicalRes = await middleware(canonicalReq)
    assert.strictEqual(
      canonicalRes.status,
      200,
      'Canonical /api/cron/recurring-billing must bypass middleware without JWT'
    )
    console.log('✅ 1.1 Canonical /api/cron/recurring-billing bypasses middleware')

    // 1.2 Trailing-slash recurring-billing path also safely bypasses middleware without JWT
    const trailingSlashReq = new NextRequest('http://localhost:3000/api/cron/recurring-billing/')
    const trailingSlashRes = await middleware(trailingSlashReq)
    assert.strictEqual(
      trailingSlashRes.status,
      200,
      'Trailing-slash /api/cron/recurring-billing/ must also bypass middleware without JWT'
    )
    console.log('✅ 1.2 Trailing-slash /api/cron/recurring-billing/ safely bypasses middleware')

    // 1.3 Unknown cron paths with and without trailing slash are strictly blocked with 401
    const unknownCronReq = new NextRequest('http://localhost:3000/api/cron/unauthorized-backup')
    const unknownCronRes = await middleware(unknownCronReq)
    assert.strictEqual(unknownCronRes.status, 401, 'Unknown cron route must be blocked with 401')
    const unknownCronJson = await unknownCronRes.json()
    assert.strictEqual(unknownCronJson.error, 'Unauthorized')

    const unknownTrailingCronReq = new NextRequest('http://localhost:3000/api/cron/unauthorized-backup/')
    const unknownTrailingCronRes = await middleware(unknownTrailingCronReq)
    assert.strictEqual(unknownTrailingCronRes.status, 401, 'Unknown cron route with trailing slash must be blocked with 401')
    console.log('✅ 1.3 Unknown cron routes (with and without trailing slash) are fail-closed with 401')

    // 1.4 Route-level CRON_SECRET enforcement on recurring billing route
    process.env.CRON_SECRET = 'sec-followup-cron-secret-32ch-test!!'

    // 1.4.1 Query string secret rejected
    const querySecretReq = new NextRequest('http://localhost:3000/api/cron/recurring-billing?secret=sec-followup-cron-secret-32ch-test!!')
    const querySecretRes = await cronGet(querySecretReq)
    assert.strictEqual(querySecretRes.status, 400, 'Query param authentication must be rejected with 400')
    console.log('✅ 1.4.1 Query-string secret is rejected by route handler with 400 Bad Request')

    // 1.4.2 Missing Authorization header rejected with 401
    const missingAuthReq = new NextRequest('http://localhost:3000/api/cron/recurring-billing')
    const missingAuthRes = await cronGet(missingAuthReq)
    assert.strictEqual(missingAuthRes.status, 401, 'Missing Authorization header must be rejected with 401')
    console.log('✅ 1.4.2 Missing Authorization header is rejected with 401')

    // 1.4.3 Invalid Bearer token rejected with 401
    const invalidAuthReq = new NextRequest('http://localhost:3000/api/cron/recurring-billing', {
      headers: { authorization: 'Bearer wrong-secret-token' },
    })
    const invalidAuthRes = await cronGet(invalidAuthReq)
    assert.strictEqual(invalidAuthRes.status, 401, 'Invalid Bearer token must be rejected with 401')
    console.log('✅ 1.4.3 Invalid Bearer token is rejected with 401')

    // 1.4.4 Valid Bearer token accepted
    const validAuthReq = new NextRequest('http://localhost:3000/api/cron/recurring-billing', {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    })
    const validAuthRes = await cronGet(validAuthReq)
    assert.strictEqual(validAuthRes.status, 200, 'Valid Bearer token must be accepted with 200')
    const validJson = await validAuthRes.json()
    assert.strictEqual(validJson.success, true, 'Route handler execution must succeed')
    console.log('✅ 1.4.4 Valid Bearer token is accepted with 200 OK by route handler')

    // =========================================================================
    // A2. GURU & ORANG TUA IMPORT TRANSACTION ATOMIC ROLLBACK TESTS
    // =========================================================================
    console.log('\n--- A2. GURU & ORANG TUA IMPORT TRANSACTION ATOMIC ROLLBACK ---')

    // Setup: Create an existing user with known email and known password hash
    const existingEmail = `existing_user_${testId}@test.mahabbah.id`
    const originalPasswordHash = '$2a$10$originalPermanentPasswordHashFixture123'
    const [existingUser] = await db
      .insert(users)
      .values({
        fullName: `Existing User ${testId}`,
        email: existingEmail,
        role: 'guru',
        passwordHash: originalPasswordHash,
        mustChangePassword: false,
      })
      .returning({ id: users.id })

    assert.ok(existingUser?.id, 'Existing user fixture must be inserted')
    createdUserIds.push(existingUser.id)

    // 2.1 Guru import with unique-email collision triggers rollback
    const guruRollbackBatch = [
      {
        full_name: `New Guru ${testId}`,
        email: `new_guru_${testId}@test.mahabbah.id`,
        phone: '081300000001',
      },
      {
        full_name: `Colliding Guru ${testId}`,
        email: existingEmail, // COLLISION! Causes unique constraint violation
        phone: '081300000002',
      },
    ]

    let guruImportFailed = false
    let guruReturnedCredentials = undefined
    try {
      const res = await executeImport('guru', guruRollbackBatch)
      guruReturnedCredentials = res.credentials
    } catch (err: any) {
      guruImportFailed = true
    }

    assert.strictEqual(guruImportFailed, true, 'Guru import with colliding email must throw/reject')
    assert.strictEqual(guruReturnedCredentials, undefined, 'No credentials must be returned when Guru import fails')

    // Verify Row 1 was rolled back completely (0 records in DB)
    const orphanedGuru = await db
      .select()
      .from(users)
      .where(eq(users.email, guruRollbackBatch[0].email))

    assert.strictEqual(orphanedGuru.length, 0, 'Guru atomic rollback must leave 0 orphaned users')

    // Verify existing user password hash was not modified
    const [checkedExistingUserAfterGuru] = await db
      .select()
      .from(users)
      .where(eq(users.id, existingUser.id))

    assert.strictEqual(
      checkedExistingUserAfterGuru.passwordHash,
      originalPasswordHash,
      'Existing user password hash must remain completely unchanged'
    )
    console.log('✅ 2.1 Guru import collision rolls back atomically: 0 rows created, 0 credentials returned, existing user untouched')

    // 2.2 Orang Tua import with unique-email collision triggers rollback
    const parentRollbackBatch = [
      {
        full_name: `New Parent ${testId}`,
        email: `new_parent_${testId}@test.mahabbah.id`,
        phone: '081400000001',
      },
      {
        full_name: `Colliding Parent ${testId}`,
        email: existingEmail, // COLLISION! Causes unique constraint violation
        phone: '081400000002',
      },
    ]

    let parentImportFailed = false
    let parentReturnedCredentials = undefined
    try {
      const res = await executeImport('orang_tua', parentRollbackBatch)
      parentReturnedCredentials = res.credentials
    } catch (err: any) {
      parentImportFailed = true
    }

    assert.strictEqual(parentImportFailed, true, 'Parent import with colliding email must throw/reject')
    assert.strictEqual(parentReturnedCredentials, undefined, 'No credentials must be returned when Parent import fails')

    // Verify Row 1 was rolled back completely (0 records in DB)
    const orphanedParent = await db
      .select()
      .from(users)
      .where(eq(users.email, parentRollbackBatch[0].email))

    assert.strictEqual(orphanedParent.length, 0, 'Parent atomic rollback must leave 0 orphaned users')

    // Verify existing user password hash was not modified
    const [checkedExistingUserAfterParent] = await db
      .select()
      .from(users)
      .where(eq(users.id, existingUser.id))

    assert.strictEqual(
      checkedExistingUserAfterParent.passwordHash,
      originalPasswordHash,
      'Existing user password hash must remain completely unchanged'
    )
    console.log('✅ 2.2 Orang Tua import collision rolls back atomically: 0 rows created, 0 credentials returned, existing user untouched')

    // =========================================================================
    // A3. GETSESSION(REQ?) TOKEN ACQUISITION & CRYPTOGRAPHIC VALIDATION TESTS
    // =========================================================================
    console.log('\n--- A3. GETSESSION TOKEN ACQUISITION & CRYPTOGRAPHIC VALIDATION ---')

    // 3.1 Path 1 (NextRequest cookies): Valid token extracts correct SessionPayload
    const validPayload = {
      userId: 8888,
      role: 'guru' as const,
      fullName: 'Ustadz Test Session',
      email: 'ustadz.session@test.mahabbah.id',
      mustChangePassword: true,
    }
    const validToken = await generateToken(validPayload, '1h')
    const reqWithValidToken = new NextRequest('http://localhost:3000/api/test', {
      headers: {
        cookie: `mq_session=${validToken}`,
      },
    })

    const extractedSession = await getSession(reqWithValidToken)
    assert.ok(extractedSession, 'Session must be extracted from valid NextRequest cookie')
    assert.strictEqual(extractedSession.userId, validPayload.userId)
    assert.strictEqual(extractedSession.role, validPayload.role)
    assert.strictEqual(extractedSession.fullName, validPayload.fullName)
    assert.strictEqual(extractedSession.mustChangePassword, true)
    console.log('✅ 3.1 Valid NextRequest cookie token correctly verified and decoded')

    // 3.2 Path 1: Expired token in NextRequest cookies fails closed (returns null)
    const expiredToken = await generateToken(validPayload, '-10s')
    const reqWithExpiredToken = new NextRequest('http://localhost:3000/api/test', {
      headers: {
        cookie: `mq_session=${expiredToken}`,
      },
    })
    const expiredSession = await getSession(reqWithExpiredToken)
    assert.strictEqual(expiredSession, null, 'Expired token in NextRequest cookies must return null')
    console.log('✅ 3.2 Expired token in NextRequest cookies returns null')

    // 3.3 Path 1: Tampered/invalid signature token fails closed (returns null)
    const tamperedToken = await new SignJWT(validPayload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode('wrong-attacker-key-32-characters!'))

    const reqWithTamperedToken = new NextRequest('http://localhost:3000/api/test', {
      headers: {
        cookie: `mq_session=${tamperedToken}`,
      },
    })
    const tamperedSession = await getSession(reqWithTamperedToken)
    assert.strictEqual(tamperedSession, null, 'Tampered token signature must return null')
    console.log('✅ 3.3 Tampered token signature fails verification and returns null')

    // 3.4 Path 1: Malformed token string returns null
    const reqWithMalformedToken = new NextRequest('http://localhost:3000/api/test', {
      headers: {
        cookie: 'mq_session=not.a.valid.jwt.string',
      },
    })
    const malformedSession = await getSession(reqWithMalformedToken)
    assert.strictEqual(malformedSession, null, 'Malformed token string must return null')
    console.log('✅ 3.4 Malformed token string returns null')

    // 3.5 Path 1: Algorithm 'none' attack is unconditionally rejected
    const noneAlgToken = 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJ1c2VySWQiOjg4ODgsInJvbGUiOiJndXJ1In0.'
    const reqWithNoneAlgToken = new NextRequest('http://localhost:3000/api/test', {
      headers: {
        cookie: `mq_session=${noneAlgToken}`,
      },
    })
    const noneAlgSession = await getSession(reqWithNoneAlgToken)
    assert.strictEqual(noneAlgSession, null, "Algorithm 'none' token must be rejected with null")
    console.log("✅ 3.5 Algorithm 'none' token is rejected with null")

    console.log('\n🎉 ALL SEC-FOLLOWUP-001 TESTS PASSED SUCCESSFULLY!')
  } finally {
    process.env.CRON_SECRET = originalCronSecret

    // Deterministic cleanup of created test fixtures
    if (createdUserIds.length > 0) {
      await db.delete(users).where(inArray(users.id, createdUserIds))
      console.log(`[CLEANUP] Deleted ${createdUserIds.length} test user fixtures.`)
    }
  }
}

runSecFollowupTests().catch((err) => {
  console.error('\n❌ SEC-FOLLOWUP-001 TEST SUITE FAILED:', err)
  process.exit(1)
})
