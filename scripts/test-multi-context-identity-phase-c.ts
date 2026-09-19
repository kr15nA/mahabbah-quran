import { db } from '@/lib/db/client'
import { getAvailableUserContexts } from '@/lib/identity/contexts'
import { resolveContextLanding } from '@/lib/identity/landing'

async function runTests() {
  console.log('--- TEST MULTI-CONTEXT-IDENTITY PHASE C ---')

  // Test landing resolver
  console.log('\nTesting resolveContextLanding:')
  
  const testCases = [
    {
      name: 'Single context',
      contexts: { admin: false, teacher: true, guardian: false, learner: false },
      pref: null,
      expected: { type: 'direct', context: 'teacher', destination: '/guru/dashboard' }
    },
    {
      name: 'Zero contexts',
      contexts: { admin: false, teacher: false, guardian: false, learner: false },
      pref: null,
      expected: { type: 'forbidden' }
    },
    {
      name: 'Multiple contexts, no preference',
      contexts: { admin: false, teacher: true, guardian: true, learner: true },
      pref: null,
      expected: { type: 'chooser' }
    },
    {
      name: 'Multiple contexts, valid preference',
      contexts: { admin: false, teacher: true, guardian: true, learner: true },
      pref: 'learner',
      expected: { type: 'direct', context: 'learner', destination: '/santri' }
    },
    {
      name: 'Multiple contexts, invalid preference (fallback to chooser)',
      contexts: { admin: false, teacher: true, guardian: true, learner: true },
      pref: 'admin', // not in available
      expected: { type: 'chooser' }
    }
  ]

  for (const tc of testCases) {
    const res = resolveContextLanding({ contexts: tc.contexts as any, preferredContext: tc.pref })
    if (res.type !== tc.expected.type || res.destination !== tc.expected.destination || res.context !== tc.expected.context) {
      console.error(`❌ FAILED: ${tc.name}`)
      console.error(`   Expected:`, tc.expected)
      console.error(`   Got:`, res)
      process.exit(1)
    } else {
      console.log(`✅ PASSED: ${tc.name}`)
    }
  }

  console.log('\nAll pure landing resolver tests passed.')
  process.exit(0)
}

runTests().catch(e => {
  console.error(e)
  process.exit(1)
})
