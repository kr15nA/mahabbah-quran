import { assertSafeMutatingDbTestEnvironment } from './lib/assert-safe-mutating-db-test'

function setupPass() {
  process.env.ALLOW_MUTATING_DB_TESTS = 'true'
  process.env.MUTATING_DB_TEST_ENV = 'development'
  process.env.EXPECTED_DB_BRANCH = 'ep-bitter-salad-b39vhlkp'
}

function expectError(description: string, setup: () => void) {
  const oldEnv = { ...process.env }
  setupPass()
  setup()
  try {
    const originalError = console.error
    const originalExit = process.exit
    let exited = false
    console.error = () => {}
    ;(process as any).exit = () => { exited = true; throw new Error('EXIT') }
    try {
      assertSafeMutatingDbTestEnvironment()
    } catch (e: any) {
      if (e.message !== 'EXIT') throw e
    } finally {
      console.error = originalError
      process.exit = originalExit
    }
    if (!exited) throw new Error(`${description} did not exit`)
    console.log(`✅ ${description} blocked as expected`)
  } finally {
    process.env = oldEnv
  }
}

function expectPass(description: string, setup: () => void) {
  const oldEnv = { ...process.env }
  setupPass()
  setup()
  try {
    assertSafeMutatingDbTestEnvironment()
    console.log(`✅ ${description} passed as expected`)
  } catch (e: any) {
    throw new Error(`${description} threw unexpectedly`)
  } finally {
    process.env = oldEnv
  }
}

console.log('=== GUARD REGRESSION ===')

expectError('missing ALLOW_MUTATING_DB_TESTS', () => {
  delete process.env.ALLOW_MUTATING_DB_TESTS
})

expectError('wrong ALLOW_MUTATING_DB_TESTS', () => {
  process.env.ALLOW_MUTATING_DB_TESTS = 'false'
})

expectError('missing MUTATING_DB_TEST_ENV', () => {
  delete process.env.MUTATING_DB_TEST_ENV
})

expectError('invalid MUTATING_DB_TEST_ENV', () => {
  process.env.MUTATING_DB_TEST_ENV = 'production'
})

expectError('missing EXPECTED_DB_BRANCH', () => {
  delete process.env.EXPECTED_DB_BRANCH
})

expectError('partial expected identifier', () => {
  process.env.EXPECTED_DB_BRANCH = 'ep-bitter'
})

expectError('wrong exact endpoint identifier', () => {
  process.env.EXPECTED_DB_BRANCH = 'ep-wrong-endpoint-1234'
})

expectPass('correct exact endpoint identifier', () => {
  process.env.EXPECTED_DB_BRANCH = 'ep-bitter-salad-b39vhlkp'
})

expectError('known production endpoint', () => {
  process.env.DATABASE_URL = 'postgres://user:pass@ep-flat-waterfall-b3uvjas7-pooler.ap-southeast-1.neon.tech/neondb'
  process.env.EXPECTED_DB_BRANCH = 'ep-flat-waterfall-b3uvjas7'
})
