import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import assert from 'assert'
import { NextRequest } from 'next/server'
import { GET as healthGet } from '../app/api/health/route'
import { GET as cronGet } from '../app/api/cron/recurring-billing/route'
import { getCronSecret } from '../lib/config/env'

async function runOpsBaseTests() {
  console.log('=== OPS-BASE-001 Verification Tests ===\n')

  // 1. Health endpoint tests
  console.log('--- 1. Health Endpoint GET /api/health ---')
  const healthRes = await healthGet()
  assert.strictEqual(healthRes.status, 200, 'Health endpoint should return 200 when DB is up')
  const healthJson = await healthRes.json()
  assert.strictEqual(healthJson.status, 'healthy', 'Status should be healthy')
  assert.strictEqual(healthJson.services.app, 'up', 'App service should be up')
  assert.strictEqual(healthJson.services.database, 'connected', 'Database service should be connected')
  assert.ok(typeof healthJson.latencyMs === 'number', 'latencyMs should be a number')
  assert.ok(typeof healthJson.timestamp === 'string', 'timestamp should be an ISO string')
  assert.strictEqual(healthJson.password, undefined, 'No secrets in response')
  assert.strictEqual(healthJson.databaseUrl, undefined, 'No DB URL in response')
  console.log('✅ /api/health returns 200 with structured status and no leaked secrets')

  // 2. Centralized CRON_SECRET & Cron Auth tests
  console.log('\n--- 2. Centralized CRON_SECRET & Cron Route Auth ---')
  const originalCronSecret = process.env.CRON_SECRET

  try {
    // 2a. Missing secret
    delete process.env.CRON_SECRET
    assert.throws(() => getCronSecret(), (err: Error) => {
      assert.ok(err.message.includes('CRON_SECRET'))
      return true
    })

    const missingSecretReq = new NextRequest('http://localhost:3000/api/cron/recurring-billing', {
      headers: { Authorization: 'Bearer any-token' },
    })
    const missingSecretRes = await cronGet(missingSecretReq)
    assert.strictEqual(missingSecretRes.status, 500, 'Cron route should return 500 when CRON_SECRET missing on server')
    const missingSecretJson = await missingSecretRes.json()
    assert.strictEqual(missingSecretJson.error, 'CRON_SECRET configuration missing on server')
    console.log('✅ Cron route fails safely with 500 when CRON_SECRET is unconfigured')

    // Set valid secret
    process.env.CRON_SECRET = 'super-secret-cron-token-xyz-12345'
    assert.strictEqual(getCronSecret(), 'super-secret-cron-token-xyz-12345')

    // 2b. Query parameter token forbidden
    const queryParamReq = new NextRequest('http://localhost:3000/api/cron/recurring-billing?secret=super-secret-cron-token-xyz-12345')
    const queryParamRes = await cronGet(queryParamReq)
    assert.strictEqual(queryParamRes.status, 400, 'Query param auth must return 400')
    console.log('✅ Query parameter secret strictly rejected with 400')

    // 2c. Missing Authorization header
    const noHeaderReq = new NextRequest('http://localhost:3000/api/cron/recurring-billing')
    const noHeaderRes = await cronGet(noHeaderReq)
    assert.strictEqual(noHeaderRes.status, 401, 'Missing Authorization header must return 401')
    console.log('✅ Missing Authorization header rejected with 401')

    // 2d. Wrong token
    const wrongTokenReq = new NextRequest('http://localhost:3000/api/cron/recurring-billing', {
      headers: { Authorization: 'Bearer wrong-secret-token' },
    })
    const wrongTokenRes = await cronGet(wrongTokenReq)
    assert.strictEqual(wrongTokenRes.status, 401, 'Wrong token must return 401')
    console.log('✅ Wrong token rejected with 401')

    // 2e. Shorter token (testing timingSafeEqual length mismatch safety)
    const shortTokenReq = new NextRequest('http://localhost:3000/api/cron/recurring-billing', {
      headers: { Authorization: 'Bearer short' },
    })
    const shortTokenRes = await cronGet(shortTokenReq)
    assert.strictEqual(shortTokenRes.status, 401, 'Short token must return 401 without throwing')
    console.log('✅ Length mismatched token rejected with 401')

    // 2f. Valid token format (auth passes; may return 422 if no matching academic year or period, or 200)
    const validAuthReq = new NextRequest('http://localhost:3000/api/cron/recurring-billing?period=1999-01', {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    })
    const validAuthRes = await cronGet(validAuthReq)
    assert.notStrictEqual(validAuthRes.status, 401, 'Valid token must not return 401')
    assert.notStrictEqual(validAuthRes.status, 500, 'Valid token must not return 500')
    console.log('✅ Valid Bearer token authenticated successfully (status:', validAuthRes.status, ')')

  } finally {
    if (originalCronSecret) {
      process.env.CRON_SECRET = originalCronSecret
    } else {
      delete process.env.CRON_SECRET
    }
  }

  console.log('\n🎉 ALL OPS-BASE-001 TESTS PASSED.')
}

runOpsBaseTests().catch((err) => {
  console.error('\n❌ Test failed:', err)
  process.exit(1)
})
