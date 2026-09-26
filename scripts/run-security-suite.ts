import { spawn, spawnSync, ChildProcess } from 'child_process'
import { assertSafeMutatingDbTestEnvironment } from './lib/assert-safe-mutating-db-test'

const FAST_SUITE = [
  'scripts/test-env-validation.ts'
]

const AUTH_SUITE = [
  'scripts/test-login-enumeration.ts',
  'scripts/test-login-ratelimit.ts'
]

const AUTHZ_SUITE = [
  'scripts/test-audit-log.ts'
]

async function waitForServer(url: string, timeoutMs: number = 30000): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      // Any response means the server is up (even 404, 401, etc)
      return true
    } catch (e: any) {
      if (e.cause?.code === 'ECONNREFUSED' || e.code === 'ECONNREFUSED') {
        // expected, keep waiting
      } else {
        // other error
      }
    }
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  return false
}

function runScript(scriptPath: string): { status: number | null, duration: number } {
  const start = Date.now()
  console.log(`\n▶️ Running ${scriptPath}...`)
  
  // We use spawnSync to pipe stdout/stderr directly so we can see what's happening.
  // Note: we don't pass full process.env to avoid leaking secrets on errors, 
  // but we do need the current env to execute correctly (e.g. DATABASE_URL).
  // We'll let spawnSync inherit env but we won't log it.
  const result = spawnSync('npx', ['tsx', '--env-file=.env.local', scriptPath], {
    stdio: 'inherit'
  })
  
  const duration = Date.now() - start
  return { status: result.status, duration }
}

async function run() {
  const isFast = process.argv.includes('--fast')
  
  console.log('=== MAHABBAH QURAN SECURITY SUITE ===')
  
  // Preflight typecheck
  console.log('\n[PREFLIGHT] Typecheck')
  const typecheck = spawnSync('npx', ['tsc', '--noEmit'], { stdio: 'inherit' })
  if (typecheck.status !== 0) {
    console.error('❌ Typecheck failed. Aborting suite.')
    process.exit(1)
  }
  console.log('✅ Typecheck passed.')

  let results: { script: string, status: 'PASS' | 'FAIL', duration: number }[] = []
  
  // Run FAST suite
  console.log('\n=== SECURITY-FAST ===')
  for (const script of FAST_SUITE) {
    const { status, duration } = runScript(script)
    if (status !== 0) {
      console.error(`❌ [FAIL] ${script}`)
      results.push({ script, status: 'FAIL', duration })
      printSummary(results)
      process.exit(1)
    }
    console.log(`✅ [PASS] ${script}`)
    results.push({ script, status: 'PASS', duration })
  }

  if (isFast) {
    printSummary(results)
    process.exit(0)
  }

  // Preflight mutating check
  console.log('\n[PREFLIGHT] Mutating DB Safety Check')
  try {
    assertSafeMutatingDbTestEnvironment()
    console.log('✅ Safety check passed.')
  } catch (e: any) {
    console.error(`❌ Safety check failed: ${e.message}`)
    process.exit(1)
  }

  console.log('\n[SERVER] Starting Next.js Dev Server on port 3000...')
  
  // check if something is already on port 3000
  if (await waitForServer('http://localhost:3000', 500)) {
    console.error('❌ Port 3000 is already occupied. Please stop existing servers before running the security suite.')
    process.exit(1)
  }

  let serverProcess: ChildProcess | null = null
  
  try {
    // start server
    serverProcess = spawn('npm', ['run', 'dev'], {
      stdio: 'ignore', // don't pipe server logs to console to keep output clean
      detached: true // allows us to kill the whole process group
    })

    console.log('Waiting for server readiness...')
    const isReady = await waitForServer('http://localhost:3000')
    if (!isReady) {
      console.error('❌ Server failed to start within timeout.')
      throw new Error('SERVER_TIMEOUT')
    }
    console.log('✅ Server is ready.')

    console.log('\n=== SECURITY-AUTH ===')
    for (const script of AUTH_SUITE) {
      const { status, duration } = runScript(script)
      if (status !== 0) {
        console.error(`❌ [FAIL] ${script}`)
        results.push({ script, status: 'FAIL', duration })
        throw new Error('TEST_FAILED')
      }
      console.log(`✅ [PASS] ${script}`)
      results.push({ script, status: 'PASS', duration })
    }

    console.log('\n=== SECURITY-AUTHZ / AUDIT ===')
    for (const script of AUTHZ_SUITE) {
      const { status, duration } = runScript(script)
      if (status !== 0) {
        console.error(`❌ [FAIL] ${script}`)
        results.push({ script, status: 'FAIL', duration })
        throw new Error('TEST_FAILED')
      }
      console.log(`✅ [PASS] ${script}`)
      results.push({ script, status: 'PASS', duration })
    }

  } catch (e: any) {
    printSummary(results)
    process.exit(1)
  } finally {
    if (serverProcess && serverProcess.pid) {
      console.log('\n[SERVER] Stopping Next.js Dev Server...')
      try {
        process.kill(-serverProcess.pid)
      } catch (e) {
        // Ignore if already dead
      }
    }
  }

  printSummary(results)
}

function printSummary(results: { script: string, status: 'PASS' | 'FAIL', duration: number }[]) {
  console.log('\n=== SECURITY REGRESSION SUMMARY ===\n')
  
  console.log(`TYPECHECK                 PASS`)
  
  let passed = 1 // typecheck
  let failed = 0
  
  for (const r of results) {
    let name = ''
    if (r.script.includes('env-validation')) name = 'ENV VALIDATION'
    else if (r.script.includes('login-enumeration')) name = 'LOGIN ENUMERATION'
    else if (r.script.includes('login-ratelimit')) name = 'LOGIN RATE LIMIT'
    else if (r.script.includes('audit-log')) name = 'AUDIT / AUTHZ'
    else name = r.script

    const paddedName = name.padEnd(25, ' ')
    console.log(`${paddedName} ${r.status} (${r.duration}ms)`)
    
    if (r.status === 'PASS') passed++
    else failed++
  }

  console.log(`\nTOTAL                     ${passed} PASS / ${failed} FAIL\n`)
}

run().catch(e => {
  console.error('❌ Unhandled error:', e.message)
  process.exit(1)
})
