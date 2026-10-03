import { consumeRateLimit, hashSubject } from '@/lib/security/rate-limit'
import { db } from '@/lib/db/client'
import { rateLimits } from '@/drizzle/schema'
import { eq, inArray } from 'drizzle-orm'

import { assertSafeMutatingDbTestEnvironment } from './lib/assert-safe-mutating-db-test'

async function pureTests() {
  console.log('Running pure tests...')
  
  const hash1 = hashSubject('user_123')
  const hash2 = hashSubject('USER_123') // Case preserved
  const hash3 = hashSubject(' user_123 ') // Whitespace preserved

  if (hash1 === hash2) throw new Error('Subject hash case preservation failed')
  if (hash1 === hash3) throw new Error('Subject exact identity preservation failed')
  if (hash1.includes('user_123')) throw new Error('Raw subject leaked into hash')

  let whitespaceRejected = false
  try {
    hashSubject('   ')
  } catch (e: any) {
    if (e.message.includes('whitespace only')) whitespaceRejected = true
  }
  if (!whitespaceRejected) throw new Error('Whitespace-only subject was not rejected')

  console.log('Pure tests PASS')
}

async function integrationTests() {
  console.log('Running DB integration tests...')
  assertSafeMutatingDbTestEnvironment()

  const TEST_NS = `TEST_RATE_LIMIT_${Date.now()}`
  const TEST_NS2 = `${TEST_NS}_2`
  const subject1 = 'user_1'
  const subject2 = 'user_2'

  try {
    // 1. First request allowed
    const res1 = await consumeRateLimit({ namespace: TEST_NS, subject: subject1, limit: 5, windowSeconds: 60 })
    if (!res1.allowed || res1.remaining !== 4) throw new Error('Request 1 failed')

    // 2. Requests 2-5 allowed
    for (let i = 2; i <= 5; i++) {
      const res = await consumeRateLimit({ namespace: TEST_NS, subject: subject1, limit: 5, windowSeconds: 60 })
      if (!res.allowed || res.remaining !== (5 - i)) throw new Error(`Request ${i} failed`)
    }

    // 3. Request 6 denied, count capped
    const res6 = await consumeRateLimit({ namespace: TEST_NS, subject: subject1, limit: 5, windowSeconds: 60 })
    if (res6.allowed || res6.remaining !== 0 || res6.retryAfterSeconds <= 0) throw new Error('Request 6 not properly denied with positive retryAfterSeconds')

    const res7 = await consumeRateLimit({ namespace: TEST_NS, subject: subject1, limit: 5, windowSeconds: 60 })
    if (res7.allowed || res7.remaining !== 0) throw new Error('Request 7 not properly denied')

    // 4. Subject isolation
    const resS2 = await consumeRateLimit({ namespace: TEST_NS, subject: subject2, limit: 5, windowSeconds: 60 })
    if (!resS2.allowed || resS2.remaining !== 4) throw new Error('Subject isolation failed')

    // 5. Namespace isolation
    const resN2 = await consumeRateLimit({ namespace: TEST_NS2, subject: subject1, limit: 5, windowSeconds: 60 })
    if (!resN2.allowed || resN2.remaining !== 4) throw new Error('Namespace isolation failed')

    console.log('Sequential DB tests PASS')
  } finally {
    // Cleanup
    await db.delete(rateLimits).where(inArray(rateLimits.namespace, [TEST_NS, TEST_NS2]))
  }
}

async function concurrencyTest() {
  console.log('Running concurrency test...')
  assertSafeMutatingDbTestEnvironment()

  const TEST_NS = `TEST_CONCURRENT_${Date.now()}`
  const subject = 'user_concurrent'

  try {
    const promises = []
    for (let i = 0; i < 10; i++) {
      promises.push(consumeRateLimit({ namespace: TEST_NS, subject, limit: 5, windowSeconds: 60 }))
    }

    const results = await Promise.all(promises)
    const allowedCount = results.filter(r => r.allowed).length
    const deniedCount = results.filter(r => !r.allowed).length

    if (allowedCount !== 5 || deniedCount !== 5) {
      throw new Error(`Concurrency race! Allowed: ${allowedCount}, Denied: ${deniedCount}`)
    }

    console.log('Concurrency test PASS (exactly 5 allowed, 5 denied)')
  } finally {
    await db.delete(rateLimits).where(eq(rateLimits.namespace, TEST_NS))
  }
}

async function expiryTest() {
  console.log('Running expiry test...')
  assertSafeMutatingDbTestEnvironment()

  const TEST_NS = `TEST_EXPIRY_${Date.now()}`
  const subject = 'user_expiry'

  try {
    const res1 = await consumeRateLimit({ namespace: TEST_NS, subject, limit: 2, windowSeconds: 1 })
    if (!res1.allowed) throw new Error('Expiry test request 1 failed')

    const res2 = await consumeRateLimit({ namespace: TEST_NS, subject, limit: 2, windowSeconds: 1 })
    if (!res2.allowed) throw new Error('Expiry test request 2 failed')

    const res3 = await consumeRateLimit({ namespace: TEST_NS, subject, limit: 2, windowSeconds: 1 })
    if (res3.allowed) throw new Error('Expiry test request 3 allowed incorrectly')

    // Wait 1.1s for window to expire
    await new Promise(resolve => setTimeout(resolve, 1100))

    const res4 = await consumeRateLimit({ namespace: TEST_NS, subject, limit: 2, windowSeconds: 1 })
    if (!res4.allowed || res4.remaining !== 1) throw new Error('Expired window did not reset correctly')

    console.log('Expiry test PASS')
  } finally {
    await db.delete(rateLimits).where(eq(rateLimits.namespace, TEST_NS))
  }
}

async function runAll() {
  try {
    await pureTests()
    await integrationTests()
    await concurrencyTest()
    await expiryTest()
    console.log('ALL TESTS PASS')
    process.exit(0)
  } catch (err) {
    console.error('Test Failed:', err)
    process.exit(1)
  }
}

runAll()
