import assert from 'assert'
import { NextRequest } from 'next/server'
import { db, sql } from '../lib/db/client'
import {
  users,
  students,
  studentParents,
  academicYears,
  financeFeeTypes,
  financeRecurringBillingConfigs,
  financeStudentFeeAssignments,
  financeBillingRuns,
  financeBillingRunItems,
  financeInvoices,
  financePayments,
  financePaymentAllocations,
  financeInvoiceScholarships,
  financeAccounts,
  financeCategories,
  auditLogs,
} from '../drizzle/schema'
import { eq, and, inArray } from 'drizzle-orm'
import {
  getParentInvoicesForStudent,
  getStudentInvoices,
  getParentPaymentsForStudent,
  getStudentPayments,
} from '../lib/finance/queries/parent-finance'
import {
  getAuthorizedFinanceChildren,
  resolveParentFinanceContext,
} from '../lib/guardians/parent-context'
import { canAccessStudentFinance } from '../lib/finance/authorization'
import { GET, POST } from '../app/api/cron/recurring-billing/route'
import { generateRecurringBilling } from '../lib/finance/recurring-generator'

async function run() {
  console.log('=== STARTING COVERAGE SPRINT 03 TARGETED VERIFICATION ===\n')

  const testId = Date.now().toString().slice(-6)
  let period = '2026-11'

  let createdUserIds: number[] = []
  let createdStudentIds: number[] = []
  let createdYearIds: number[] = []
  let createdFeeTypeIds: number[] = []
  let createdConfigIds: number[] = []
  let createdAssignmentIds: number[] = []
  let createdInvoiceIds: number[] = []
  let createdPaymentIds: number[] = []
  let createdScholarshipIds: number[] = []

  const originalCronSecret = process.env.CRON_SECRET
  process.env.CRON_SECRET = `test-cron-secret-${testId}`

  try {
    // =========================================================================
    // SETUP FIXTURES
    // =========================================================================
    console.log('--- Setting up Test Fixtures ---')

    // 1. Get or Create Active Academic Year
    let [ay] = await db
      .select()
      .from(academicYears)
      .where(eq(academicYears.isActive, true))
      .limit(1)

    if (!ay) {
      const [newAy] = await db
        .insert(academicYears)
        .values({
          name: `Sprint 03 Year ${testId}`,
          startDate: '2026-07-01',
          endDate: '2027-06-30',
          isActive: true,
        })
        .returning()
      ay = newAy
      createdYearIds.push(ay.id)
    }

    // Determine a valid period within the active year
    period = ay.startDate.substring(0, 7)

    // 2. Create Users
    // Parent A
    const [parentAUser] = await db
      .insert(users)
      .values({
        email: `parent-a-${testId}@test.local`,
        passwordHash: 'dummy',
        fullName: `Parent A ${testId}`,
        role: 'orang_tua',
      })
      .returning()
    createdUserIds.push(parentAUser.id)

    // Parent B (unrelated)
    const [parentBUser] = await db
      .insert(users)
      .values({
        email: `parent-b-${testId}@test.local`,
        passwordHash: 'dummy',
        fullName: `Parent B ${testId}`,
        role: 'orang_tua',
      })
      .returning()
    createdUserIds.push(parentBUser.id)

    // Santri 1 (Child 1 of Parent A, has finance access)
    const [student1] = await db
      .insert(students)
      .values({
        fullName: `Santri One ${testId}`,
        enrollmentDate: '2026-07-01',
        status: 'active',
      })
      .returning()
    createdStudentIds.push(student1.id)

    // Santri 2 (Child 2 of Parent A, finance access FALSE)
    const [student2] = await db
      .insert(students)
      .values({
        fullName: `Santri Two ${testId}`,
        enrollmentDate: '2026-07-01',
        status: 'active',
      })
      .returning()
    createdStudentIds.push(student2.id)

    // Santri 3 (Child of Parent B)
    const [student3] = await db
      .insert(students)
      .values({
        fullName: `Santri Three ${testId}`,
        enrollmentDate: '2026-07-01',
        status: 'active',
      })
      .returning()
    createdStudentIds.push(student3.id)

    // Link Parent A to Santri 1 with canViewFinance = TRUE
    await db.insert(studentParents).values({
      parentId: parentAUser.id,
      studentId: student1.id,
      relationship: 'AYAH',
      isPrimary: true,
      canViewAcademic: true,
      canViewFinance: true,
      isActive: true,
    })

    // Link Parent A to Santri 2 with canViewFinance = FALSE
    await db.insert(studentParents).values({
      parentId: parentAUser.id,
      studentId: student2.id,
      relationship: 'AYAH',
      isPrimary: false,
      canViewAcademic: true,
      canViewFinance: false,
      isActive: true,
    })

    // Link Parent B to Santri 3
    await db.insert(studentParents).values({
      parentId: parentBUser.id,
      studentId: student3.id,
      relationship: 'IBU',
      isPrimary: true,
      canViewAcademic: true,
      canViewFinance: true,
      isActive: true,
    })

    // 3. Create Accounts, Category, and Fee Types
    let [accRec] = await db.select().from(financeAccounts).where(eq(financeAccounts.accountType, 'ASSET')).limit(1)
    if (!accRec) {
      const [newAcc] = await db.insert(financeAccounts).values({ code: `REC-${testId}`, name: 'Receivable', accountType: 'ASSET', isActive: true }).returning()
      accRec = newAcc
    }
    let [accInc] = await db.select().from(financeAccounts).where(eq(financeAccounts.accountType, 'INCOME')).limit(1)
    if (!accInc) {
      const [newAcc] = await db.insert(financeAccounts).values({ code: `INC-${testId}`, name: 'Income', accountType: 'INCOME', isActive: true }).returning()
      accInc = newAcc
    }
    let [cat] = await db.select().from(financeCategories).limit(1)
    if (!cat) {
      const [newCat] = await db.insert(financeCategories).values({ code: `CAT-${testId}`, name: 'Category', type: 'INCOME', domain: 'ACADEMIC' }).returning()
      cat = newCat
    }

    // Monthly Active Fee Type (SPP)
    const [feeMonthlyActive] = await db
      .insert(financeFeeTypes)
      .values({
        code: `SPP-${testId}`,
        name: `SPP Bulanan ${testId}`,
        billingFrequency: 'MONTHLY',
        defaultAmount: BigInt(500000),
        isActive: true,
        receivableAccountId: accRec.id,
        incomeAccountId: accInc.id,
        categoryId: cat.id,
      })
      .returning()
    createdFeeTypeIds.push(feeMonthlyActive.id)

    // Monthly Inactive Fee Type
    const [feeMonthlyInactive] = await db
      .insert(financeFeeTypes)
      .values({
        code: `ESKUL-${testId}`,
        name: `Eskul Nonaktif ${testId}`,
        billingFrequency: 'MONTHLY',
        defaultAmount: BigInt(100000),
        isActive: false,
        receivableAccountId: accRec.id,
        incomeAccountId: accInc.id,
        categoryId: cat.id,
      })
      .returning()
    createdFeeTypeIds.push(feeMonthlyInactive.id)

    // 4. Create Recurring Billing Configs
    const [configActive] = await db
      .insert(financeRecurringBillingConfigs)
      .values({
        feeTypeId: feeMonthlyActive.id,
        isActive: true,
        dueDayOfMonth: 10,
      })
      .returning()
    createdConfigIds.push(configActive.id)

    const [configInactive] = await db
      .insert(financeRecurringBillingConfigs)
      .values({
        feeTypeId: feeMonthlyInactive.id,
        isActive: false,
        dueDayOfMonth: 15,
      })
      .returning()
    createdConfigIds.push(configInactive.id)

    // 5. Create Student Fee Assignments for period
    const startPer = ay.startDate.substring(0, 7)
    const endPer = ay.endDate.substring(0, 7)

    const [assign1] = await db
      .insert(financeStudentFeeAssignments)
      .values({
        studentId: student1.id,
        academicYearId: ay.id,
        feeTypeId: feeMonthlyActive.id,
        startPeriod: startPer,
        endPeriod: endPer,
        status: 'VALID',
      })
      .returning()
    createdAssignmentIds.push(assign1.id)

    const [assign3] = await db
      .insert(financeStudentFeeAssignments)
      .values({
        studentId: student3.id,
        academicYearId: ay.id,
        feeTypeId: feeMonthlyActive.id,
        startPeriod: startPer,
        endPeriod: endPer,
        status: 'VALID',
      })
      .returning()
    createdAssignmentIds.push(assign3.id)

    // Assignment for inactive rule (should be ignored by cron)
    const [assignInactive] = await db
      .insert(financeStudentFeeAssignments)
      .values({
        studentId: student1.id,
        academicYearId: ay.id,
        feeTypeId: feeMonthlyInactive.id,
        startPeriod: startPer,
        endPeriod: endPer,
        status: 'VALID',
      })
      .returning()
    createdAssignmentIds.push(assignInactive.id)

    console.log('✓ Test fixtures successfully created.\n')

    // =========================================================================
    // TASK 1: PARENT FINANCE (PARENT-FINANCE-001) VERIFICATION
    // =========================================================================
    console.log('--- TASK 1: PARENT-FINANCE-001 Verification ---')

    // Test 1.1: Linked child with can_view_finance = TRUE is allowed
    const canAccessChild1 = await canAccessStudentFinance(
      { userId: parentAUser.id, role: 'orang_tua' },
      student1.id
    )
    assert.strictEqual(canAccessChild1, true, 'Parent A must have finance access to linked Child 1')
    console.log('✓ Linked child with can_view_finance = true allowed')

    // Test 1.2: Unlinked child blocked
    const canAccessUnlinked = await canAccessStudentFinance(
      { userId: parentAUser.id, role: 'orang_tua' },
      student3.id
    )
    assert.strictEqual(canAccessUnlinked, false, 'Parent A must NOT have finance access to Parent B child')
    await assert.rejects(
      async () => {
        await getParentInvoicesForStudent(parentAUser.id, student3.id)
      },
      /Akses ditolak/,
      'Querying unlinked child must reject with access denied'
    )
    console.log('✓ Unlinked child access strictly denied')

    // Test 1.3: Linked child with can_view_finance = FALSE is blocked
    const canAccessChild2 = await canAccessStudentFinance(
      { userId: parentAUser.id, role: 'orang_tua' },
      student2.id
    )
    assert.strictEqual(canAccessChild2, false, 'Parent A must NOT have finance access when can_view_finance = FALSE')
    await assert.rejects(
      async () => {
        await getParentInvoicesForStudent(parentAUser.id, student2.id)
      },
      /Akses ditolak/,
      'Querying child with can_view_finance = false must reject'
    )
    console.log('✓ Linked child with can_view_finance = false strictly blocked')

    // Test 1.4: Multi-child context resolution
    const authChildren = await getAuthorizedFinanceChildren(parentAUser.id)
    assert.strictEqual(authChildren.length, 1, 'Only Child 1 should appear in authorized finance children')
    // Authorized child resolution
    const resolvedCtx = await resolveParentFinanceContext({
      userId: parentAUser.id,
      requestedChildId: student1.id,
    })
    assert.strictEqual(resolvedCtx.status, 'AUTHORIZED')
    if (resolvedCtx.status === 'AUTHORIZED') {
      assert.strictEqual(resolvedCtx.child.student_id, student1.id.toString())
    }

    // Unauthorized child resolution (can_view_finance = false)
    const forbiddenCtx = await resolveParentFinanceContext({
      userId: parentAUser.id,
      requestedChildId: student2.id,
    })
    assert.strictEqual(
      forbiddenCtx.status,
      'FORBIDDEN_CHILD',
      'Requesting child with can_view_finance = false must yield FORBIDDEN_CHILD'
    )

    // Unlinked child resolution
    const unlinkedCtx = await resolveParentFinanceContext({
      userId: parentAUser.id,
      requestedChildId: student3.id,
    })
    assert.strictEqual(
      unlinkedCtx.status,
      'FORBIDDEN_CHILD',
      'Requesting unlinked child must yield FORBIDDEN_CHILD'
    )
    console.log('✓ Multi-child selector isolates authorized finance children and denies unauthorized/unlinked requests safely')

    // Create an invoice and payment for Student 1 to test scoping and breakdown
    const [inv1] = await db
      .insert(financeInvoices)
      .values({
        invoiceNumber: `INV-TEST-S1-${testId}`,
        studentId: student1.id,
        academicYearId: ay.id,
        feeTypeId: feeMonthlyActive.id,
        period: '2026-10',
        amount: BigInt(500000),
        dueDate: '2026-10-10',
        status: 'ISSUED',
      })
      .returning()
    createdInvoiceIds.push(inv1.id)

    // Create a payment and allocation for Student 1
    const [pay1] = await db
      .insert(financePayments)
      .values({
        paymentNumber: `PAY-TEST-S1-${testId}`,
        studentId: student1.id,
        paymentDate: '2026-10-05',
        amount: BigInt(200000),
        paymentMethod: 'TRANSFER',
        status: 'CONFIRMED',
      })
      .returning()
    createdPaymentIds.push(pay1.id)

    await db.insert(financePaymentAllocations).values({
      paymentId: pay1.id,
      invoiceId: inv1.id,
      allocatedAmount: BigInt(200000),
    })

    // Create invoice for Student 3 (Parent B child) to verify data isolation
    const [inv3] = await db
      .insert(financeInvoices)
      .values({
        invoiceNumber: `INV-TEST-S3-${testId}`,
        studentId: student3.id,
        academicYearId: ay.id,
        feeTypeId: feeMonthlyActive.id,
        period: '2026-10',
        amount: BigInt(500000),
        dueDate: '2026-10-10',
        status: 'ISSUED',
      })
      .returning()
    createdInvoiceIds.push(inv3.id)

    // Test 1.5: Invoices and payment calculations for Student 1
    const parentInvoices = await getParentInvoicesForStudent(parentAUser.id, student1.id)
    assert.strictEqual(parentInvoices.length, 1, 'Parent A sees 1 invoice for Child 1')
    assert.strictEqual(parentInvoices[0].invoiceNumber, inv1.invoiceNumber)
    assert.strictEqual(parentInvoices[0].grossAmount, '500000')
    assert.strictEqual(parentInvoices[0].paidAmount, '200000')
    assert.strictEqual(parentInvoices[0].outstandingAmount, '300000')

    const parentPayments = await getParentPaymentsForStudent(parentAUser.id, student1.id)
    assert.strictEqual(parentPayments.length, 1, 'Parent A sees 1 payment for Child 1')
    assert.strictEqual(parentPayments[0].allocations.length, 1)
    assert.strictEqual(parentPayments[0].allocations[0].invoiceId, inv1.id)

    console.log('✓ Invoice calculations, fee components, and payment allocations scoped correctly\n')

    // =========================================================================
    // TASK 2: SANTRI FINANCE (PORTAL-SANTRI-003) VERIFICATION
    // =========================================================================
    console.log('--- TASK 2: PORTAL-SANTRI-003 Verification ---')

    // Test 2.1: Santri sees own invoices
    const santri1Invoices = await getStudentInvoices(student1.id)
    assert.strictEqual(santri1Invoices.length, 1, 'Santri 1 sees own invoice')
    assert.strictEqual(santri1Invoices[0].studentId, student1.id)
    assert.strictEqual(santri1Invoices[0].grossAmount, '500000')
    assert.strictEqual(santri1Invoices[0].outstandingAmount, '300000')

    // Test 2.2: Santri 1 does NOT see Santri 3 invoices
    const hasStudent3Data = santri1Invoices.some(i => i.studentId === student3.id)
    assert.strictEqual(hasStudent3Data, false, 'Santri 1 cannot see Santri 3 invoices')

    // Test 2.3: Santri payments are isolated
    const santri1Payments = await getStudentPayments(student1.id)
    assert.strictEqual(santri1Payments.length, 1, 'Santri 1 sees own payments')
    assert.strictEqual(santri1Payments[0].studentId, student1.id)

    const santri3Payments = await getStudentPayments(student3.id)
    assert.strictEqual(santri3Payments.length, 0, 'Santri 3 has no payments')

    // Test 2.4: Zero parent leakage in santri invoice & payment models
    const s1InvRaw = JSON.stringify(santri1Invoices)
    assert.strictEqual(s1InvRaw.includes('parent_id'), false, 'No parent_id in santri invoice model')
    assert.strictEqual(s1InvRaw.includes('Parent A'), false, 'No parent name in santri invoice model')

    console.log('✓ Santri billing transparency is read-only, student-scoped, and leak-free\n')

    // =========================================================================
    // TASK 3: RECURRING BILLING CRON (FINANCE-RECURRING-002) VERIFICATION
    // =========================================================================
    console.log('--- TASK 3: FINANCE-RECURRING-002 Verification ---')

    // Test 3.1: Unauthenticated request -> 401
    const unauthReq = new NextRequest('http://localhost:3000/api/cron/recurring-billing')
    const unauthRes = await GET(unauthReq)
    assert.strictEqual(unauthRes.status, 401, 'Unauthenticated cron call must return 401')
    const unauthBody = await unauthRes.json()
    assert.strictEqual(unauthBody.success, false)
    console.log('✓ Unauthenticated cron call rejected with 401')

    // Test 3.2: Invalid Authorization format -> 401
    const badSchemeReq = new NextRequest('http://localhost:3000/api/cron/recurring-billing', {
      headers: { authorization: 'Basic dXNlcjpwYXNz' },
    })
    const badSchemeRes = await GET(badSchemeReq)
    assert.strictEqual(badSchemeRes.status, 401, 'Non-Bearer auth must return 401')
    console.log('✓ Non-Bearer authorization format rejected with 401')

    // Test 3.3: Invalid token -> 401
    const wrongTokenReq = new NextRequest('http://localhost:3000/api/cron/recurring-billing', {
      headers: { authorization: 'Bearer WRONG_TOKEN_VALUE' },
    })
    const wrongTokenRes = await GET(wrongTokenReq)
    assert.strictEqual(wrongTokenRes.status, 401, 'Wrong secret token must return 401')
    console.log('✓ Invalid token rejected with 401')

    // Test 3.4: Query string secret rejected -> 400
    const querySecretReq = new NextRequest(
      `http://localhost:3000/api/cron/recurring-billing?secret=${process.env.CRON_SECRET}`,
      { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } }
    )
    const querySecretRes = await GET(querySecretReq)
    assert.strictEqual(querySecretRes.status, 400, 'Secret in query string must be rejected with 400')
    console.log('✓ Query parameter secret rejected with 400')

    // Test 3.5: First valid execution generates expected invoices
    const validReq1 = new NextRequest(
      `http://localhost:3000/api/cron/recurring-billing?period=${period}`,
      { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } }
    )
    const validRes1 = await GET(validReq1)
    assert.strictEqual(validRes1.status, 200, 'Valid cron call must succeed with 200')
    const validBody1 = await validRes1.json()

    assert.strictEqual(validBody1.success, true, 'First cron run must report success')
    assert.strictEqual(validBody1.period, period, 'Cron run must match requested period')
    assert.strictEqual(validBody1.processedRules, 1, 'Only active rule must be processed (inactive ignored)')
    assert.strictEqual(validBody1.generatedInvoices, 2, 'Must generate invoices for 2 eligible assignments (student1 & student3)')
    console.log('✓ First execution: generated 2 invoices, ignored inactive rule')

    // Verify invoices generated in DB for period
    const generatedInvs = await db
      .select()
      .from(financeInvoices)
      .where(and(eq(financeInvoices.feeTypeId, feeMonthlyActive.id), eq(financeInvoices.period, period)))
    assert.strictEqual(generatedInvs.length, 2, 'DB must contain exactly 2 generated invoices for period')
    for (const inv of generatedInvs) {
      createdInvoiceIds.push(inv.id)
    }

    // Verify inactive fee type generated ZERO invoices
    const inactiveInvs = await db
      .select()
      .from(financeInvoices)
      .where(and(eq(financeInvoices.feeTypeId, feeMonthlyInactive.id), eq(financeInvoices.period, period)))
    assert.strictEqual(inactiveInvs.length, 0, 'Inactive fee type must generate zero invoices')
    console.log('✓ DB check: exactly 2 invoices created, inactive rule generated 0')

    // Test 3.6: Second execution in SAME period produces ZERO duplicates
    const validReq2 = new NextRequest(
      `http://localhost:3000/api/cron/recurring-billing?period=${period}`,
      { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } }
    )
    const validRes2 = await GET(validReq2)
    assert.strictEqual(validRes2.status, 200, 'Second cron run must succeed with 200')
    const validBody2 = await validRes2.json()

    assert.strictEqual(validBody2.success, true, 'Second cron run must report success')
    assert.strictEqual(validBody2.generatedInvoices, 0, 'Second run must generate ZERO duplicate invoices')
    assert.strictEqual(validBody2.errors.length, 0, 'Second run must have no errors')

    const generatedInvsAfterSecond = await db
      .select()
      .from(financeInvoices)
      .where(and(eq(financeInvoices.feeTypeId, feeMonthlyActive.id), eq(financeInvoices.period, period)))
    assert.strictEqual(
      generatedInvsAfterSecond.length,
      2,
      'Total invoices in DB must remain exactly 2 after second execution'
    )
    console.log('✓ Second execution: generatedInvoices = 0, zero duplicate invoices created (strict idempotency)')

    // Test 3.7: Concurrent execution safety (simulate concurrent invocations)
    const [concurrentRes1, concurrentRes2] = await Promise.all([
      GET(
        new NextRequest(`http://localhost:3000/api/cron/recurring-billing?period=${period}`, {
          headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
        })
      ),
      POST(
        new NextRequest('http://localhost:3000/api/cron/recurring-billing', {
          method: 'POST',
          headers: {
            authorization: `Bearer ${process.env.CRON_SECRET}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ period }),
        })
      ),
    ])

    assert.strictEqual(concurrentRes1.status, 200)
    assert.strictEqual(concurrentRes2.status, 200)
    const concInvs = await db
      .select()
      .from(financeInvoices)
      .where(and(eq(financeInvoices.feeTypeId, feeMonthlyActive.id), eq(financeInvoices.period, period)))
    assert.strictEqual(concInvs.length, 2, 'Concurrent invocations must not create duplicate invoices')
    console.log('✓ Concurrent invocations safe and idempotent')

    // Test 3.8: Observability check (audit log created with SYSTEM / null actor)
    const cronAuditLogs = await db
      .select()
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.action, 'CRON_RECURRING_BILLING_COMPLETED'),
          eq(auditLogs.entityType, 'RECURRING_BILLING')
        )
      )
    assert(cronAuditLogs.length >= 1, 'Audit log entry must exist for cron execution')
    const latestAudit = cronAuditLogs[cronAuditLogs.length - 1]
    assert.strictEqual(latestAudit.actorUserId, null, 'Audit log must record null actorUserId (SYSTEM actor)')
    console.log('✓ Observability: safe audit log recorded with system actor semantics\n')

    console.log('=== ALL COVERAGE SPRINT 03 TESTS PASSED SUCCESSFULLY! ===')
  } finally {
    // Restore CRON_SECRET
    if (originalCronSecret !== undefined) {
      process.env.CRON_SECRET = originalCronSecret
    } else {
      delete process.env.CRON_SECRET
    }

    console.log('\n--- Cleaning up Test Fixtures ---')
    try {
      // Clean up in reverse dependency order
      if (createdPaymentIds.length > 0) {
        await db.delete(financePaymentAllocations).where(inArray(financePaymentAllocations.paymentId, createdPaymentIds))
        await db.delete(financePayments).where(inArray(financePayments.id, createdPaymentIds))
      }

      // Billing runs & items for test period
      const testRuns = await db.select({ id: financeBillingRuns.id }).from(financeBillingRuns).where(eq(financeBillingRuns.period, period))
      const runIds = testRuns.map(r => r.id)
      if (runIds.length > 0) {
        await db.delete(financeBillingRunItems).where(inArray(financeBillingRunItems.runId, runIds))
        await db.delete(financeBillingRuns).where(inArray(financeBillingRuns.id, runIds))
      }

      if (createdInvoiceIds.length > 0) {
        await db.delete(financeInvoiceScholarships).where(inArray(financeInvoiceScholarships.invoiceId, createdInvoiceIds))
        await db.delete(financeInvoices).where(inArray(financeInvoices.id, createdInvoiceIds))
      }

      if (createdAssignmentIds.length > 0) {
        await db.delete(financeStudentFeeAssignments).where(inArray(financeStudentFeeAssignments.id, createdAssignmentIds))
      }

      if (createdConfigIds.length > 0) {
        await db.delete(financeRecurringBillingConfigs).where(inArray(financeRecurringBillingConfigs.id, createdConfigIds))
      }

      if (createdFeeTypeIds.length > 0) {
        await db.delete(financeFeeTypes).where(inArray(financeFeeTypes.id, createdFeeTypeIds))
      }

      if (createdStudentIds.length > 0) {
        await db.delete(studentParents).where(inArray(studentParents.studentId, createdStudentIds))
        await db.delete(students).where(inArray(students.id, createdStudentIds))
      }

      if (createdUserIds.length > 0) {
        await db.delete(auditLogs).where(inArray(auditLogs.actorUserId, createdUserIds))
        await db.delete(users).where(inArray(users.id, createdUserIds))
      }

      if (createdYearIds.length > 0) {
        await db.delete(academicYears).where(inArray(academicYears.id, createdYearIds))
      }

      console.log('✓ Cleanup complete.')
    } catch (cleanupErr) {
      console.error('Cleanup encountered error:', cleanupErr)
    }
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test execution failed:', err)
    process.exit(1)
  })
