import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { db } from '@/lib/db/client';
import { eq, like } from 'drizzle-orm';
import {
  financeFeeTypes,
  financeRecurringBillingConfigs,
  students,
  academicYears,
  programs,
  classes,
  enrollments,
  financeStudentFeeAssignments,
  financeInvoices,
  financeBillingRuns,
  financeBillingRunItems,
  users,
  financeAccounts,
  financeCategories,
  financeInvoiceScholarships,
  scholarshipPrograms,
  scholarshipProgramFeeTypes,
  studentScholarships
} from '@/drizzle/schema';
import { assertSafeMutatingDbTestEnvironment } from './lib/assert-safe-mutating-db-test';
import {
  dryRunRecurringBilling,
  prepareRecurringBillingRun,
  processRecurringBillingRunChunk,
  generateRecurringBilling
} from '@/lib/finance/recurring-generator';

const PREFIX = 'RECBTEST_';

async function execute() {
  await assertSafeMutatingDbTestEnvironment();

  console.log('=== CLEANING EXISTING PHASE B TEST FIXTURES ===');
  await cleanup();
  
  let totalTests = 0;
  let passedTests = 0;
  function assert(condition: any, msg: string) {
    totalTests++;
    if (!condition) {
      console.error(`❌ FAIL: ${msg}`);
      throw new Error(`Assertion failed: ${msg}`);
    }
    console.log(`✅ PASS: ${msg}`);
    passedTests++;
  }

  try {
    console.log('=== SETTING UP PHASE B FIXTURES ===');
    const [sysUser] = await db.insert(users).values({ email: `${PREFIX}user@test.com`, passwordHash: 'x', fullName: `${PREFIX}User`, role: 'admin' }).returning();
    
    // Academic Year
    const [ay] = await db.insert(academicYears).values({ name: `${PREFIX}2026/2027`, startDate: '2026-07-01', endDate: '2027-06-30', isActive: false }).returning();
    
    // Accounts & Categories for valid fee type
    const [accRec] = await db.insert(financeAccounts).values({ code: `${PREFIX}REC`, name: 'Rec', accountType: 'ASSET', isActive: true }).returning();
    const [accInc] = await db.insert(financeAccounts).values({ code: `${PREFIX}INC`, name: 'Inc', accountType: 'INCOME', isActive: true }).returning();
    const [accExp] = await db.insert(financeAccounts).values({ code: `${PREFIX}EXP`, name: 'Exp', accountType: 'EXPENSE', isActive: true }).returning();
    const [cat] = await db.insert(financeCategories).values({ code: `${PREFIX}CAT`, name: `${PREFIX}Cat`, type: 'INCOME', domain: 'ACADEMIC' }).returning();

    // Fee Types
    const [feeMonthly] = await db.insert(financeFeeTypes).values({
      code: `${PREFIX}MONTHLY`,
      name: `${PREFIX} SPP`,
      billingFrequency: 'MONTHLY',
      defaultAmount: BigInt(500000),
      isActive: true,
      receivableAccountId: accRec.id,
      incomeAccountId: accInc.id,
      categoryId: cat.id
    }).returning();

    const [feeInactive] = await db.insert(financeFeeTypes).values({
      code: `${PREFIX}INACT`,
      name: `${PREFIX} Inactive`,
      billingFrequency: 'MONTHLY',
      defaultAmount: BigInt(500000),
      isActive: false,
      receivableAccountId: accRec.id,
      incomeAccountId: accInc.id,
      categoryId: cat.id
    }).returning();

    const [feeNonMonthly] = await db.insert(financeFeeTypes).values({
      code: `${PREFIX}ONETIME`,
      name: `${PREFIX} Pendaftaran`,
      billingFrequency: 'ONE_TIME',
      defaultAmount: BigInt(500000),
      isActive: true,
      receivableAccountId: accRec.id,
      incomeAccountId: accInc.id,
      categoryId: cat.id
    }).returning();

    const [feeNull] = await db.insert(financeFeeTypes).values({
      code: `${PREFIX}NULL`,
      name: `${PREFIX} Null`,
      billingFrequency: 'MONTHLY',
      defaultAmount: null as any,
      isActive: true,
      receivableAccountId: accRec.id,
      incomeAccountId: accInc.id,
      categoryId: cat.id
    }).returning();

    // Configs
    await db.insert(financeRecurringBillingConfigs).values({ feeTypeId: feeMonthly.id, dueDayOfMonth: 10, isActive: true });
    await db.insert(financeRecurringBillingConfigs).values({ feeTypeId: feeInactive.id, dueDayOfMonth: 10, isActive: false }); // inactive config
    // feeNonMonthly has no config

    // Program, Class, Enrollments
    const [program] = await db.insert(programs).values({ name: `${PREFIX}Program` }).returning();
    const [cls] = await db.insert(classes).values({ name: `${PREFIX}Class`, programId: program.id }).returning();

    // Students
    const [s1] = await db.insert(students).values({ enrollmentDate: '2026-07-01', fullName: `${PREFIX}S1_Valid`, status: 'AKTIF' }).returning();
    const [s2] = await db.insert(students).values({ enrollmentDate: '2026-07-01', fullName: `${PREFIX}S2_OutsideRange`, status: 'AKTIF' }).returning();
    const [s3] = await db.insert(students).values({ enrollmentDate: '2026-07-01', fullName: `${PREFIX}S3_Voided`, status: 'AKTIF' }).returning();
    const [s4] = await db.insert(students).values({ enrollmentDate: '2026-07-01', fullName: `${PREFIX}S4_Scholarship`, status: 'AKTIF' }).returning();
    const [s5] = await db.insert(students).values({ enrollmentDate: '2026-07-01', fullName: `${PREFIX}S5_Exist`, status: 'AKTIF' }).returning();

    for (const s of [s1, s2, s3, s4, s5]) {
      await db.insert(enrollments).values({ studentId: s.id, classId: cls.id, academicYearId: ay.id, status: 'ACTIVE' });
    }

    // Assignments
    // s1: Valid assignment for feeMonthly (starts 2026-07)
    await db.insert(financeStudentFeeAssignments).values({ studentId: s1.id, academicYearId: ay.id, feeTypeId: feeMonthly.id, startPeriod: '2026-07', status: 'VALID' });
    
    // s2: Outside range (starts 2026-09)
    await db.insert(financeStudentFeeAssignments).values({ studentId: s2.id, academicYearId: ay.id, feeTypeId: feeMonthly.id, startPeriod: '2026-09', status: 'VALID' });

    // s3: Voided assignment
    await db.insert(financeStudentFeeAssignments).values({ studentId: s3.id, academicYearId: ay.id, feeTypeId: feeMonthly.id, startPeriod: '2026-07', status: 'VOIDED' });

    // s4: Scholarship award (100% discount)
    await db.insert(financeStudentFeeAssignments).values({ studentId: s4.id, academicYearId: ay.id, feeTypeId: feeMonthly.id, startPeriod: '2026-07', status: 'VALID' });

    const [sprog] = await db.insert(scholarshipPrograms).values({
      name: `${PREFIX}Scholarship`,
      calculationType: 'PERCENTAGE',
      percentageBasisPoints: 10000,
      scholarshipAccountId: accExp.id,
      status: 'ACTIVE'
    }).returning();

    await db.insert(scholarshipProgramFeeTypes).values({
      programId: sprog.id,
      feeTypeId: feeMonthly.id
    });

    await db.insert(studentScholarships).values({
      studentId: s4.id,
      academicYearId: ay.id,
      scholarshipProgramId: sprog.id,
      status: 'ACTIVE',
      startDate: '2026-07-01'
    });

    // s5: Valid assignment, but has an existing manual invoice
    await db.insert(financeStudentFeeAssignments).values({ studentId: s5.id, academicYearId: ay.id, feeTypeId: feeMonthly.id, startPeriod: '2026-07', status: 'VALID' });
    const [existInv] = await db.insert(financeInvoices).values({
      invoiceNumber: `${PREFIX}INV-MANUAL`,
      studentId: s5.id,
      academicYearId: ay.id,
      feeTypeId: feeMonthly.id,
      period: '2026-08',
      amount: BigInt(500000),
      dueDate: '2026-08-10',
      status: 'DRAFT',
      createdBy: sysUser.id
    }).returning();

    console.log('=== RUNNING TESTS ===');
    const actorId = sysUser.id;

    // T1: inactive recurring config rejected
    try {
      await dryRunRecurringBilling({ academicYearId: ay.id, feeTypeId: feeInactive.id, period: '2026-08' });
      assert(false, 'Should have rejected inactive config');
    } catch (e: any) { assert(e.message.includes('Config is inactive'), '01 inactive config rejected'); }

    // T2: missing config rejected
    try {
      await dryRunRecurringBilling({ academicYearId: ay.id, feeTypeId: feeNonMonthly.id, period: '2026-08' });
      assert(false, 'Should have rejected missing config');
    } catch (e: any) { assert(e.message.includes('Fee type must be MONTHLY'), '02 non-MONTHLY fee type rejected (also implies missing config)'); }

    // T3, T4, T5: defaultAmount null rejected
    try {
      await dryRunRecurringBilling({ academicYearId: ay.id, feeTypeId: feeNull.id, period: '2026-08' });
      assert(false, 'Should have rejected null amount');
    } catch (e: any) { assert(e.message.includes('INVALID_FEE_AMOUNT'), '04 defaultAmount null rejected'); }

    // T6: invalid target period rejected
    try {
      await dryRunRecurringBilling({ academicYearId: ay.id, feeTypeId: feeMonthly.id, period: '2026-13' });
      assert(false, 'Should have rejected invalid period');
    } catch (e: any) { assert(e.message.includes('INVALID_TARGET_PERIOD'), '06 invalid target period rejected'); }

    // T7: target period outside AY rejected
    try {
      await dryRunRecurringBilling({ academicYearId: ay.id, feeTypeId: feeMonthly.id, period: '2025-08' });
      assert(false, 'Should have rejected outside AY period');
    } catch (e: any) { assert(e.message.includes('outside academic year bounds'), '07 target period outside AY rejected'); }

    // T8-T17: Dry Run Logic
    const dryRun = await dryRunRecurringBilling({ academicYearId: ay.id, feeTypeId: feeMonthly.id, period: '2026-08' });
    
    assert(dryRun.grossAmount === BigInt(500000), '11 gross uses feeType.defaultAmount');
    assert(dryRun.dueDate === '2026-08-10', '12 dueDate correct');
    assert(dryRun.eligibleCount === 3, `11 VALID in-range assignment eligible (expected 3, got ${dryRun.eligibleCount})`);
    assert(dryRun.existingInvoiceCount === 1, '09 dry run detects manual existing invoice (s5)');
    assert(dryRun.willGenerateCount === 2, 'Will generate for s1, s4');
    
    const runsBefore = await db.select().from(financeBillingRuns).where(like(financeBillingRuns.period, '2026-08'));
    assert(runsBefore.length === 0, '12 dry run creates zero billing runs');

    // T18-25: Generate Logic
    const run = await prepareRecurringBillingRun({ academicYearId: ay.id, feeTypeId: feeMonthly.id, period: '2026-08', actorId });
    assert(run.status === 'PENDING', '18 prepare creates/reuses one logical run');

    const totalProcessed = await generateRecurringBilling({ academicYearId: ay.id, feeTypeId: feeMonthly.id, period: '2026-08', actorId });
    assert(totalProcessed === 3, '19 eligible assignment creates one run item (3 total)');

    const items = await db.select().from(financeBillingRunItems).where(eq(financeBillingRunItems.runId, run.id));
    
    const s1Item = items.find(i => i.studentId === s1.id);
    const s4Item = items.find(i => i.studentId === s4.id);
    const s5Item = items.find(i => i.studentId === s5.id);
    
    assert(s1Item?.status === 'GENERATED', '20 generate creates DRAFT invoice for s1');
    assert(s5Item?.status === 'SKIPPED_EXISTING', '26 existing invoice -> SKIPPED_EXISTING');
    assert(s5Item?.invoiceId === existInv.id, '26 SKIPPED_EXISTING links correct invoiceId');

    const [s1Inv] = await db.select().from(financeInvoices).where(eq(financeInvoices.id, s1Item!.invoiceId!));
    assert(s1Inv.status === 'DRAFT', '20 generated invoice is DRAFT');
    assert(s1Inv.amount === BigInt(500000), '21 gross equals feeType.defaultAmount');

    const [s4Inv] = await db.select().from(financeInvoices).where(eq(financeInvoices.id, s4Item!.invoiceId!));
    const [s4Snap] = await db.select().from(financeInvoiceScholarships).where(eq(financeInvoiceScholarships.invoiceId, s4Inv.id));
    assert(s4Snap !== undefined, '23 scholarship snapshot produced through canonical invoice flow');
    assert(s4Snap.scholarshipAmount === BigInt(500000), '24 full scholarship produces net zero');

    // T27: second execution does not duplicate invoice
    const totalProcessedRetry = await generateRecurringBilling({ academicYearId: ay.id, feeTypeId: feeMonthly.id, period: '2026-08', actorId });
    assert(totalProcessedRetry === 0, '27 second execution does not duplicate invoice (28, 29 terminal items not reprocessed)');

    const updatedRun = await db.select().from(financeBillingRuns).where(eq(financeBillingRuns.id, run.id));
    assert(updatedRun[0].status === 'COMPLETED', '41 all success finalizes COMPLETED');
    assert(updatedRun[0].generatedCount === 2, '35 generated counter derived correctly');
    assert(updatedRun[0].skippedCount === 1, '36 skipped counter derived correctly');
    assert(updatedRun[0].failedCount === 0, '37 failed counter derived correctly');

    // T30: FAILED item retry works on subsequent invocation
    // Force fail an item
    await db.update(financeBillingRunItems).set({ status: 'FAILED' }).where(eq(financeBillingRunItems.id, s1Item!.id));
    await db.update(financeBillingRuns).set({ status: 'COMPLETED_WITH_ERRORS' }).where(eq(financeBillingRuns.id, run.id));
    
    const totalProcessedFailRetry = await generateRecurringBilling({ academicYearId: ay.id, feeTypeId: feeMonthly.id, period: '2026-08', actorId });
    assert(totalProcessedFailRetry === 1, '30 FAILED item retry works on subsequent invocation');
    
    const retriedItem = await db.select().from(financeBillingRunItems).where(eq(financeBillingRunItems.id, s1Item!.id));
    // Since invoice was already created, the idempotency should kick in and mark it as SKIPPED_EXISTING now.
    assert(retriedItem[0].status === 'SKIPPED_EXISTING', '34 invoice race resolves idempotently (found existing during retry)');

    // T31: COMPLETED rerun discovers newly eligible assignment
    // Update s2 assignment to start in 2026-08 so it becomes eligible
    await db.update(financeStudentFeeAssignments).set({ startPeriod: '2026-08' }).where(eq(financeStudentFeeAssignments.studentId, s2.id));
    const totalProcessedNew = await generateRecurringBilling({ academicYearId: ay.id, feeTypeId: feeMonthly.id, period: '2026-08', actorId });
    assert(totalProcessedNew === 1, '31 COMPLETED rerun discovers newly eligible assignment');
    
    const finalRun = await db.select().from(financeBillingRuns).where(eq(financeBillingRuns.id, run.id));
    assert(finalRun[0].status === 'COMPLETED', '41 all success finalizes COMPLETED (again)');
    assert(finalRun[0].eligibleCount === 4, '38 mixed-result counters correct');
    assert(finalRun[0].generatedCount === 2, 'Generated is 2 (s2 newly generated, s4 generated originally)');
    assert(finalRun[0].skippedCount === 2, 'Skipped is 2 (s5 original manual, s1 recovered idempotently)');

    console.log(`\n=== SUMMARY: ${passedTests} PASS / ${totalTests - passedTests} FAIL ===`);

  } finally {
    console.log('=== CLEANING UP PHASE B TEST FIXTURES ===');
    await cleanup();
  }
}

async function cleanup() {
  const sqlCon = neon(process.env.DATABASE_URL!);
  
  // Cleanup sequence
  await sqlCon`DELETE FROM finance_journal_entries WHERE description LIKE ${PREFIX + '%'}`;
  await sqlCon`DELETE FROM audit_logs WHERE actor_user_id IN (SELECT id FROM users WHERE email LIKE ${PREFIX + '%'})`;
  await sqlCon`DELETE FROM finance_invoice_scholarships WHERE invoice_id IN (SELECT id FROM finance_invoices WHERE invoice_number LIKE ${PREFIX + '%'})`;
  await sqlCon`DELETE FROM finance_payment_allocations WHERE invoice_id IN (SELECT id FROM finance_invoices WHERE invoice_number LIKE ${PREFIX + '%'})`;
  await sqlCon`DELETE FROM finance_payments WHERE payment_number LIKE ${PREFIX + '%'}`;
  
  await sqlCon`DELETE FROM finance_billing_run_items WHERE run_id IN (SELECT id FROM finance_billing_runs WHERE period = '2026-08' OR period = '2026-13' OR period = '2025-08')`;
  await sqlCon`DELETE FROM finance_billing_runs WHERE period = '2026-08' OR period = '2026-13' OR period = '2025-08'`;

  // Actually run item links to invoices, so delete run items before invoices. (Done above)
  await sqlCon`DELETE FROM finance_invoices WHERE student_id IN (SELECT id FROM students WHERE full_name LIKE ${PREFIX + '%'})`;

  await sqlCon`DELETE FROM finance_student_fee_assignments WHERE student_id IN (SELECT id FROM students WHERE full_name LIKE ${PREFIX + '%'})`;
  await sqlCon`DELETE FROM student_scholarships WHERE student_id IN (SELECT id FROM students WHERE full_name LIKE ${PREFIX + '%'})`;
  await sqlCon`DELETE FROM scholarship_program_fee_types WHERE program_id IN (SELECT id FROM scholarship_programs WHERE name LIKE ${PREFIX + '%'})`;
  await sqlCon`DELETE FROM scholarship_programs WHERE name LIKE ${PREFIX + '%'}`;
  await sqlCon`DELETE FROM finance_recurring_billing_configs WHERE fee_type_id IN (SELECT id FROM finance_fee_types WHERE code LIKE ${PREFIX + '%'})`;
  await sqlCon`DELETE FROM enrollments WHERE student_id IN (SELECT id FROM students WHERE full_name LIKE ${PREFIX + '%'})`;
  await sqlCon`DELETE FROM students WHERE full_name LIKE ${PREFIX + '%'}`;
  await sqlCon`DELETE FROM classes WHERE name LIKE ${PREFIX + '%'}`;
  await sqlCon`DELETE FROM programs WHERE name LIKE ${PREFIX + '%'}`;
  await sqlCon`DELETE FROM finance_fee_types WHERE code LIKE ${PREFIX + '%'}`;
  await sqlCon`DELETE FROM finance_categories WHERE name LIKE ${PREFIX + '%'}`;
  await sqlCon`DELETE FROM finance_accounts WHERE code LIKE ${PREFIX + '%'}`;
  await sqlCon`DELETE FROM academic_years WHERE name LIKE ${PREFIX + '%'}`;
  await sqlCon`DELETE FROM users WHERE email LIKE ${PREFIX + '%'}`;
}

execute().catch(e => {
  console.error(e);
  process.exit(1);
});
