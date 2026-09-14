import { db } from '../lib/db/client'
import {
  financePayments,
  financePaymentAllocations,
  financeInvoices,
  financeJournalEntries,
  financeJournalLines,
  users,
  students,
  academicYears,
  financeAccounts,
  financeFunds,
  financeFeeTypes,
  financeCategories,
  permissions,
  roles,
  rolePermissions,
  userRoles
} from '../drizzle/schema'
import { eq, inArray, sql } from 'drizzle-orm'
import { createPayment, updatePayment, allocatePayment, confirmPayment, refundPayment, cancelPayment } from '../lib/finance/payment'
import { createInvoiceDraft, issueInvoice } from '../lib/finance/invoices'
import { hasPermission } from '../lib/auth/rbac'

async function run() {
  console.log('--- STARTING FINANCE PAYMENT TESTS ---')
  
  // 1. Setup Test Data (Accounts, Category, Fund, Admin, Student)
  const [admin] = await db.insert(users).values({
    fullName: 'Admin Payment Test', email: `admin-pay-test-${Date.now()}@test.com`, passwordHash: 'hash', role: 'admin'
  }).returning({ id: users.id })

  const [student] = await db.insert(students).values({
    fullName: 'Student Payment Test', gender: 'L', status: 'AKTIF', enrollmentDate: new Date().toISOString().split('T')[0]
  }).returning({ id: students.id })
  
  const [student2] = await db.insert(students).values({
    fullName: 'Student Payment Test 2', gender: 'L', status: 'AKTIF', enrollmentDate: new Date().toISOString().split('T')[0]
  }).returning({ id: students.id })

  const [academicYear] = await db.select({ id: academicYears.id }).from(academicYears).where(eq(academicYears.isActive, true)).limit(1)

  const [fund1] = await db.insert(financeFunds).values({ code: `F1-${Date.now()}`, name: 'Fund 1', isActive: true, fundType: 'ACADEMIC', restrictionType: 'UNRESTRICTED' }).returning()
  const [fund2] = await db.insert(financeFunds).values({ code: `F2-${Date.now()}`, name: 'Fund 2', isActive: true, fundType: 'ACADEMIC', restrictionType: 'UNRESTRICTED' }).returning()
  
  const [category] = await db.insert(financeCategories).values({ code: `C-${Date.now()}`, name: 'Cat', type: 'INCOME', domain: 'ACADEMIC', isActive: true }).returning()

  const [assetAccount] = await db.insert(financeAccounts).values({ code: `A1-${Date.now()}`, name: 'Bank Test', accountType: 'ASSET', isActive: true }).returning()
  const [recvAccount1] = await db.insert(financeAccounts).values({ code: `R1-${Date.now()}`, name: 'Recv 1', accountType: 'ASSET', isActive: true }).returning()
  const [recvAccount2] = await db.insert(financeAccounts).values({ code: `R2-${Date.now()}`, name: 'Recv 2', accountType: 'ASSET', isActive: true }).returning()
  const [incomeAccount] = await db.insert(financeAccounts).values({ code: `I1-${Date.now()}`, name: 'Inc 1', accountType: 'INCOME', isActive: true }).returning()

  const [feeType1] = await db.insert(financeFeeTypes).values({
    name: 'Fee 1', code: `FT1-${Date.now()}`, defaultAmount: BigInt(300000), billingFrequency: 'ONE_TIME',
    categoryId: category.id, defaultFundId: fund1.id, receivableAccountId: recvAccount1.id, incomeAccountId: incomeAccount.id, isActive: true
  }).returning()

  const [feeType2] = await db.insert(financeFeeTypes).values({
    name: 'Fee 2', code: `FT2-${Date.now()}`, defaultAmount: BigInt(200000), billingFrequency: 'ONE_TIME',
    categoryId: category.id, defaultFundId: fund2.id, receivableAccountId: recvAccount2.id, incomeAccountId: incomeAccount.id, isActive: true
  }).returning()

  // Generate Invoices
  const inv1Id = await createInvoiceDraft({ studentId: student.id, academicYearId: academicYear.id, feeTypeId: feeType1.id, amount: BigInt(300000), dueDate: '2026-10-01', createdBy: admin.id })
  const inv2Id = await createInvoiceDraft({ studentId: student.id, academicYearId: academicYear.id, feeTypeId: feeType2.id, amount: BigInt(200000), dueDate: '2026-10-01', createdBy: admin.id })
  const inv3Id = await createInvoiceDraft({ studentId: student2.id, academicYearId: academicYear.id, feeTypeId: feeType1.id, amount: BigInt(100000), dueDate: '2026-10-01', createdBy: admin.id })
  
  await issueInvoice(inv1Id, admin.id)
  await issueInvoice(inv2Id, admin.id)
  await issueInvoice(inv3Id, admin.id)

  console.log('Testing Payment Creation...')
  const paymentId = await createPayment({
    studentId: student.id, amount: BigInt(500000), paymentDate: '2026-09-14', paymentMethod: 'BANK_TRANSFER', destinationAccountId: assetAccount.id, receivedBy: admin.id
  })
  let [payment] = await db.select().from(financePayments).where(eq(financePayments.id, paymentId))
  if (payment.status !== 'PENDING') throw new Error('Payment should be PENDING')
  console.log('✓ Payment Creation passed')

  console.log('Testing Allocations...')
  // Invalid cross-student allocation
  await allocatePayment(paymentId, [{ invoiceId: inv3Id, amount: BigInt(100000) }], admin.id).then(() => { throw new Error('Should have failed') }).catch(e => {
    if (!e.message.includes('different student')) throw e
  })
  // Invalid over-allocation
  await allocatePayment(paymentId, [{ invoiceId: inv1Id, amount: BigInt(600000) }], admin.id).then(() => { throw new Error('Should have failed') }).catch(e => {
    if (!e.message.includes('exceeds payment amount')) throw e
  })
  
  // Valid allocation
  await allocatePayment(paymentId, [
    { invoiceId: inv1Id, amount: BigInt(300000) },
    { invoiceId: inv2Id, amount: BigInt(200000) }
  ], admin.id)
  console.log('✓ Allocations passed')

  console.log('Testing Multi-Fund Journal Split (Confirmation)...')
  await confirmPayment(paymentId, admin.id);
  [payment] = await db.select().from(financePayments).where(eq(financePayments.id, paymentId))
  if (payment.status !== 'CONFIRMED') throw new Error('Payment should be CONFIRMED')

  // Verify journal
  const journals = await db.select().from(financeJournalEntries).where(sql`${financeJournalEntries.sourceType} = 'PAYMENT' AND ${financeJournalEntries.sourceId} = ${paymentId} AND ${financeJournalEntries.sourceEvent} = 'CONFIRM'`)
  if (journals.length !== 1) throw new Error('Expected 1 journal entry')
  
  const lines = await db.select().from(financeJournalLines).where(eq(financeJournalLines.journalEntryId, journals[0].id))
  
  // Expecting 2 Debit lines (split by fund) and 2 Credit lines (split by receivable/fund)
  const debits = lines.filter(l => BigInt(l.debit) > 0)
  const credits = lines.filter(l => BigInt(l.credit) > 0)
  if (debits.length !== 2) throw new Error(`Expected 2 debit lines, got ${debits.length}`)
  if (credits.length !== 2) throw new Error(`Expected 2 credit lines, got ${credits.length}`)
  console.log('✓ Multi-Fund Journal Split passed')

  console.log('Testing Invoice Status Reconcile...')
  const [inv1] = await db.select().from(financeInvoices).where(eq(financeInvoices.id, inv1Id))
  const [inv2] = await db.select().from(financeInvoices).where(eq(financeInvoices.id, inv2Id))
  if (inv1.status !== 'PAID') throw new Error(`Invoice 1 status is ${inv1.status}, expected PAID`)
  if (inv2.status !== 'PAID') throw new Error(`Invoice 2 status is ${inv2.status}, expected PAID`)
  console.log('✓ Invoice Status Reconcile passed')

  console.log('Testing Dynamic Permissions (Refund)...')
  const [staff] = await db.insert(users).values({
    fullName: 'Staff', email: `staff-pay-${Date.now()}@test.com`, passwordHash: 'hash', role: 'guru'
  }).returning({ id: users.id, email: users.email })

  const [refundRole] = await db.insert(roles).values({ code: `REFUNDER-${Date.now()}`, name: 'Refunder' }).returning({ id: roles.id })
  const [refundPerm] = await db.insert(permissions).values({ code: 'finance.payment.refund', name: 'Refund' }).onConflictDoUpdate({ target: permissions.code, set: { name: 'Refund' } }).returning({ id: permissions.id })
  
  await db.insert(userRoles).values({ userId: staff.id, roleId: refundRole.id })
  
  const staffSession = { userId: staff.id, role: 'guru', email: staff.email }

  let canRefund = await hasPermission(staffSession as any, 'finance.payment.refund')
  if (canRefund) throw new Error('Should not have permission yet')

  await db.insert(rolePermissions).values({ roleId: refundRole.id, permissionId: refundPerm.id })
  
  canRefund = await hasPermission(staffSession as any, 'finance.payment.refund')
  if (!canRefund) throw new Error('Should have permission now')
  console.log('✓ Dynamic Permissions (Refund) passed')

  console.log('Testing Full Refund...')
  await refundPayment(paymentId, staff.id)
  
  const [refundedPayment] = await db.select().from(financePayments).where(eq(financePayments.id, paymentId))
  if (refundedPayment.status !== 'REFUNDED') throw new Error('Payment should be REFUNDED')
  
  const [inv1AfterRefund] = await db.select().from(financeInvoices).where(eq(financeInvoices.id, inv1Id))
  if (inv1AfterRefund.status !== 'ISSUED') throw new Error('Invoice should revert to ISSUED')
  console.log('✓ Full Refund passed')

  console.log('--- ALL PAYMENT TESTS PASSED ---')
  process.exit(0)
}

run().catch(e => {
  console.error(e)
  process.exit(1)
})
