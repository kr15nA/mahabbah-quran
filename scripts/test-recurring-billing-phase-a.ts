/**
 * Permanent test script for RECURRING-BILLING-001 Phase A
 *
 * Usage:
 *   ALLOW_MUTATING_DB_TESTS=true \
 *   npx tsx --env-file=.env.local \
 *   scripts/test-recurring-billing-phase-a.ts
 */

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

import { db } from '../lib/db/client'
import { createOrUpdateRecurringConfig, assignStudentFee, voidStudentFeeAssignment } from '../lib/finance/recurring'
import {
  financeRecurringBillingConfigs,
  financeStudentFeeAssignments,
  financeBillingRuns,
  financeBillingRunItems,
  financeFeeTypes,
  students,
  academicYears,
  enrollments,
  financeCategories,
  financeAccounts,
  financeInvoices,
  financeJournalEntries,
  financePayments,
  classes,
  programs,
} from '../drizzle/schema'
import { eq, sql } from 'drizzle-orm'

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
let passed = 0
let failed = 0

function pass(label: string) {
  console.log(`  [PASS] ${label}`)
  passed++
}

function fail(label: string, err?: any) {
  console.error(`  [FAIL] ${label}`, err instanceof Error ? err.message : err ?? '')
  failed++
}

async function assertThrows(fn: () => Promise<any>, label: string) {
  try {
    await fn()
    fail(`${label} — expected error but none thrown`)
  } catch {
    pass(label)
  }
}

// ─────────────────────────────────────────────
// SETUP
// ─────────────────────────────────────────────
async function setup() {
  // financeCategories needs: code, name, type, domain
  const [category] = await db.insert(financeCategories).values({
    code: 'RECTEST_CAT',
    name: 'RecTest Category',
    type: 'INCOME',
    domain: 'ACADEMIC',
  }).returning()

  // financeAccounts: code, name, accountType
  const [assetAcct] = await db.insert(financeAccounts).values({
    code: 'RECTEST_A1',
    name: 'RecTest Asset',
    accountType: 'ASSET',
  }).returning()
  const [incomeAcct] = await db.insert(financeAccounts).values({
    code: 'RECTEST_I1',
    name: 'RecTest Income',
    accountType: 'INCOME',
  }).returning()

  const [feeMonthly] = await db.insert(financeFeeTypes).values({
    code: 'RECTEST_MONTHLY',
    name: 'RecTest Monthly',
    categoryId: category.id,
    receivableAccountId: assetAcct.id,
    incomeAccountId: incomeAcct.id,
    defaultAmount: BigInt(500000),
    billingFrequency: 'MONTHLY',
  }).returning()

  const [feeOneTime] = await db.insert(financeFeeTypes).values({
    code: 'RECTEST_ONETIME',
    name: 'RecTest OneTime',
    categoryId: category.id,
    receivableAccountId: assetAcct.id,
    incomeAccountId: incomeAcct.id,
    defaultAmount: BigInt(200000),
    billingFrequency: 'ONE_TIME',
  }).returning()

  // program + class (needed for enrollments)
  const [program] = await db.insert(programs).values({
    name: 'RecTest Program',
  }).returning()

  const [cls] = await db.insert(classes).values({
    name: 'RecTest Class',
    programId: program.id,
  }).returning()

  // students: fullName, enrollmentDate (required), status
  const [student] = await db.insert(students).values({
    fullName: 'RecTest Student',
    enrollmentDate: '2026-07-01',
    status: 'active',
  }).returning()

  // academicYears: name, startDate, endDate — isActive must be false to avoid unique idx conflict
  const [year] = await db.insert(academicYears).values({
    name: '2026/2027 RecTest',
    startDate: '2026-07-01',
    endDate: '2027-06-30',
    isActive: false,
  }).returning()

  // enrollments: studentId, academicYearId, classId, enrollmentDate, status
  await db.insert(enrollments).values({
    studentId: student.id,
    academicYearId: year.id,
    classId: cls.id,
    enrollmentDate: '2026-07-01',
    status: 'active',
  })

  return { category, assetAcct, incomeAcct, feeMonthly, feeOneTime, student, year, cls, program }
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────
async function runTests() {
  console.log('=== RECURRING BILLING PHASE A TESTS ===\n')

  const initialInvoiceCount = (await db.select({ c: sql<number>`count(*)::int` }).from(financeInvoices))[0].c
  const initialJournalCount = (await db.select({ c: sql<number>`count(*)::int` }).from(financeJournalEntries))[0].c
  const initialPaymentCount = (await db.select({ c: sql<number>`count(*)::int` }).from(financePayments))[0].c

  const { feeMonthly, feeOneTime, student, year, cls } = await setup()

  // ─── RECURRING CONFIG ───
  console.log('--- Recurring Config ---')
  try {
    await createOrUpdateRecurringConfig({ feeTypeId: feeMonthly.id, dueDayOfMonth: 1 })
    pass('due day 1')
  } catch(e) { fail('due day 1', e) }

  try {
    await createOrUpdateRecurringConfig({ feeTypeId: feeMonthly.id, dueDayOfMonth: 28 })
    pass('due day 28')
  } catch(e) { fail('due day 28', e) }

  await assertThrows(
    () => createOrUpdateRecurringConfig({ feeTypeId: feeMonthly.id, dueDayOfMonth: 0 }),
    'due day 0 DENIED'
  )
  await assertThrows(
    () => createOrUpdateRecurringConfig({ feeTypeId: feeMonthly.id, dueDayOfMonth: 29 }),
    'due day 29 DENIED'
  )
  await assertThrows(
    () => createOrUpdateRecurringConfig({ feeTypeId: feeOneTime.id, dueDayOfMonth: 10 }),
    'non-MONTHLY fee type activation DENIED'
  )

  // Verify default active = FALSE
  const [cfg] = await db.select().from(financeRecurringBillingConfigs)
    .where(eq(financeRecurringBillingConfigs.feeTypeId, feeMonthly.id))
  if (cfg && cfg.isActive === false) pass('default active = FALSE')
  else fail('default active = FALSE', `isActive was ${cfg?.isActive}`)

  // ─── ASSIGNMENT ───
  console.log('\n--- Assignment ---')
  let assign1: any
  try {
    assign1 = await assignStudentFee({
      studentId: student.id,
      academicYearId: year.id,
      feeTypeId: feeMonthly.id,
      startPeriod: '2026-07',
      endPeriod: '2026-10',
    })
    pass('valid assignment')
  } catch(e) { fail('valid assignment', e) }

  await assertThrows(
    () => assignStudentFee({ studentId: student.id, academicYearId: year.id, feeTypeId: feeMonthly.id, startPeriod: '2026-7' }),
    'invalid period format DENIED'
  )
  await assertThrows(
    () => assignStudentFee({ studentId: student.id, academicYearId: year.id, feeTypeId: feeMonthly.id, startPeriod: '2026-09', endPeriod: '2026-08' }),
    'end before start DENIED'
  )
  await assertThrows(
    () => assignStudentFee({ studentId: student.id, academicYearId: year.id, feeTypeId: feeMonthly.id, startPeriod: '2025-09' }),
    'outside academic year DENIED'
  )

  // missing enrollment
  const [noEnrollStudent] = await db.insert(students).values({
    fullName: 'RecTest No Enroll',
    enrollmentDate: '2026-07-01',
    status: 'active',
  }).returning()
  await assertThrows(
    () => assignStudentFee({ studentId: noEnrollStudent.id, academicYearId: year.id, feeTypeId: feeMonthly.id, startPeriod: '2026-09' }),
    'missing enrollment DENIED'
  )

  // overlapping VALID
  await assertThrows(
    () => assignStudentFee({ studentId: student.id, academicYearId: year.id, feeTypeId: feeMonthly.id, startPeriod: '2026-09', endPeriod: '2026-12' }),
    'overlapping VALID assignment DENIED'
  )

  // non-overlapping historical
  let assign2: any
  try {
    assign2 = await assignStudentFee({
      studentId: student.id,
      academicYearId: year.id,
      feeTypeId: feeMonthly.id,
      startPeriod: '2026-11',
      endPeriod: '2027-02',
    })
    pass('non-overlapping historical assignment')
  } catch(e) { fail('non-overlapping historical assignment', e) }

  // VOIDED overlap does not block
  try {
    await voidStudentFeeAssignment(assign2!.id)
    const assign3 = await assignStudentFee({
      studentId: student.id,
      academicYearId: year.id,
      feeTypeId: feeMonthly.id,
      startPeriod: '2026-11',
      endPeriod: '2027-02',
    })
    if (assign3.status === 'VALID') pass('VOIDED overlap does not block new VALID')
    else fail('VOIDED overlap does not block new VALID')
  } catch(e) { fail('VOIDED overlap does not block new VALID', e) }

  // Concurrency overlap
  try {
    const [r1, r2] = await Promise.allSettled([
      assignStudentFee({ studentId: student.id, academicYearId: year.id, feeTypeId: feeMonthly.id, startPeriod: '2027-03', endPeriod: '2027-04' }),
      assignStudentFee({ studentId: student.id, academicYearId: year.id, feeTypeId: feeMonthly.id, startPeriod: '2027-04', endPeriod: '2027-05' }),
    ])
    const ok = r1.status === 'fulfilled' ? 1 : 0
    const err = r2.status === 'rejected' ? 1 : 0
    if (ok === 1 && err === 1) pass('concurrent overlapping insert: one succeeds, one denied')
    else fail('concurrent overlapping insert', `fulfilled=${ok} rejected=${err}`)
  } catch(e) { fail('concurrent overlapping insert', e) }

  // ─── BILLING RUN ───
  console.log('\n--- Billing Run ---')
  let run: any
  try {
    ;[run] = await db.insert(financeBillingRuns).values({
      academicYearId: year.id,
      feeTypeId: feeMonthly.id,
      period: '2026-09',
      status: 'PENDING',
    }).returning()
    pass('logical run create')
  } catch(e) { fail('logical run create', e) }

  await assertThrows(
    () => db.insert(financeBillingRuns).values({ academicYearId: year.id, feeTypeId: feeMonthly.id, period: '2026-09', status: 'PENDING' }),
    'duplicate logical run DENIED'
  )

  await assertThrows(
    () => db.insert(financeBillingRuns).values({ academicYearId: year.id, feeTypeId: feeMonthly.id, period: '2026-10', status: 'INVALID_STATUS' as any }),
    'invalid status DENIED'
  )

  await assertThrows(
    () => db.insert(financeBillingRuns).values({ academicYearId: year.id, feeTypeId: feeMonthly.id, period: '2026-11', status: 'PENDING', failedCount: -1 }),
    'negative counter DENIED'
  )

  // ─── RUN ITEM ───
  console.log('\n--- Run Item ---')
  let runItem: any
  try {
    ;[runItem] = await db.insert(financeBillingRunItems).values({
      runId: run!.id,
      studentId: student.id,
      assignmentId: assign1!.id,
      status: 'PENDING',
    }).returning()
    pass('unique run+assignment')
  } catch(e) { fail('unique run+assignment', e) }

  await assertThrows(
    () => db.insert(financeBillingRunItems).values({ runId: run!.id, studentId: student.id, assignmentId: assign1!.id, status: 'PENDING' }),
    'duplicate run+assignment DENIED'
  )

  await assertThrows(
    () => db.insert(financeBillingRunItems).values({ runId: run!.id, studentId: student.id, assignmentId: assign1!.id, status: 'WEIRD_STATE' as any }),
    'invalid run item status DENIED'
  )

  // SKIPPED_EXISTING valid status
  try {
    const freshRun = (await db.insert(financeBillingRuns).values({
      academicYearId: year.id, feeTypeId: feeMonthly.id, period: '2027-01', status: 'PENDING',
    }).returning())[0]
    await db.insert(financeBillingRunItems).values({
      runId: freshRun.id, studentId: student.id, assignmentId: assign1!.id, status: 'SKIPPED_EXISTING',
    })
    pass('SKIPPED_EXISTING status accepted')
  } catch(e) { fail('SKIPPED_EXISTING status accepted', e) }

  // ─── NO BUSINESS SIDE EFFECTS ───
  console.log('\n--- No Business Side Effects ---')
  const finalInvoiceCount = (await db.select({ c: sql<number>`count(*)::int` }).from(financeInvoices))[0].c
  const finalJournalCount = (await db.select({ c: sql<number>`count(*)::int` }).from(financeJournalEntries))[0].c
  const finalPaymentCount = (await db.select({ c: sql<number>`count(*)::int` }).from(financePayments))[0].c

  if (finalInvoiceCount === initialInvoiceCount) pass('invoice created: NO')
  else fail('invoice created: NO', `${finalInvoiceCount - initialInvoiceCount} new invoices found`)

  if (finalJournalCount === initialJournalCount) pass('journal created: NO')
  else fail('journal created: NO', `${finalJournalCount - initialJournalCount} new journal entries found`)

  if (finalPaymentCount === initialPaymentCount) pass('payment created: NO')
  else fail('payment created: NO', `${finalPaymentCount - initialPaymentCount} new payments found`)

  // ─── SUMMARY ───
  console.log(`\n=== SUMMARY: ${passed} PASS / ${failed} FAIL ===`)
  if (failed > 0) process.exit(1)
}

runTests().catch((e) => { console.error('FATAL:', e); process.exit(1) })
