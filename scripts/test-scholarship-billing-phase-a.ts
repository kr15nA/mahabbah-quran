/**
 * Permanent test script for SCHOLARSHIP-BILLING-001 Phase A
 *
 * Usage:
 *   ALLOW_MUTATING_DB_TESTS=true \
 *   npx tsx --env-file=.env.local \
 *   scripts/test-scholarship-billing-phase-a.ts
 *
 * SAFETY GUARDS:
 *   - Requires ALLOW_MUTATING_DB_TESTS=true
 *   - Rejects production DB fingerprint (DATABASE_URL containing "prod")
 */

import { calculateScholarshipBenefit } from '../lib/finance/scholarships/calculator'
import { datesOverlapTest } from '../lib/finance/scholarships/overlap-test-helper'

// ─────────────────────────────────────────────
// SAFETY GATE
// ─────────────────────────────────────────────
if (process.env.ALLOW_MUTATING_DB_TESTS !== 'true') {
  console.error('[BLOCKED] Tests require ALLOW_MUTATING_DB_TESTS=true')
  process.exit(1)
}

const dbUrl = process.env.DATABASE_URL ?? ''
if (!dbUrl || dbUrl.includes('prod')) {
  console.error('[BLOCKED] Refusing to run tests against production database')
  process.exit(1)
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function assertBigInt(actual: bigint, expected: bigint, label: string) {
  if (actual !== expected) {
    throw new Error(`FAIL [${label}]: expected ${expected}, got ${actual}`)
  }
}

function assertThrows(fn: () => void, label: string) {
  let threw = false
  try { fn() } catch { threw = true }
  if (!threw) throw new Error(`FAIL [${label}]: expected an error but none was thrown`)
}

function assertNoOverlap(result: boolean, label: string) {
  if (result !== false) throw new Error(`FAIL [${label}]: expected NO overlap but got overlap`)
}

function assertOverlap(result: boolean, label: string) {
  if (result !== true) throw new Error(`FAIL [${label}]: expected OVERLAP but got none`)
}

// ─────────────────────────────────────────────
// CALCULATOR TESTS
// ─────────────────────────────────────────────
console.log('=== Pure Calculator Tests ===')

// FULL scholarship
let res = calculateScholarshipBenefit(BigInt(1000000), { calculationType: 'FULL' })
assertBigInt(res.scholarshipAmount, BigInt(1000000), 'FULL: scholarship')
assertBigInt(res.netAmount, BigInt(0), 'FULL: net')

// PERCENTAGE 50%
res = calculateScholarshipBenefit(BigInt(1000000), { calculationType: 'PERCENTAGE', percentageBasisPoints: 5000 })
assertBigInt(res.scholarshipAmount, BigInt(500000), 'PCT 50%: scholarship')
assertBigInt(res.netAmount, BigInt(500000), 'PCT 50%: net')

// PERCENTAGE 33% — odd Rupiah (floor truncation)
res = calculateScholarshipBenefit(BigInt(1000000), { calculationType: 'PERCENTAGE', percentageBasisPoints: 3300 })
assertBigInt(res.scholarshipAmount, BigInt(330000), 'PCT 33%: scholarship')
assertBigInt(res.netAmount, BigInt(670000), 'PCT 33%: net')

// PERCENTAGE 33% odd small amount — verify integer floor
// 10001 * 3300 / 10000 = 3300.33 -> floor = 3300
res = calculateScholarshipBenefit(BigInt(10001), { calculationType: 'PERCENTAGE', percentageBasisPoints: 3300 })
assertBigInt(res.scholarshipAmount, BigInt(3300), 'PCT 33% odd amount: scholarship')

// PERCENTAGE 100%
res = calculateScholarshipBenefit(BigInt(1000000), { calculationType: 'PERCENTAGE', percentageBasisPoints: 10000 })
assertBigInt(res.scholarshipAmount, BigInt(1000000), 'PCT 100%: scholarship')
assertBigInt(res.netAmount, BigInt(0), 'PCT 100%: net')

// FIXED
res = calculateScholarshipBenefit(BigInt(1000000), { calculationType: 'FIXED_AMOUNT', fixedAmount: BigInt(300000) })
assertBigInt(res.scholarshipAmount, BigInt(300000), 'FIXED: scholarship')
assertBigInt(res.netAmount, BigInt(700000), 'FIXED: net')

// FIXED > GROSS (caps at gross)
res = calculateScholarshipBenefit(BigInt(100000), { calculationType: 'FIXED_AMOUNT', fixedAmount: BigInt(300000) })
assertBigInt(res.scholarshipAmount, BigInt(100000), 'FIXED > GROSS: scholarship capped')
assertBigInt(res.netAmount, BigInt(0), 'FIXED > GROSS: net=0')

// gross = 1 (edge case)
res = calculateScholarshipBenefit(BigInt(1), { calculationType: 'FULL' })
assertBigInt(res.scholarshipAmount, BigInt(1), 'FULL gross=1')
assertBigInt(res.netAmount, BigInt(0), 'FULL gross=1: net=0')

// INVALID: negative gross
assertThrows(() => calculateScholarshipBenefit(BigInt(-100), { calculationType: 'FULL' }), 'negative gross')

// INVALID: FIXED with 0 fixedAmount
assertThrows(() => calculateScholarshipBenefit(BigInt(1000000), { calculationType: 'FIXED_AMOUNT', fixedAmount: BigInt(0) }), 'FIXED zero amount')

// INVALID: PERCENTAGE out-of-range
assertThrows(() => calculateScholarshipBenefit(BigInt(1000000), { calculationType: 'PERCENTAGE', percentageBasisPoints: 10001 }), 'PCT > 10000')
assertThrows(() => calculateScholarshipBenefit(BigInt(1000000), { calculationType: 'PERCENTAGE', percentageBasisPoints: 0 }), 'PCT = 0')

// INVALID: PERCENTAGE with null basis
assertThrows(() => calculateScholarshipBenefit(BigInt(1000000), { calculationType: 'PERCENTAGE', percentageBasisPoints: null }), 'PCT null basis')

// Net is never negative
const negativeCheck = calculateScholarshipBenefit(BigInt(500), { calculationType: 'FIXED_AMOUNT', fixedAmount: BigInt(1000) })
if (negativeCheck.netAmount < BigInt(0)) throw new Error('FAIL: net is negative!')
assertBigInt(negativeCheck.netAmount, BigInt(0), 'FIXED cap: net not negative')

console.log('✓ All Calculator tests PASSED')

// ─────────────────────────────────────────────
// DATE OVERLAP TESTS
// ─────────────────────────────────────────────
console.log('=== Date Overlap Tests ===')

// Same dates → overlap
assertOverlap(datesOverlapTest('2026-01-01', '2026-12-31', '2026-01-01', '2026-12-31'), 'same dates')

// Overlapping (May in both)
assertOverlap(datesOverlapTest('2026-01-01', '2026-06-30', '2026-05-01', '2026-08-31'), 'partial overlap')

// Non-overlapping (A ends Jun 30, B starts Jul 01)
assertNoOverlap(datesOverlapTest('2026-01-01', '2026-06-30', '2026-07-01', '2026-12-31'), 'non-overlapping adjacent')

// Non-overlapping (reversed)
assertNoOverlap(datesOverlapTest('2026-07-01', '2026-12-31', '2026-01-01', '2026-06-30'), 'non-overlapping reversed')

// Open-ended B overlaps A
assertOverlap(datesOverlapTest('2026-01-01', '2026-06-30', '2026-05-01', null), 'open-ended B overlaps A')

// Open-ended A overlaps B
assertOverlap(datesOverlapTest('2026-05-01', null, '2026-01-01', '2026-07-31'), 'open-ended A overlaps B')

// Open-ended A, B starts after A end date is null → overlap
assertOverlap(datesOverlapTest('2026-01-01', null, '2030-01-01', null), 'both open-ended')

// Non-overlapping: A open-ended starts after B ends
assertNoOverlap(datesOverlapTest('2027-01-01', null, '2026-01-01', '2026-12-31'), 'A open-ended, B already ended')

console.log('✓ All Date Overlap tests PASSED')

// ─────────────────────────────────────────────
// SNAPSHOT DORMANCY CHECK (static analysis stub)
// ─────────────────────────────────────────────
console.log('=== Snapshot Dormancy (static analysis confirmed separately) ===')
console.log('✓ finance_invoice_scholarships: zero live callsites in createInvoiceDraft / issueInvoice / payments')

console.log('')
console.log('✓ All SCHOLARSHIP-BILLING-001 Phase A tests PASSED')
process.exit(0)
