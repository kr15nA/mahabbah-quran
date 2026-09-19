/**
 * Permanent test script for SCHOLARSHIP-BILLING-001 Phase A
 *
 * Usage:
 *   ALLOW_MUTATING_DB_TESTS=true \
 *   npx tsx --env-file=.env.local \
 *   scripts/test-scholarship-billing-phase-a.ts
 */

import { calculateScholarshipBenefit } from '../lib/finance/scholarships/calculator'
import { datesOverlapTest } from '../lib/finance/scholarships/overlap-test-helper'
import { financeDb } from '../lib/finance/tx'
import {
  users, students, academicYears, enrollments,
  financeFunds, financeAccounts, financeFeeTypes, financeCategories,
  scholarshipPrograms, scholarshipProgramFeeTypes,
  studentScholarships, financeInvoices, financeInvoiceScholarships, auditLogs
} from '../drizzle/schema'
import {
  createScholarshipProgram,
  activateScholarshipProgram,
  deactivateScholarshipProgram,
  setScholarshipProgramAccounting
} from '../lib/finance/scholarships/programs'
import {
  assignStudentScholarship,
  revokeStudentScholarship
} from '../lib/finance/scholarships/awards'
import { eq, like, and } from 'drizzle-orm'

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

// ─────────────────────────────────────────────
// PURE LOGIC TESTS
// ─────────────────────────────────────────────
async function runPureLogicTests() {
  console.log('=== Pure Calculator Tests ===')
  let res = calculateScholarshipBenefit(BigInt(1000000), { calculationType: 'FULL' })
  assertBigInt(res.scholarshipAmount, BigInt(1000000), 'FULL: scholarship')

  res = calculateScholarshipBenefit(BigInt(1000000), { calculationType: 'PERCENTAGE', percentageBasisPoints: 5000 })
  assertBigInt(res.scholarshipAmount, BigInt(500000), 'PCT 50%: scholarship')

  res = calculateScholarshipBenefit(BigInt(1000001), { calculationType: 'PERCENTAGE', percentageBasisPoints: 3300 })
  assertBigInt(res.scholarshipAmount, BigInt(330000), 'PCT 33%: odd amount') // Floor checking
  
  console.log('✓ Pure Calculator PASSED')
}

// ─────────────────────────────────────────────
// DB DOMAIN TESTS
// ─────────────────────────────────────────────
async function runDBTests() {
  console.log('=== DB Integration Tests ===')
  
  // Fixture identifiers
  const F_PREFIX = 'TEST_SCHOLAR_'
  const TEST_USER = { fullName: F_PREFIX + 'USER', email: F_PREFIX + 'user@test.com', phone: F_PREFIX + '123', passwordHash: 'hash', role: 'admin' }
  const TEST_STUDENT = { fullName: F_PREFIX + 'STUDENT', status: 'active' as const, enrollmentDate: '2026-07-01' }
  const TEST_STUDENT_DEL = { fullName: F_PREFIX + 'STUDENT_DEL', status: 'active' as const, enrollmentDate: '2026-07-01' }
  const TEST_STUDENT_INACTIVE = { fullName: F_PREFIX + 'STUDENT_INACT', status: 'inactive' as const, enrollmentDate: '2026-07-01' }
  
  try {
    // 1. Clean previous state if stranded
    await cleanupFixtures()
    
    // 2. Insert Base Fixtures
    console.log('[Setup] Inserting fixtures...')
    const [user] = await financeDb.insert(users).values(TEST_USER).returning()
    const [student] = await financeDb.insert(students).values(TEST_STUDENT).returning()
    const [studentDel] = await financeDb.insert(students).values(TEST_STUDENT_DEL).returning()
    const [studentInact] = await financeDb.insert(students).values(TEST_STUDENT_INACTIVE).returning()
    
    // Soft delete studentDel
    await financeDb.update(students).set({ deletedAt: new Date() }).where(eq(students.id, studentDel.id))
    
    const [acadYear] = await financeDb.insert(academicYears).values({ 
      name: F_PREFIX + '2026/2027', startDate: '2026-07-01', endDate: '2027-06-30', isActive: false 
    }).returning()
    const [acadYear2] = await financeDb.insert(academicYears).values({ 
      name: F_PREFIX + '2027/2028', startDate: '2027-07-01', endDate: '2028-06-30', isActive: false 
    }).returning()
    
    // Enroll active student in acadYear1 ONLY
    await financeDb.insert(enrollments).values({
      studentId: student.id, academicYearId: acadYear.id, classId: 1, status: 'active', enrollmentDate: '2026-07-01'
    })
    
    // Financial base fixtures
    const [fund] = await financeDb.insert(financeFunds).values({ code: F_PREFIX + 'F1', name: F_PREFIX + 'FUND', fundType: 'ACADEMIC', restrictionType: 'UNRESTRICTED', isActive: true }).returning()
    const [fundInactive] = await financeDb.insert(financeFunds).values({ code: F_PREFIX + 'F2', name: F_PREFIX + 'FUND_INACT', fundType: 'ACADEMIC', restrictionType: 'UNRESTRICTED', isActive: false }).returning()
    
    const [accExp] = await financeDb.insert(financeAccounts).values({ name: F_PREFIX + 'EXP', accountType: 'EXPENSE', code: F_PREFIX + '9991', isActive: true }).returning()
    const [accInc] = await financeDb.insert(financeAccounts).values({ name: F_PREFIX + 'INC', accountType: 'INCOME', code: F_PREFIX + '9992', isActive: true }).returning()
    const [accInactive] = await financeDb.insert(financeAccounts).values({ name: F_PREFIX + 'EXP_INACT', accountType: 'EXPENSE', code: F_PREFIX + '9993', isActive: false }).returning()
    
    const [cat] = await financeDb.insert(financeCategories).values({ code: F_PREFIX + 'CAT1', name: F_PREFIX + 'CAT', type: 'INCOME', domain: 'ACADEMIC' }).returning()

    const [fee1] = await financeDb.insert(financeFeeTypes).values({ code: F_PREFIX + 'FEE1', name: F_PREFIX + 'FEE1', categoryId: cat.id, receivableAccountId: accInc.id, incomeAccountId: accInc.id }).returning()
    const [fee2] = await financeDb.insert(financeFeeTypes).values({ code: F_PREFIX + 'FEE2', name: F_PREFIX + 'FEE2', categoryId: cat.id, receivableAccountId: accInc.id, incomeAccountId: accInc.id }).returning()

    // --- PROGRAM TESTS ---
    console.log('[Test] Program creation and activation')
    
    // create DRAFT
    const programId = await createScholarshipProgram({
      name: F_PREFIX + 'PROG1', description: 'Test', calculationType: 'PERCENTAGE', percentageBasisPoints: 5000, createdBy: user.id,
      feeTypeIds: [fee1.id]
    })
    let prog = await financeDb.select().from(scholarshipPrograms).where(eq(scholarshipPrograms.id, programId)).then(r => r[0])
    assertStrictEq(prog.status, 'DRAFT', 'Program should be DRAFT on create')
    
    // Audit check
    let audits = await financeDb.select().from(auditLogs).where(and(eq(auditLogs.entityType, 'SCHOLARSHIP_PROGRAM'), eq(auditLogs.entityId, programId)))
    assertStrictEq(audits.length, 1, 'Program create audit')
    assertStrictEq(audits[0].action, 'SCHOLARSHIP_PROGRAM_CREATE', 'Audit action is SCHOLARSHIP_PROGRAM_CREATE')
    
    // activate incomplete (no accounting)
    await assertThrowsAsync(() => activateScholarshipProgram(programId, user.id), 'Activate without accounting')
    
    // activate without fee mapping
    await setScholarshipProgramAccounting(programId, fund.id, accExp.id, user.id)
    await financeDb.delete(scholarshipProgramFeeTypes).where(eq(scholarshipProgramFeeTypes.programId, programId))
    await assertThrowsAsync(() => activateScholarshipProgram(programId, user.id), 'Activate without fee mapping', 'fee types')
    
    // add fee mapping back
    await financeDb.insert(scholarshipProgramFeeTypes).values({ programId, feeTypeId: fee1.id })
    
    // activate invalid fund / account tests
    await setScholarshipProgramAccounting(programId, fundInactive.id, accExp.id, user.id)
    await assertThrowsAsync(() => activateScholarshipProgram(programId, user.id), 'Activate inactive fund')
    
    await setScholarshipProgramAccounting(programId, fund.id, accInactive.id, user.id)
    await assertThrowsAsync(() => activateScholarshipProgram(programId, user.id), 'Activate inactive account')
    
    await setScholarshipProgramAccounting(programId, fund.id, accInc.id, user.id)
    await assertThrowsAsync(() => activateScholarshipProgram(programId, user.id), 'Activate non-EXPENSE account', 'EXPENSE')
    
    // Valid activate
    await setScholarshipProgramAccounting(programId, fund.id, accExp.id, user.id)
    await activateScholarshipProgram(programId, user.id)
    prog = await financeDb.select().from(scholarshipPrograms).where(eq(scholarshipPrograms.id, programId)).then(r => r[0])
    assertStrictEq(prog.status, 'ACTIVE', 'Program should be ACTIVE')
    
    // deactivate
    await deactivateScholarshipProgram(programId, user.id)
    prog = await financeDb.select().from(scholarshipPrograms).where(eq(scholarshipPrograms.id, programId)).then(r => r[0])
    assertStrictEq(prog.status, 'INACTIVE', 'Program should be INACTIVE')
    
    // reactivate for award tests
    await activateScholarshipProgram(programId, user.id)

    // Create a second active program mapped to fee2
    const programId2 = await createScholarshipProgram({ name: F_PREFIX + 'PROG2', description: '', calculationType: 'FULL', createdBy: user.id, feeTypeIds: [fee2.id] })
    await setScholarshipProgramAccounting(programId2, fund.id, accExp.id, user.id)
    await activateScholarshipProgram(programId2, user.id)

    // --- AWARD TESTS ---
    console.log('[Test] Award Assignment')
    
    // student missing (using a fake ID)
    await assertThrowsAsync(() => assignStudentScholarship({
      studentId: 999999, scholarshipProgramId: programId, academicYearId: acadYear.id, startDate: '2026-07-01', assignedBy: user.id
    }), 'Assign to missing student')
    
    // soft-deleted student
    await assertThrowsAsync(() => assignStudentScholarship({
      studentId: studentDel.id, scholarshipProgramId: programId, academicYearId: acadYear.id, startDate: '2026-07-01', assignedBy: user.id
    }), 'Assign to deleted student', 'deleted')
    
    // inactive student
    await assertThrowsAsync(() => assignStudentScholarship({
      studentId: studentInact.id, scholarshipProgramId: programId, academicYearId: acadYear.id, startDate: '2026-07-01', assignedBy: user.id
    }), 'Assign to inactive student', 'inactive')
    
    // no active enrollment for academic year
    await assertThrowsAsync(() => assignStudentScholarship({
      studentId: student.id, scholarshipProgramId: programId, academicYearId: acadYear2.id, startDate: '2026-07-01', assignedBy: user.id
    }), 'Assign without active enrollment', 'active enrollment')
    
    // invalid date (end < start)
    await assertThrowsAsync(() => assignStudentScholarship({
      studentId: student.id, scholarshipProgramId: programId, academicYearId: acadYear.id, startDate: '2026-08-01', endDate: '2026-07-01', assignedBy: user.id
    }), 'Assign end < start', 'on or after')
    
    // Valid assignment
    const award1Id = await assignStudentScholarship({
      studentId: student.id, scholarshipProgramId: programId, academicYearId: acadYear.id, startDate: '2026-07-01', endDate: '2026-09-30', assignedBy: user.id
    })
    assertStrictEq(typeof award1Id, 'number', 'Valid assignment should return ID')
    
    // Audit check
    audits = await financeDb.select().from(auditLogs).where(and(eq(auditLogs.entityType, 'STUDENT_SCHOLARSHIP'), eq(auditLogs.entityId, award1Id)))
    assertStrictEq(audits.length, 1, 'Award assign audit')
    assertStrictEq(audits[0].action, 'STUDENT_SCHOLARSHIP_ASSIGN', 'Audit action matches')
    
    // same-fee overlapping award (Oct 1 inside Sept 30? No, that is adjacent. Wait. Sept 1 to Oct 31 overlaps with Jul 1 to Sep 30)
    await assertThrowsAsync(() => assignStudentScholarship({
      studentId: student.id, scholarshipProgramId: programId, academicYearId: acadYear.id, startDate: '2026-09-01', endDate: '2026-10-31', assignedBy: user.id
    }), 'Overlapping same-fee award', 'Overlapping')
    
    // same-fee non-overlapping award (Oct 1 to Dec 31)
    const award2Id = await assignStudentScholarship({
      studentId: student.id, scholarshipProgramId: programId, academicYearId: acadYear.id, startDate: '2026-10-01', endDate: '2026-12-31', assignedBy: user.id
    })
    assertStrictEq(typeof award2Id, 'number', 'Non-overlapping adjacent assignment')
    
    // different fee (Program 2 uses fee2) overlapping date
    const award3Id = await assignStudentScholarship({
      studentId: student.id, scholarshipProgramId: programId2, academicYearId: acadYear.id, startDate: '2026-08-01', endDate: '2026-08-31', assignedBy: user.id
    })
    assertStrictEq(typeof award3Id, 'number', 'Overlapping different-fee assignment')
    
    // Revoke
    await revokeStudentScholarship(award1Id, user.id)
    const a1 = await financeDb.select().from(studentScholarships).where(eq(studentScholarships.id, award1Id)).then(r => r[0])
    assertStrictEq(a1.status, 'REVOKED', 'Award should be REVOKED')
    
    // --- SNAPSHOT CONSTRAINTS ---
    console.log('[Test] Snapshot Constraints')
    
    // Create an invoice
    const [inv] = await financeDb.insert(financeInvoices).values({
      invoiceNumber: F_PREFIX + 'INV1',
      feeTypeId: fee1.id, studentId: student.id, academicYearId: acadYear.id,
      amount: BigInt(100000), dueDate: '2026-10-20', status: 'DRAFT',
      period: '2026-10'
    }).returning()
    
    // Valid snapshot
    await financeDb.insert(financeInvoiceScholarships).values({
      invoiceId: inv.id, studentScholarshipId: award2Id, scholarshipProgramId: programId,
      calculationTypeSnapshot: 'PERCENTAGE', percentageBasisPointsSnapshot: 5000, fixedAmountSnapshot: null,
      programNameSnapshot: F_PREFIX + 'PROG1_SNAP',
      fundIdSnapshot: fund.id, scholarshipAccountIdSnapshot: accExp.id,
      grossEligibleAmount: BigInt(100000), scholarshipAmount: BigInt(50000)
    })
    
    // Duplicate constraint (invoiceId, studentScholarshipId)
    let duplicateThrew = false
    try {
      await financeDb.insert(financeInvoiceScholarships).values({
        invoiceId: inv.id, studentScholarshipId: award2Id, scholarshipProgramId: programId,
        calculationTypeSnapshot: 'PERCENTAGE', percentageBasisPointsSnapshot: 5000, fixedAmountSnapshot: null,
        programNameSnapshot: F_PREFIX + 'PROG1_SNAP2',
        fundIdSnapshot: fund.id, scholarshipAccountIdSnapshot: accExp.id,
        grossEligibleAmount: BigInt(100000), scholarshipAmount: BigInt(50000)
      })
    } catch (e: any) {
      duplicateThrew = true
      // It should throw a unique constraint violation
    }
    assertStrictEq(duplicateThrew, true, 'Duplicate snapshot constraint')
    
    // Amount constraint (scholarship > gross)
    let amountThrew = false
    try {
      await financeDb.insert(financeInvoiceScholarships).values({
        invoiceId: inv.id, studentScholarshipId: award3Id, scholarshipProgramId: programId2,
        calculationTypeSnapshot: 'FULL', percentageBasisPointsSnapshot: null, fixedAmountSnapshot: null,
        programNameSnapshot: F_PREFIX + 'PROG2_SNAP',
        fundIdSnapshot: fund.id, scholarshipAccountIdSnapshot: accExp.id,
        grossEligibleAmount: BigInt(100000), scholarshipAmount: BigInt(100001) // > gross
      })
    } catch (e: any) {
      amountThrew = true
    }
    assertStrictEq(amountThrew, true, 'Scholarship > gross check constraint')

    console.log('✓ All DB Tests PASSED')
  } finally {
    console.log('[Cleanup] Removing test fixtures...')
    await cleanupFixtures()
  }
}

async function cleanupFixtures() {
  const F_PREFIX = 'TEST_SCHOLAR_'
  
  // Clean up child tables by joining or deleting based on references where we can,
  // or just deleting anything that might be linked to our fixtures.
  // We can fetch the student IDs and delete their enrollments, invoices, etc.
  const testStudents = await financeDb.select({ id: students.id }).from(students).where(like(students.fullName, F_PREFIX + '%'))
  const studentIds = testStudents.map(s => s.id)
  
  if (studentIds.length > 0) {
    for (const id of studentIds) {
      await financeDb.delete(financeInvoiceScholarships).where(like(financeInvoiceScholarships.programNameSnapshot, F_PREFIX + '%'))
      await financeDb.delete(financeInvoices).where(eq(financeInvoices.studentId, id))
      await financeDb.delete(enrollments).where(eq(enrollments.studentId, id))
      await financeDb.delete(studentScholarships).where(eq(studentScholarships.studentId, id))
    }
  }

  const testPrograms = await financeDb.select({ id: scholarshipPrograms.id }).from(scholarshipPrograms).where(like(scholarshipPrograms.name, F_PREFIX + '%'))
  for (const prog of testPrograms) {
    await financeDb.delete(scholarshipProgramFeeTypes).where(eq(scholarshipProgramFeeTypes.programId, prog.id))
    await financeDb.delete(auditLogs).where(and(eq(auditLogs.entityType, 'SCHOLARSHIP_PROGRAM'), eq(auditLogs.entityId, prog.id)))
  }

  // Also clean up audit logs for awards (we might not have the ID handy, but we can delete all TEST_SCHOLAR_USER's actions)
  const testUsers = await financeDb.select({ id: users.id }).from(users).where(like(users.fullName, F_PREFIX + '%'))
  for (const u of testUsers) {
    await financeDb.delete(auditLogs).where(eq(auditLogs.actorUserId, u.id))
  }

  await financeDb.delete(scholarshipPrograms).where(like(scholarshipPrograms.name, F_PREFIX + '%'))
  await financeDb.delete(financeFeeTypes).where(like(financeFeeTypes.code, F_PREFIX + '%'))
  await financeDb.delete(financeCategories).where(like(financeCategories.code, F_PREFIX + '%'))
  await financeDb.delete(financeAccounts).where(like(financeAccounts.code, F_PREFIX + '%'))
  await financeDb.delete(financeFunds).where(like(financeFunds.code, F_PREFIX + '%'))
  await financeDb.delete(students).where(like(students.fullName, F_PREFIX + '%'))
  await financeDb.delete(users).where(like(users.fullName, F_PREFIX + '%'))
  await financeDb.delete(academicYears).where(like(academicYears.name, F_PREFIX + '%'))
}

// ─────────────────────────────────────────────
// EXECUTION
// ─────────────────────────────────────────────
async function main() {
  await runPureLogicTests()
  await runDBTests()
  console.log('ALL PHASE A TESTS PASSED SUCCESSFULLY')
  process.exit(0)
}

main().catch(e => {
  console.error('FATAL TEST ERROR:', e)
  process.exit(1)
})
