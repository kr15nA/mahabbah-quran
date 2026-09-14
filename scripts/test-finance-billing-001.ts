import { db } from '../lib/db/client'
import {
  financeFeeTypes,
  financeInvoices,
  financeJournalEntries,
  financeJournalLines,
  financeCategories,
  financeAccounts,
  financeFunds,
  users,
  students,
  academicYears,
  studentParents,
  auditLogs,
  rolePermissions,
  roles,
  permissions,
  userRoles
} from '../drizzle/schema'
import { eq, and, sql } from 'drizzle-orm'
import { createFeeType, updateFeeType, deactivateFeeType } from '../lib/finance/fee-types'
import { createInvoiceDraft, issueInvoice, cancelInvoice, getInvoiceDetails } from '../lib/finance/invoices'
import { bulkGenerateInvoices, bulkIssueInvoices } from '../lib/finance/bulk-billing'
import { toBigIntSafely, serializeAmountForApi } from '../lib/finance/utils'
import { canAccessStudentFinance } from '../lib/finance/authorization'

async function run() {
  console.log('--- STARTING FINANCE BILLING TESTS ---')

  // 1. Setup Test Data (Accounts, Category, Fund, Admin, Student)
  const [admin] = await db.insert(users).values({
    fullName: 'Admin Finance Test', email: `admin-fin-test-${Date.now()}@test.com`, passwordHash: 'hash', role: 'admin'
  }).returning({ id: users.id })

  const [parent] = await db.insert(users).values({
    fullName: 'Parent Test', email: `parent-test-${Date.now()}@test.com`, passwordHash: 'hash', role: 'orang_tua'
  }).returning({ id: users.id })

  const [student] = await db.insert(students).values({
    fullName: 'Student Finance Test', gender: 'L', status: 'AKTIF', enrollmentDate: new Date().toISOString().split('T')[0]
  }).returning({ id: students.id })

  const [student2] = await db.insert(students).values({
    fullName: 'Student Finance Test 2', gender: 'L', status: 'AKTIF', enrollmentDate: new Date().toISOString().split('T')[0]
  }).returning({ id: students.id })

  await db.insert(studentParents).values({ studentId: student.id, parentId: parent.id })

  const [academicYear] = await db.select({ id: academicYears.id }).from(academicYears).where(eq(academicYears.isActive, true)).limit(1)
  if (!academicYear) throw new Error('No active academic year found')

  const [fund] = await db.insert(financeFunds).values({
    code: `FND-${Date.now()}`, name: 'Test Fund', isActive: true, fundType: 'ACADEMIC', restrictionType: 'RESTRICTED'
  }).returning({ id: financeFunds.id })

  const [category] = await db.insert(financeCategories).values({
    code: `CAT-${Date.now()}`, name: 'Test Category', type: 'INCOME', domain: 'ACADEMIC'
  }).returning({ id: financeCategories.id })

  const [receivable] = await db.insert(financeAccounts).values({
    code: `REC-${Date.now()}`, name: 'Test Receivable', accountType: 'ASSET'
  }).returning({ id: financeAccounts.id })

  const [income] = await db.insert(financeAccounts).values({
    code: `INC-${Date.now()}`, name: 'Test Income', accountType: 'INCOME'
  }).returning({ id: financeAccounts.id })

  // 2. Test Fee Types
  console.log('Testing Fee Types...')
  const feeTypeId = await createFeeType({
    code: `FEE-${Date.now()}`,
    name: 'SPP Bulanan',
    categoryId: category.id,
    receivableAccountId: receivable.id,
    incomeAccountId: income.id,
    defaultFundId: fund.id,
    defaultAmount: toBigIntSafely('150000'),
    billingFrequency: 'MONTHLY'
  })
  
  const feeTypeOneTime = await createFeeType({
    code: `FEE-OT-${Date.now()}`,
    name: 'Uang Pangkal',
    categoryId: category.id,
    receivableAccountId: receivable.id,
    incomeAccountId: income.id,
    defaultFundId: fund.id,
    defaultAmount: toBigIntSafely('5000000'),
    billingFrequency: 'ONE_TIME'
  })
  console.log('✓ Fee Types created')

  // 3. Test Invoice Draft (Monthly requires period)
  console.log('Testing Invoice Creation & Validation...')
  try {
    await createInvoiceDraft({
      studentId: student.id, academicYearId: academicYear.id, feeTypeId, amount: toBigIntSafely('150000'), dueDate: new Date().toISOString().split('T')[0], createdBy: admin.id
    })
    throw new Error('Should have failed without period for MONTHLY')
  } catch (e: any) {
    if (!e.message.includes('require a period')) throw e
  }

  // Success Monthly
  const invoice1 = await createInvoiceDraft({
    studentId: student.id, academicYearId: academicYear.id, feeTypeId, period: '2026-09', amount: toBigIntSafely('150000'), dueDate: new Date().toISOString().split('T')[0], createdBy: admin.id
  })
  
  // Test Duplicate Monthly
  try {
    await createInvoiceDraft({
      studentId: student.id, academicYearId: academicYear.id, feeTypeId, period: '2026-09', amount: toBigIntSafely('150000'), dueDate: new Date().toISOString().split('T')[0], createdBy: admin.id
    })
    throw new Error('Should have failed duplicate')
  } catch (e: any) {
    if (!e.message.includes('Duplicate')) throw e
  }
  
  // Test ONE_TIME multiple allowed without period
  await createInvoiceDraft({
    studentId: student.id, academicYearId: academicYear.id, feeTypeId: feeTypeOneTime, amount: toBigIntSafely('5000000'), dueDate: new Date().toISOString().split('T')[0], createdBy: admin.id
  })
  await createInvoiceDraft({
    studentId: student.id, academicYearId: academicYear.id, feeTypeId: feeTypeOneTime, amount: toBigIntSafely('2500000'), dueDate: new Date().toISOString().split('T')[0], createdBy: admin.id
  })
  console.log('✓ Invoice Creation & Duplicates passed')

  // 4. Test Issuance & Journals
  console.log('Testing Invoice Issue...')
  await issueInvoice(invoice1, admin.id)
  const [jEntry] = await db.select().from(financeJournalEntries).where(and(eq(financeJournalEntries.sourceType, 'INVOICE'), eq(financeJournalEntries.sourceId, invoice1)))
  if (!jEntry) throw new Error('Journal not created')
  
  const jLines = await db.select().from(financeJournalLines).where(eq(financeJournalLines.journalEntryId, jEntry.id))
  if (jLines.length !== 2) throw new Error('Expected 2 journal lines')
  console.log('✓ Invoice Issue & Journals passed')

  // 5. Test Outstanding
  console.log('Testing Invoice Outstanding...')
  const details = await getInvoiceDetails(invoice1)
  if (details?.outstandingAmount !== toBigIntSafely('150000')) throw new Error('Outstanding should be 150000')
  console.log('✓ Invoice Outstanding passed')

  // 6. Test Cancellation
  console.log('Testing Invoice Cancellation...')
  await cancelInvoice(invoice1, admin.id)
  const [invCheck] = await db.select().from(financeInvoices).where(eq(financeInvoices.id, invoice1))
  if (invCheck.status !== 'CANCELLED') throw new Error('Invoice not cancelled')
  // Check reversal journal
  const [rEntry] = await db.select().from(financeJournalEntries).where(eq(financeJournalEntries.reversalOfId, jEntry.id))
  if (!rEntry) throw new Error('Reversal journal not created')
  console.log('✓ Invoice Cancellation passed')

  // 7. Test BigInt formatting
  console.log('Testing BigInt Format...')
  if (serializeAmountForApi(toBigIntSafely('150000')) !== '150000') throw new Error('BigInt serialization failed')
  console.log('✓ BigInt Formatting passed')

  // 8. Test Authorization
  console.log('Testing Authorization...')
  const parentSession = { userId: parent.id, role: 'orang_tua' }
  const hasAccess1 = await canAccessStudentFinance(parentSession as any, student.id)
  const hasAccess2 = await canAccessStudentFinance(parentSession as any, student2.id)
  if (!hasAccess1 || hasAccess2) throw new Error('Parent Authorization logic failed')
  
  // Dynamic role permission testing
  const [financeRole] = await db.insert(roles).values({ code: 'FINANCE_STAFF', name: 'Finance Staff' }).returning({ id: roles.id })
  const [viewPerm] = await db.insert(permissions).values({ code: 'finance.billing.view', name: 'View Billing' }).onConflictDoUpdate({ target: permissions.code, set: { name: 'View Billing' } }).returning({ id: permissions.id })
  const [managePerm] = await db.insert(permissions).values({ code: 'finance.billing.manage', name: 'Manage Billing' }).onConflictDoUpdate({ target: permissions.code, set: { name: 'Manage Billing' } }).returning({ id: permissions.id })
  
  await db.insert(rolePermissions).values({ roleId: financeRole.id, permissionId: viewPerm.id })
  await db.insert(userRoles).values({ userId: admin.id, roleId: financeRole.id }) // repurpose admin user as test subject
  
  const { hasPermission } = await import('../lib/auth/rbac')
  const staffSession = { userId: admin.id, role: 'guru' } // Base role is guru, but has FINANCE_STAFF dynamically
  
  const canView = await hasPermission(staffSession as any, 'finance.billing.view')
  const canManage = await hasPermission(staffSession as any, 'finance.billing.manage')
  if (!canView) throw new Error('Dynamic role should have view permission')
  if (canManage) throw new Error('Dynamic role should NOT have manage permission yet')
  
  // Grant manage and test
  await db.insert(rolePermissions).values({ roleId: financeRole.id, permissionId: managePerm.id })
  const canManageNow = await hasPermission(staffSession as any, 'finance.billing.manage')
  if (!canManageNow) throw new Error('Dynamic role should have manage permission after grant')
  
  // Revoke view and test
  await db.delete(rolePermissions).where(and(eq(rolePermissions.roleId, financeRole.id), eq(rolePermissions.permissionId, viewPerm.id)))
  const canViewNow = await hasPermission(staffSession as any, 'finance.billing.view')
  if (canViewNow) throw new Error('Dynamic role should lose view permission after revoke')
  
  console.log('✓ Authorization logic passed')

  console.log('--- ALL TESTS PASSED ---')
}

run().catch(console.error).finally(() => process.exit(0))
