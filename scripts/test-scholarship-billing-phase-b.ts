/**
 * Permanent test script for SCHOLARSHIP-BILLING-001 Phase B
 *
 * Usage:
 *   ALLOW_MUTATING_DB_TESTS=true \
 *   npx tsx --env-file=.env.local \
 *   scripts/test-scholarship-billing-phase-b.ts
 */

import { assertSafeMutatingDbTestEnvironment } from './lib/assert-safe-mutating-db-test'
assertSafeMutatingDbTestEnvironment()


import { financeDb } from '../lib/finance/tx'
import {
  users, students, academicYears, enrollments,
  financeFunds, financeAccounts, financeFeeTypes, financeCategories,
  scholarshipPrograms, scholarshipProgramFeeTypes,
  studentScholarships, financeInvoices, financeInvoiceScholarships, auditLogs,
  financePayments, financePaymentAllocations, financeJournalEntries, financeJournalLines,
  programs, classes
} from '../drizzle/schema'
import { createScholarshipProgram, updateScholarshipProgramDraft, activateScholarshipProgram } from '../lib/finance/scholarships/programs'
import { assignStudentScholarship } from '../lib/finance/scholarships/awards'
import { createInvoiceDraft, issueInvoice, cancelInvoice, recalculateDraftScholarship, getInvoiceDetails } from '../lib/finance/invoices'
import { createPayment, allocatePayment, confirmPayment } from '../lib/finance/payment'
import { eq, like, and, sql } from 'drizzle-orm'



function assertBigInt(actual: bigint, expected: bigint, label: string) {
  if (actual !== expected) throw new Error(`FAIL [${label}]: expected ${expected}, got ${actual}`)
}
function assertStrictEq(actual: any, expected: any, label: string) {
  if (actual !== expected) throw new Error(`FAIL [${label}]: expected ${expected}, got ${actual}`)
}
async function assertThrowsAsync(fn: () => Promise<any>, label: string, match?: string) {
  let threw = false
  try {
    await fn()
  } catch (e: any) {
    threw = true
    if (match && !e.message.includes(match)) {
      throw new Error(`FAIL [${label}]: error did not match '${match}'. Got: ${e.message}`)
    }
  }
  if (!threw) throw new Error(`FAIL [${label}]: expected an error but none was thrown`)
}

async function runTests() {
  console.log('=== Scholarship Phase B Live Billing Integration Tests ===')
  
  const F_PREFIX = 'TEST_SB_PB_'
  const CLEAN_PREFIX = 'TEST_SB_PB_%'

  async function cleanupFixtures() {
    const queries = [
      sql`DELETE FROM enrollments WHERE student_id IN (SELECT id FROM students WHERE full_name LIKE ${CLEAN_PREFIX})`,
      sql`DELETE FROM classes WHERE name LIKE ${CLEAN_PREFIX}`,
      sql`DELETE FROM programs WHERE name LIKE ${CLEAN_PREFIX}`,
      sql`DELETE FROM audit_logs WHERE actor_user_id IN (SELECT id FROM users WHERE full_name LIKE ${CLEAN_PREFIX})`,
      sql`DELETE FROM finance_journal_lines WHERE account_id IN (SELECT id FROM finance_accounts WHERE name LIKE ${CLEAN_PREFIX})`,
      sql`DELETE FROM finance_journal_lines WHERE journal_entry_id IN (SELECT id FROM finance_journal_entries WHERE source_type = 'INVOICE' AND source_id IN (SELECT id FROM finance_invoices WHERE student_id IN (SELECT id FROM students WHERE full_name LIKE ${CLEAN_PREFIX})))`,
      sql`DELETE FROM finance_journal_entries WHERE source_type = 'INVOICE' AND source_id IN (SELECT id FROM finance_invoices WHERE student_id IN (SELECT id FROM students WHERE full_name LIKE ${CLEAN_PREFIX}))`,
      sql`DELETE FROM finance_journal_lines WHERE journal_entry_id IN (SELECT id FROM finance_journal_entries WHERE source_type = 'PAYMENT' AND source_id IN (SELECT id FROM finance_payments WHERE student_id IN (SELECT id FROM students WHERE full_name LIKE ${CLEAN_PREFIX})))`,
      sql`DELETE FROM finance_journal_entries WHERE source_type = 'PAYMENT' AND source_id IN (SELECT id FROM finance_payments WHERE student_id IN (SELECT id FROM students WHERE full_name LIKE ${CLEAN_PREFIX}))`,
      sql`DELETE FROM finance_journal_entries WHERE id NOT IN (SELECT journal_entry_id FROM finance_journal_lines)`,
      sql`DELETE FROM finance_payment_allocations WHERE payment_id IN (SELECT id FROM finance_payments WHERE student_id IN (SELECT id FROM students WHERE full_name LIKE ${CLEAN_PREFIX}))`,
      sql`DELETE FROM finance_payments WHERE student_id IN (SELECT id FROM students WHERE full_name LIKE ${CLEAN_PREFIX})`,
      sql`DELETE FROM finance_invoice_scholarships WHERE invoice_id IN (SELECT id FROM finance_invoices WHERE student_id IN (SELECT id FROM students WHERE full_name LIKE ${CLEAN_PREFIX}))`,
      sql`DELETE FROM audit_logs WHERE entity_type = 'INVOICE' AND entity_id IN (SELECT id FROM finance_invoices WHERE student_id IN (SELECT id FROM students WHERE full_name LIKE ${CLEAN_PREFIX}))`,
      sql`DELETE FROM finance_invoices WHERE student_id IN (SELECT id FROM students WHERE full_name LIKE ${CLEAN_PREFIX})`,
      sql`DELETE FROM student_scholarships WHERE id IN (SELECT ss.id FROM student_scholarships ss JOIN scholarship_programs sp ON ss.scholarship_program_id = sp.id WHERE sp.name LIKE ${CLEAN_PREFIX})`,
      sql`DELETE FROM scholarship_program_fee_types WHERE program_id IN (SELECT id FROM scholarship_programs WHERE name LIKE ${CLEAN_PREFIX})`,
      sql`DELETE FROM scholarship_programs WHERE name LIKE ${CLEAN_PREFIX}`,
      sql`DELETE FROM enrollments WHERE student_id IN (SELECT id FROM students WHERE full_name LIKE ${CLEAN_PREFIX})`,
      sql`DELETE FROM students WHERE full_name LIKE ${CLEAN_PREFIX}`,
      sql`DELETE FROM users WHERE full_name LIKE ${CLEAN_PREFIX}`,
      sql`DELETE FROM academic_years WHERE name LIKE ${CLEAN_PREFIX}`,
      sql`DELETE FROM finance_fee_types WHERE name LIKE ${CLEAN_PREFIX}`,
      sql`DELETE FROM finance_categories WHERE name LIKE ${CLEAN_PREFIX}`,
      sql`DELETE FROM finance_accounts WHERE name LIKE ${CLEAN_PREFIX}`,
      sql`DELETE FROM finance_funds WHERE name LIKE ${CLEAN_PREFIX}`
    ]
    for (const q of queries) {
      await financeDb.execute(q)
    }
  }

  await cleanupFixtures()
  
  console.log('[Setup] Inserting fixtures...')
  
  const [admin] = await financeDb.insert(users).values({
    fullName: F_PREFIX + 'Admin', email: F_PREFIX + 'admin@t.com', phone: F_PREFIX + '1', passwordHash: 'hash', role: 'admin'
  }).returning()

  const [student1] = await financeDb.insert(students).values({
    fullName: F_PREFIX + 'Student 1',
    gender: 'l',
    enrollmentDate: '2026-07-01'
  }).returning()

  const [student2] = await financeDb.insert(students).values({
    fullName: F_PREFIX + 'Student 2',
    gender: 'p',
    enrollmentDate: '2026-07-01'
  }).returning()

  const [program1] = await financeDb.insert(programs).values({
    name: F_PREFIX + 'Prog Akademik',
    description: '',
    isActive: true
  }).returning()

  const [class1] = await financeDb.insert(classes).values({
    name: F_PREFIX + 'Class A',
    programId: program1.id,
    isActive: true,
  }).returning()

  const [acadYear] = await financeDb.insert(academicYears).values({
    name: F_PREFIX + 'AY', startDate: '2026-07-01', endDate: '2027-06-30', isActive: false
  }).returning()

  await financeDb.insert(enrollments).values({
    studentId: student1.id,
    academicYearId: acadYear.id,
    classId: class1.id,
    status: 'active'
  })
  await financeDb.insert(enrollments).values({
    studentId: student2.id,
    academicYearId: acadYear.id,
    classId: class1.id,
    status: 'active'
  })

  const [fundUnrestricted] = await financeDb.insert(financeFunds).values({
    code: F_PREFIX + 'F1', name: F_PREFIX + 'General', fundType: 'UNRESTRICTED', restrictionType: 'UNRESTRICTED', isActive: true
  }).returning()

  const [fundRestricted] = await financeDb.insert(financeFunds).values({
    code: F_PREFIX + 'F2', name: F_PREFIX + 'Restricted', fundType: 'RESTRICTED', restrictionType: 'RESTRICTED', isActive: true
  }).returning()

  const [accAR] = await financeDb.insert(financeAccounts).values({
    code: F_PREFIX + 'AR', name: F_PREFIX + 'AR', accountType: 'ASSET', assetSubtype: 'RECEIVABLE', isActive: true
  }).returning()

  const [accIncome] = await financeDb.insert(financeAccounts).values({
    code: F_PREFIX + 'INC', name: F_PREFIX + 'Income', accountType: 'INCOME', isActive: true
  }).returning()

  const [accExpense] = await financeDb.insert(financeAccounts).values({
    code: F_PREFIX + 'EXP', name: F_PREFIX + 'Scholarship Expense', accountType: 'EXPENSE', isActive: true
  }).returning()

  const [accCash] = await financeDb.insert(financeAccounts).values({
    code: F_PREFIX + 'CSH', name: F_PREFIX + 'Cash', accountType: 'ASSET', assetSubtype: 'CASH', isActive: true
  }).returning()

  const [catIncome] = await financeDb.insert(financeCategories).values({
    code: F_PREFIX + 'INC_CAT', name: F_PREFIX + 'IncomeCat', type: 'INCOME', domain: 'EDUCATION'
  }).returning()

  const [feeType] = await financeDb.insert(financeFeeTypes).values({
    code: F_PREFIX + 'FEE',
    name: F_PREFIX + 'SPP',
    billingFrequency: 'MONTHLY',
    defaultAmount: BigInt(1000000),
    receivableAccountId: accAR.id,
    incomeAccountId: accIncome.id,
    categoryId: catIncome.id,
    defaultFundId: fundUnrestricted.id,
    isActive: true
  }).returning()

  console.log('[Test 1] No Scholarship - Full Payment')
  let inv1 = await createInvoiceDraft({
    studentId: student1.id,
    academicYearId: acadYear.id,
    feeTypeId: feeType.id,
    period: '2026-07',
    amount: BigInt(1000000),
    dueDate: '2026-07-10',
    createdBy: admin.id
  })
  
  await issueInvoice(inv1, admin.id)
  let d1 = await getInvoiceDetails(inv1)
  assertBigInt(d1!.amount, BigInt(1000000), 'inv1 gross')
  assertBigInt(d1!.scholarshipAmount, BigInt(0), 'inv1 scholarship')
  assertBigInt(d1!.netPayable, BigInt(1000000), 'inv1 net')
  assertStrictEq(d1!.status, 'ISSUED', 'inv1 status')

  let p1 = await createPayment({
    studentId: student1.id,
    amount: BigInt(1000000),
    paymentDate: '2026-07-05',
    paymentMethod: 'CASH',
    destinationAccountId: accCash.id,
    receivedBy: admin.id
  })
  await allocatePayment(p1, [{ invoiceId: inv1, amount: BigInt(1000000) }], admin.id)
  await confirmPayment(p1, admin.id)

  d1 = await getInvoiceDetails(inv1)
  assertStrictEq(d1!.status, 'PAID', 'inv1 PAID status')
  assertBigInt(d1!.outstandingAmount, BigInt(0), 'inv1 out 0')

  console.log('[Test 2] Fixed Scholarship - Overpayment Guard')
  const prog1Id = await createScholarshipProgram({
    name: F_PREFIX + 'Prog 1 (Fixed 400k)',
    description: '',
    calculationType: 'FIXED_AMOUNT',
    fixedAmount: BigInt(400000),
    percentageBasisPoints: undefined,
    feeTypeIds: [feeType.id],
    createdBy: admin.id
  })
  await updateScholarshipProgramDraft(prog1Id, {
    fundingFundId: fundUnrestricted.id,
    scholarshipAccountId: accExpense.id,
  }, admin.id)
  await activateScholarshipProgram(prog1Id, admin.id)
  
  await assignStudentScholarship({
    studentId: student1.id,
    scholarshipProgramId: prog1Id,
    academicYearId: acadYear.id,
    startDate: '2026-08-01',
    endDate: '2026-12-31',
    notes: '',
    assignedBy: admin.id
  })

  let inv2 = await createInvoiceDraft({
    studentId: student1.id,
    academicYearId: acadYear.id,
    feeTypeId: feeType.id,
    period: '2026-08',
    amount: BigInt(1000000),
    dueDate: '2026-08-10',
    createdBy: admin.id
  })

  await issueInvoice(inv2, admin.id)
  let d2 = await getInvoiceDetails(inv2)
  assertBigInt(d2!.netPayable, BigInt(600000), 'inv2 net 600k')

  // Attempt to allocate full 1,000,000 should fail guard
  let p2 = await createPayment({
    studentId: student1.id,
    amount: BigInt(1000000),
    paymentDate: '2026-08-05',
    paymentMethod: 'CASH',
    destinationAccountId: accCash.id,
    receivedBy: admin.id
  })
  await assertThrowsAsync(
    () => allocatePayment(p2, [{ invoiceId: inv2, amount: BigInt(1000000) }], admin.id),
    'alloc overpayment', 'Overpayment'
  )

  await allocatePayment(p2, [{ invoiceId: inv2, amount: BigInt(600000) }], admin.id)
  // Attempt to confirm payment that is not fully allocated should fail (payment guard)
  await assertThrowsAsync(
    () => confirmPayment(p2, admin.id),
    'confirm partial alloc', 'Full allocation is required'
  )
  
  // Create correct payment
  let p2b = await createPayment({
    studentId: student1.id,
    amount: BigInt(600000),
    paymentDate: '2026-08-05',
    paymentMethod: 'CASH',
    destinationAccountId: accCash.id,
    receivedBy: admin.id
  })
  await allocatePayment(p2b, [{ invoiceId: inv2, amount: BigInt(600000) }], admin.id)
  await confirmPayment(p2b, admin.id)

  d2 = await getInvoiceDetails(inv2)
  assertStrictEq(d2!.status, 'PAID', 'inv2 PAID status')
  assertBigInt(d2!.outstandingAmount, BigInt(0), 'inv2 out 0')

  console.log('[Test 3] 100% Scholarship - Auto PAID')
  const progFullId = await createScholarshipProgram({
    name: F_PREFIX + 'Prog Full (100%)',
    description: '',
    calculationType: 'FULL',
    fixedAmount: undefined,
    percentageBasisPoints: undefined,
    feeTypeIds: [feeType.id],
    createdBy: admin.id
  })
  await updateScholarshipProgramDraft(progFullId, {
    fundingFundId: fundUnrestricted.id,
    scholarshipAccountId: accExpense.id,
  }, admin.id)
  await activateScholarshipProgram(progFullId, admin.id)
  
  await assignStudentScholarship({
    studentId: student2.id,
    scholarshipProgramId: progFullId,
    academicYearId: acadYear.id,
    startDate: '2026-09-01',
    endDate: '2026-09-30', // only September
    notes: '',
    assignedBy: admin.id
  })

  let inv3 = await createInvoiceDraft({
    studentId: student2.id,
    academicYearId: acadYear.id,
    feeTypeId: feeType.id,
    period: '2026-09',
    amount: BigInt(1000000),
    dueDate: '2026-09-10',
    createdBy: admin.id
  })

  await issueInvoice(inv3, admin.id)
  let d3 = await getInvoiceDetails(inv3)
  
  assertBigInt(d3!.netPayable, BigInt(0), 'inv3 net 0')
  assertStrictEq(d3!.status, 'PAID', 'inv3 status auto PAID')

  // Verify journal for inv3
  const [j3] = await financeDb.select().from(financeJournalEntries).where(eq(financeJournalEntries.sourceId, inv3))
  const l3 = await financeDb.select().from(financeJournalLines).where(eq(financeJournalLines.journalEntryId, j3.id))
  // Should have NO receivable line, only Expense (Dr) and Income (Cr)
  assertStrictEq(l3.length, 2, 'inv3 100% journal lines')
  
  const drExp = l3.find(x => x.accountId === accExpense.id)
  const crInc = l3.find(x => x.accountId === accIncome.id)
  assertBigInt(drExp!.debit, BigInt(1000000), 'dr exp')
  assertBigInt(crInc!.credit, BigInt(1000000), 'cr inc')

  console.log('[Test 4] Recalculate Draft')
  let inv4 = await createInvoiceDraft({
    studentId: student1.id,
    academicYearId: acadYear.id,
    feeTypeId: feeType.id,
    period: '2026-10', // currently falls under prog1 (fixed 400k) because it goes until Dec 31, but progFull was only sept
    amount: BigInt(1000000),
    dueDate: '2026-10-10',
    createdBy: admin.id
  })
  
  let d4 = await getInvoiceDetails(inv4)
  assertBigInt(d4!.scholarshipAmount, BigInt(400000), 'inv4 draft has 400k')

  // We assign a new active program starting Oct 1st
  const progPctId = await createScholarshipProgram({
    name: F_PREFIX + 'Prog Pct (50%)',
    description: '',
    calculationType: 'PERCENTAGE',
    fixedAmount: undefined,
    percentageBasisPoints: 5000, // 50%
    feeTypeIds: [feeType.id],
    createdBy: admin.id
  })
  await updateScholarshipProgramDraft(progPctId, {
    fundingFundId: fundUnrestricted.id,
    scholarshipAccountId: accExpense.id,
  }, admin.id)
  await activateScholarshipProgram(progPctId, admin.id)
  
  // Revoke old fixed program to make percentage active
  const oldSs = await financeDb.select().from(studentScholarships).where(and(eq(studentScholarships.studentId, student1.id), eq(studentScholarships.scholarshipProgramId, prog1Id)))
  await financeDb.update(studentScholarships).set({ status: 'REVOKED' }).where(eq(studentScholarships.id, oldSs[0].id))

  await assignStudentScholarship({
    studentId: student1.id,
    scholarshipProgramId: progPctId,
    academicYearId: acadYear.id,
    startDate: '2026-10-01',
    endDate: null,
    notes: '',
    assignedBy: admin.id
  })

  // Since it's draft, it didn't change automatically
  d4 = await getInvoiceDetails(inv4)
  assertBigInt(d4!.scholarshipAmount, BigInt(400000), 'inv4 draft STILL has 400k')

  // Recalculate
  await recalculateDraftScholarship(inv4, admin.id)
  
  d4 = await getInvoiceDetails(inv4)
  assertBigInt(d4!.scholarshipAmount, BigInt(500000), 'inv4 draft updated to 500k')

  console.log('[Test 5] Restricted Fund rejection')
  // We'll change progPctId funding fund to restricted fund
  await financeDb.update(scholarshipPrograms).set({ fundingFundId: fundRestricted.id }).where(eq(scholarshipPrograms.id, progPctId))
  
  // Recalculate again
  await recalculateDraftScholarship(inv4, admin.id)
  
  await assertThrowsAsync(
    () => issueInvoice(inv4, admin.id),
    'restricted fund', 'DEFERRED: Cross-fund scholarship not supported in Phase B V1'
  )

  await cleanupFixtures()
  console.log('✓ Phase B Integration Tests PASSED')
}

runTests().catch(e => {
  console.error(e)
  process.exit(1)
})
