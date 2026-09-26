import assert from 'assert'
import { db } from '../lib/db/client'
import { users } from '../drizzle/schema'
import { loginRateLimits } from '../drizzle/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

const HOST = 'http://localhost:3000'

async function login(identifier: string, password?: string, bodyOverrides?: object) {
  return fetch(`${HOST}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password, ...bodyOverrides }),
  })
}

async function runTests() {
  console.log('=== SEC-PLATFORM-001 Login Rate Limit Tests ===\n')

  const testEmail = 'ratelimit.test@example.com'
  const testPassword = 'Password123!'
  let testUserId: number | undefined

  try {
    // 1. Create a test user directly in DB
    const passwordHash = await bcrypt.hash(testPassword, 10)
    const [user] = await db.insert(users).values({
      fullName: 'Rate Limit Test User',
      email: testEmail,
      passwordHash,
      role: 'admin',
      isActive: true,
    }).returning({ id: users.id })
    testUserId = user.id

    // Clean up any existing rate limit for this test email just in case
    // We don't have the hash here, so we just clear the whole table for safety if it's a dev DB
    // Actually better to just use the new endpoint since we can't easily import deriveLoginRateLimitKey here because of process.env setup?
    // Let's just use a unique email to ensure no conflict:
    const uniqueEmail = `ratelimit.test.${Date.now()}@example.com`
    await db.update(users).set({ email: uniqueEmail }).where(eq(users.id, testUserId))

    // A. BASIC FAILURE SEQUENCE
    console.log('--- A. BASIC FAILURE SEQUENCE ---')
    for (let i = 1; i <= 5; i++) {
      const res = await login(uniqueEmail, 'wrongpassword')
      assert.strictEqual(res.status, 401, `Attempt ${i} should return 401, got ${res.status}`)
    }
    console.log('✅ 5 failed attempts returned 401')

    const res6 = await login(uniqueEmail, 'wrongpassword')
    assert.strictEqual(res6.status, 429, 'Attempt 6 should return 429')
    const body6 = await res6.json()
    assert.strictEqual(body6.error, 'Terlalu banyak percobaan masuk. Silakan coba lagi nanti.')
    
    const retryAfter = res6.headers.get('Retry-After')
    assert.ok(retryAfter, 'Retry-After header is present')
    assert.ok(parseInt(retryAfter, 10) > 0, 'Retry-After is positive')
    console.log('✅ 6th attempt blocked with 429, generic message, and Retry-After header')

    // B. NONEXISTENT IDENTIFIER
    console.log('\n--- B. NONEXISTENT IDENTIFIER ---')
    const fakeEmail = `nonexistent.${Date.now()}@example.com`
    for (let i = 1; i <= 5; i++) {
      const res = await login(fakeEmail, 'anypassword')
      assert.strictEqual(res.status, 401, `Fake email attempt ${i} should return 401`)
    }
    const fakeRes6 = await login(fakeEmail, 'anypassword')
    assert.strictEqual(fakeRes6.status, 429, 'Fake email attempt 6 should return 429')
    console.log('✅ Nonexistent identifier is properly rate limited to prevent enumeration')

    // C. SUCCESS RESET
    console.log('\n--- C. SUCCESS RESET ---')
    const resetTestEmail = `reset.test.${Date.now()}@example.com`
    await db.update(users).set({ email: resetTestEmail }).where(eq(users.id, testUserId))
    
    // Fail 3 times
    for (let i = 1; i <= 3; i++) {
      await login(resetTestEmail, 'wrong')
    }
    
    // Success login
    const successRes = await login(resetTestEmail, testPassword)
    assert.strictEqual(successRes.status, 200, 'Success login should return 200')
    const setCookie = successRes.headers.get('set-cookie')
    assert.ok(setCookie?.includes('mq_session'), 'Session cookie should be set')
    
    // Fail 3 times again, should not be blocked since it was reset
    for (let i = 1; i <= 3; i++) {
      const res = await login(resetTestEmail, 'wrong')
      assert.strictEqual(res.status, 401, 'Should return 401 because counter was reset')
    }
    console.log('✅ Successful login resets the counter')

    // D. MALFORMED / MISSING INPUT
    console.log('\n--- D. MALFORMED / MISSING INPUT ---')
    const malformedEmail = `malformed.${Date.now()}@example.com`
    // Attempt 10 times without password
    for (let i = 1; i <= 10; i++) {
      const res = await login(malformedEmail, undefined)
      assert.strictEqual(res.status, 400, 'Malformed input should return 400')
    }
    // Now try 1 bad credential attempt, it should be the "first" counted attempt, so it returns 401, not 429
    const malformedResFinal = await login(malformedEmail, 'wrong')
    assert.strictEqual(malformedResFinal.status, 401, 'Malformed requests should NOT consume rate limit slots')
    console.log('✅ Malformed requests do not consume credential limiter slots')

    // E. CONCURRENCY
    console.log('\n--- E. CONCURRENCY ---')
    const concurrentEmail = `concurrent.${Date.now()}@example.com`
    // Send 10 concurrent requests
    const promises = []
    for (let i = 0; i < 10; i++) {
      promises.push(login(concurrentEmail, 'wrong'))
    }
    const responses = await Promise.all(promises)
    
    let rateLimitedCount = 0
    let unauthorizedCount = 0
    for (const res of responses) {
      if (res.status === 429) rateLimitedCount++
      if (res.status === 401) unauthorizedCount++
    }
    
    assert.strictEqual(unauthorizedCount, 5, `Exactly 5 requests should get 401, got ${unauthorizedCount}`)
    assert.strictEqual(rateLimitedCount, 5, `Exactly 5 requests should get 429, got ${rateLimitedCount}`)
    console.log('✅ Atomic consume correctly handles concurrent bursts (5 allowed, 5 blocked)')

    // F. SESSION REGRESSION
    console.log('\n--- F. SESSION REGRESSION ---')
    // We already verified the cookie was set in C. SUCCESS RESET.
    const finalSuccess = await login(resetTestEmail, testPassword)
    assert.strictEqual(finalSuccess.status, 200)
    const body = await finalSuccess.json()
    assert.strictEqual(body.success, true)
    console.log('✅ Normal auth success contract preserved')

    console.log('\n🎉 ALL LOGIN RATE LIMIT TESTS PASSED.')

  } finally {
    console.log('\nCleaning up test data...')
    if (testUserId) {
      await db.delete(users).where(eq(users.id, testUserId))
    }
    // We can't easily delete rate limits by email hash without duplicating logic, 
    // but the DB handles cleanup opportunistically or by expiry anyway.
  }
}

runTests().catch(e => {
  console.error('\n❌ Test failed:', e.message || e)
  process.exit(1)
})
