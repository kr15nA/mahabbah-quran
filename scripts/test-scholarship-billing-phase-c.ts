/**
 * Permanent test script for SCHOLARSHIP-BILLING-001 Phase C
 *
 * Usage:
 *   ALLOW_MUTATING_DB_TESTS=true \
 *   npx tsx --env-file=.env.local \
 *   scripts/test-scholarship-billing-phase-c.ts
 */

import { financeDb } from '../lib/finance/tx'
import {
  users, students, academicYears,
  financeFunds, financeAccounts, financeFeeTypes, financeCategories,
  scholarshipPrograms, scholarshipProgramFeeTypes,
  studentScholarships, auditLogs
} from '../drizzle/schema'
import { eq, sql } from 'drizzle-orm'
import { parsePercentageToBasisPoints, parseRupiahToBigInt } from '../lib/finance/utils'
import { activateScholarshipProgram, deactivateScholarshipProgram } from '../lib/finance/scholarships/programs'

// We cannot easily run Next.js Server Actions directly in a CLI script because of headers/cookies
// so we test the core logic, parsers, and validation directly.

if (process.env.ALLOW_MUTATING_DB_TESTS !== 'true') {
  console.error('[BLOCKED] Tests require ALLOW_MUTATING_DB_TESTS=true')
  process.exit(1)
}

const dbUrl = process.env.DATABASE_URL ?? ''
if (!dbUrl || dbUrl.includes('prod')) {
  console.error('[BLOCKED] Refusing to run tests against production database')
  process.exit(1)
}

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
function assertThrows(fn: () => any, label: string, match?: string) {
  let threw = false
  try {
    fn()
  } catch (e: any) {
    threw = true
    if (match && !e.message.includes(match)) {
      throw new Error(`FAIL [${label}]: error did not match '${match}'. Got: ${e.message}`)
    }
  }
  if (!threw) throw new Error(`FAIL [${label}]: expected an error but none was thrown`)
}

async function runTests() {
  console.log('=== Scholarship Phase C Admin Management Tests ===')
  
  const F_PREFIX = 'TEST_SB_PC_'
  const CLEAN_PREFIX = 'TEST_SB_PC_%'

  async function cleanupFixtures() {
    const queries = [
      sql`DELETE FROM audit_logs WHERE actor_user_id IN (SELECT id FROM users WHERE full_name LIKE ${CLEAN_PREFIX})`,
      sql`DELETE FROM enrollments WHERE student_id IN (SELECT id FROM students WHERE full_name LIKE ${CLEAN_PREFIX})`,
      sql`DELETE FROM classes WHERE name LIKE ${CLEAN_PREFIX}`,
      sql`DELETE FROM programs WHERE name LIKE ${CLEAN_PREFIX}`,
      sql`DELETE FROM student_scholarships WHERE id IN (SELECT ss.id FROM student_scholarships ss JOIN scholarship_programs sp ON ss.scholarship_program_id = sp.id WHERE sp.name LIKE ${CLEAN_PREFIX})`,
      sql`DELETE FROM scholarship_program_fee_types WHERE program_id IN (SELECT id FROM scholarship_programs WHERE name LIKE ${CLEAN_PREFIX})`,
      sql`DELETE FROM scholarship_programs WHERE name LIKE ${CLEAN_PREFIX}`,
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
  console.log('[Setup] Cleaned up old fixtures.')

  console.log('\n--- 1. Testing Parsers ---')
  assertStrictEq(parsePercentageToBasisPoints("50"), 5000, "Percentage integer")
  assertStrictEq(parsePercentageToBasisPoints("33.33"), 3333, "Percentage decimal")
  assertThrows(() => parsePercentageToBasisPoints("0"), "Zero percent should throw")
  assertThrows(() => parsePercentageToBasisPoints("100.01"), "Over 100 percent should throw")
  assertThrows(() => parsePercentageToBasisPoints("abc"), "Invalid percent should throw")
  assertThrows(() => parsePercentageToBasisPoints("33.333"), "Too many decimals should throw")
  
  assertBigInt(parseRupiahToBigInt("500000"), BigInt(500000), "Rupiah raw")
  assertBigInt(parseRupiahToBigInt("500.000"), BigInt(500000), "Rupiah with dot")
  assertBigInt(parseRupiahToBigInt("Rp 500.000"), BigInt(500000), "Rupiah with prefix")
  assertThrows(() => parseRupiahToBigInt("0"), "Zero rupiah should throw")
  assertThrows(() => parseRupiahToBigInt("-1000"), "Negative rupiah should throw")
  const { formatRupiah } = await import('../lib/finance/utils')
  
  assertStrictEq(formatRupiah(BigInt(500000)), 'Rp 500.000', "formatRupiah bigint 500k")
  assertStrictEq(formatRupiah(BigInt(1000000)), 'Rp 1.000.000', "formatRupiah bigint 1m")
  assertStrictEq(formatRupiah(BigInt("9007199254740993")), 'Rp 9.007.199.254.740.993', "formatRupiah bigint beyond MAX_SAFE_INTEGER")
  assertStrictEq(formatRupiah("500000"), 'Rp 500.000', "formatRupiah string 500k")
  assertStrictEq(formatRupiah(null), '-', "formatRupiah null fallback")
  console.log('\n--- 2. Setting up DB Fixtures ---')
  
  const [admin] = await financeDb.insert(users).values({
    fullName: F_PREFIX + 'Admin', email: F_PREFIX + 'admin@t.com', phone: F_PREFIX + '1', passwordHash: 'hash', role: 'admin'
  }).returning()

  const [fundUnrestricted] = await financeDb.insert(financeFunds).values({
    name: F_PREFIX + 'Unrestricted Fund', isActive: true, restrictionType: 'UNRESTRICTED', code: F_PREFIX + 'UNR', fundType: 'OPERATIONAL'
  }).returning()

  const [fundRestricted] = await financeDb.insert(financeFunds).values({
    name: F_PREFIX + 'Restricted Fund', isActive: true, restrictionType: 'RESTRICTED', code: F_PREFIX + 'RST', fundType: 'OPERATIONAL'
  }).returning()

  const [expenseAccount] = await financeDb.insert(financeAccounts).values({
    name: F_PREFIX + 'Beasiswa Expense', accountType: 'EXPENSE', isActive: true, code: F_PREFIX + 'EXP'
  }).returning()

  const [assetAccount] = await financeDb.insert(financeAccounts).values({
    name: F_PREFIX + 'Bank Asset', accountType: 'ASSET', isActive: true, code: F_PREFIX + 'AST'
  }).returning()

  const [category] = await financeDb.insert(financeCategories).values({
    name: F_PREFIX + 'Test Category', code: F_PREFIX + 'CAT', type: 'INCOME', domain: 'ACADEMIC'
  }).returning()

  const [feeSPP] = await financeDb.insert(financeFeeTypes).values({
    name: F_PREFIX + 'SPP', isActive: true, defaultAmount: BigInt(100000), defaultFundId: fundUnrestricted.id, code: F_PREFIX + 'F_SPP', categoryId: category.id, receivableAccountId: assetAccount.id, incomeAccountId: expenseAccount.id
  }).returning()

  const [feeAsrama] = await financeDb.insert(financeFeeTypes).values({
    name: F_PREFIX + 'Asrama', isActive: true, defaultAmount: BigInt(500000), defaultFundId: fundRestricted.id, code: F_PREFIX + 'F_ASR', categoryId: category.id, receivableAccountId: assetAccount.id, incomeAccountId: expenseAccount.id
  }).returning()

  const [feeKitab] = await financeDb.insert(financeFeeTypes).values({
    name: F_PREFIX + 'Kitab', isActive: true, defaultAmount: BigInt(50000), defaultFundId: fundUnrestricted.id, code: F_PREFIX + 'F_KTB', categoryId: category.id, receivableAccountId: assetAccount.id, incomeAccountId: expenseAccount.id
  }).returning()

  const activeAyResult = await financeDb.select().from(academicYears).where(eq(academicYears.isActive, true)).limit(1)
  if (activeAyResult.length === 0) throw new Error('No active academic year found in DB, please seed it first')
  const academicYear = activeAyResult[0]

  const [student] = await financeDb.insert(students).values({
    fullName: F_PREFIX + 'Student 1', status: 'active', gender: 'male', enrollmentDate: '2026-07-01'
  }).returning()

  const { classes, enrollments, programs } = await import('../drizzle/schema')

  const [program] = await financeDb.insert(programs).values({
    name: F_PREFIX + 'Tahfizh', isActive: true
  }).returning()

  const [classObj] = await financeDb.insert(classes).values({
    name: F_PREFIX + 'Class A', programId: program.id, isActive: true
  }).returning()

  await financeDb.insert(enrollments).values({
    studentId: student.id, classId: classObj.id, academicYearId: academicYear.id, enrollmentDate: '2026-07-01', status: 'active'
  })

  console.log('\n--- 3. Testing Program Creation & Validation ---')
  // We mock requirePermission for the server actions by just overriding it globally
  // Wait, Next.js server actions in a node script will throw if they use headers/cookies.
  // We'll test the activation rules through the domain service directly which has all the guards.
  
  const { createScholarshipProgram, setScholarshipProgramAccounting } = await import('../lib/finance/scholarships/programs')
  
  // Create multi-fund program (SPP + Asrama)
  const progMultiId = await createScholarshipProgram({
    name: F_PREFIX + 'Multi Fund', calculationType: 'PERCENTAGE', percentageBasisPoints: 5000,
    feeTypeIds: [feeSPP.id, feeAsrama.id], createdBy: admin.id
  })
  // Setup accounting pointing to unrestricted fund (but Asrama fee is restricted)
  await setScholarshipProgramAccounting(progMultiId, fundUnrestricted.id, expenseAccount.id, admin.id)
  
  // Phase B billing engine constraint: All fee types must share the same default fund, which must be unrestricted, and match the program fund.
  await assertThrowsAsync(() => activateScholarshipProgram(progMultiId, admin.id), "Multi-fund activation", "All selected fee types must share the same defaultFundId")

  // Create restricted fund program (Asrama only)
  const progRestrictedId = await createScholarshipProgram({
    name: F_PREFIX + 'Restricted Fund Program', calculationType: 'PERCENTAGE', percentageBasisPoints: 5000,
    feeTypeIds: [feeAsrama.id], createdBy: admin.id
  })
  await setScholarshipProgramAccounting(progRestrictedId, fundRestricted.id, expenseAccount.id, admin.id)
  await assertThrowsAsync(() => activateScholarshipProgram(progRestrictedId, admin.id), "Restricted fund activation", "Scholarship fund must be UNRESTRICTED")

  // Create wrong expense account program (ASSET account instead of EXPENSE)
  const progAssetId = await createScholarshipProgram({
    name: F_PREFIX + 'Asset Account Program', calculationType: 'PERCENTAGE', percentageBasisPoints: 5000,
    feeTypeIds: [feeSPP.id], createdBy: admin.id
  })
  await setScholarshipProgramAccounting(progAssetId, fundUnrestricted.id, assetAccount.id, admin.id)
  await assertThrowsAsync(() => activateScholarshipProgram(progAssetId, admin.id), "Wrong account type", "Scholarship account must be of type EXPENSE")

  // Create VALID program (SPP + Kitab, both are unrestricted fund)
  const progValidId = await createScholarshipProgram({
    name: F_PREFIX + 'Valid Program', calculationType: 'PERCENTAGE', percentageBasisPoints: 10000,
    feeTypeIds: [feeSPP.id, feeKitab.id], createdBy: admin.id
  })
  await setScholarshipProgramAccounting(progValidId, fundUnrestricted.id, expenseAccount.id, admin.id)
  await activateScholarshipProgram(progValidId, admin.id) // Should PASS
  console.log('Valid activation passed.')

  console.log('\n--- 4. Testing Award Validation & Overlap Prevention ---')
  const { assignStudentScholarship, updateStudentScholarship, revokeStudentScholarship } = await import('../lib/finance/scholarships/awards')

  const award1Id = await assignStudentScholarship({
    studentId: student.id,
    scholarshipProgramId: progValidId,
    academicYearId: academicYear.id,
    startDate: '2026-07-01',
    endDate: '2026-12-01',
    assignedBy: admin.id,
    notes: 'Semester 1'
  })
  console.log('Assign Award passed.')

  // Try to assign overlapping award (same program, overlapping period)
  await assertThrowsAsync(() => assignStudentScholarship({
    studentId: student.id,
    scholarshipProgramId: progValidId,
    academicYearId: academicYear.id,
    startDate: '2026-11-01',
    endDate: '2027-02-01',
    assignedBy: admin.id
  }), "Award overlap", "Overlapping scholarship award denied")

  // Valid update (extend period)
  await updateStudentScholarship(award1Id, {
    startDate: '2026-07-01',
    endDate: '2026-11-01', // Shrink
    notes: 'Shrunk to Nov'
  }, admin.id)
  console.log('Update Award period passed.')

  // Create another non-overlapping award
  const award2Id = await assignStudentScholarship({
    studentId: student.id,
    scholarshipProgramId: progValidId,
    academicYearId: academicYear.id,
    startDate: '2026-12-01', // Non-overlapping now since award1 ends in Nov
    endDate: '2027-06-01',
    assignedBy: admin.id
  })

  // Try to update award2 to overlap with award1
  await assertThrowsAsync(() => updateStudentScholarship(award2Id, {
    startDate: '2026-10-01', // This overlaps with award1 (July-Nov)
    endDate: '2027-06-01',
  }, admin.id), "Update causing overlap", "Overlapping scholarship award denied")

  // Revoke award
  await revokeStudentScholarship(award2Id, admin.id)
  console.log('Revoke passed.')

  console.log('\n--- 5. Testing Read Model Stability ---')
  const { getScholarshipPrograms, getScholarshipAwards } = await import('../lib/finance/scholarships/queries')
  
  // Test program query (which previously crashed due to invalid column in subquery)
  const programsResult = await getScholarshipPrograms({ page: 1, limit: 10, search: F_PREFIX })
  if (!programsResult.data.some((p: any) => p.name.includes(F_PREFIX))) {
    throw new Error('FAIL: Read model did not return inserted test programs.')
  }
  
  // Test award query
  const awardsResult = await getScholarshipAwards({ page: 1, limit: 10, search: F_PREFIX })
  if (awardsResult.data.length === 0) {
    throw new Error('FAIL: Read model did not return inserted test awards.')
  }
  console.log('Read models passed (no SQL exceptions).')

  await cleanupFixtures()
  console.log('--- ALL PASS ---')
}

runTests().catch(e => {
  console.error(e)
  process.exit(1)
})
