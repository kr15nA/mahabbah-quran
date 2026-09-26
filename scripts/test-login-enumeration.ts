import assert from 'assert'
import { db } from '../lib/db/client'
import { users } from '../drizzle/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { assertSafeMutatingDbTestEnvironment } from './lib/assert-safe-mutating-db-test'
const HOST = 'http://localhost:3000'

async function login(identifier: string, password?: string, bodyOverrides?: object) {
  return fetch(`${HOST}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password, ...bodyOverrides }),
  })
}

async function runTests() {
  assertSafeMutatingDbTestEnvironment()
  console.log('=== SEC-AUTH-002 Login Enumeration Tests ===\n')

  const testPassword = 'Password123!'
  let testUserId: number | undefined
  let testInactiveUserId: number | undefined

  try {
    const passwordHash = await bcrypt.hash(testPassword, 10)
    
    // Create active user
    const [user] = await db.insert(users).values({
      fullName: 'Enum Test User',
      email: `enum.active.${Date.now()}@example.com`,
      passwordHash,
      role: 'admin',
      isActive: true,
    }).returning({ id: users.id, email: users.email })
    testUserId = user.id

    // Create inactive user
    const [inactiveUser] = await db.insert(users).values({
      fullName: 'Enum Inactive User',
      email: `enum.inactive.${Date.now()}@example.com`,
      passwordHash,
      role: 'admin',
      isActive: false,
    }).returning({ id: users.id, email: users.email })
    testInactiveUserId = inactiveUser.id

    const expectedError = 'Email/HP atau password tidak valid'

    // A. NONEXISTENT ACCOUNT
    console.log('--- A. NONEXISTENT ACCOUNT ---')
    const resA = await login('this.does.not.exist.12345@example.com', 'wrongpassword')
    assert.strictEqual(resA.status, 401, 'Nonexistent account should return 401')
    const bodyA = await resA.json()
    assert.strictEqual(bodyA.error, expectedError)
    console.log('✅ Nonexistent account returns generic 401')

    // B. WRONG PASSWORD
    console.log('\n--- B. WRONG PASSWORD ---')
    const resB = await login(user.email!, 'wrongpassword')
    assert.strictEqual(resB.status, 401, 'Wrong password should return 401')
    const bodyB = await resB.json()
    assert.strictEqual(bodyB.error, expectedError)
    console.log('✅ Wrong password returns generic 401')

    // C. INACTIVE ACCOUNT (wrong password)
    console.log('\n--- C. INACTIVE ACCOUNT (WRONG PASSWORD) ---')
    const resC1 = await login(inactiveUser.email!, 'wrongpassword')
    assert.strictEqual(resC1.status, 401, 'Inactive account should return 401')
    const bodyC1 = await resC1.json()
    assert.strictEqual(bodyC1.error, expectedError)
    console.log('✅ Inactive account (wrong password) returns generic 401')

    // C. INACTIVE ACCOUNT (correct password)
    console.log('\n--- C. INACTIVE ACCOUNT (CORRECT PASSWORD) ---')
    const resC2 = await login(inactiveUser.email!, testPassword)
    assert.strictEqual(resC2.status, 401, 'Inactive account should return 401 even with correct password')
    const bodyC2 = await resC2.json()
    assert.strictEqual(bodyC2.error, expectedError)
    console.log('✅ Inactive account (correct password) returns generic 401')

    // D. EQUIVALENCE
    console.log('\n--- D. EQUIVALENCE ---')
    assert.deepStrictEqual(bodyA, bodyB, 'Nonexistent and wrong password JSON should match')
    assert.deepStrictEqual(bodyA, bodyC1, 'Nonexistent and inactive JSON should match')
    console.log('✅ All failure responses are externally identical in shape and status')

    // E. VALID LOGIN
    console.log('\n--- E. VALID LOGIN ---')
    const resE = await login(user.email!, testPassword)
    assert.strictEqual(resE.status, 200, 'Valid login should return 200')
    const bodyE = await resE.json()
    assert.strictEqual(bodyE.success, true)
    console.log('✅ Valid login success contract preserved')

    // F. RATE LIMIT REGRESSION
    console.log('\n--- F. RATE LIMIT REGRESSION ---')
    const rateLimitEmail = `enum.ratelimit.${Date.now()}@example.com`
    for (let i = 1; i <= 5; i++) {
      await login(rateLimitEmail, 'wrong')
    }
    const resF = await login(rateLimitEmail, 'wrong')
    assert.strictEqual(resF.status, 429, 'Rate limit should still trigger 429')
    console.log('✅ Rate limit regression passed (still returns 429)')

    // G. MALFORMED REQUEST
    console.log('\n--- G. MALFORMED REQUEST ---')
    const resG = await login(user.email!, undefined)
    assert.strictEqual(resG.status, 400, 'Malformed should return 400')
    console.log('✅ Malformed request regression passed (still returns 400)')

    console.log('\n🎉 ALL LOGIN ENUMERATION TESTS PASSED.')

  } finally {
    console.log('\nCleaning up test data...')
    if (testUserId) {
      await db.delete(users).where(eq(users.id, testUserId))
    }
    if (testInactiveUserId) {
      await db.delete(users).where(eq(users.id, testInactiveUserId))
    }
  }
}

runTests().catch(e => {
  console.error('\n❌ Test failed:', e.message || e)
  process.exit(1)
})
