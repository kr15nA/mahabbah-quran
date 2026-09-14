import { db } from '../lib/db/client'
import {
  financeDisbursements,
  financeCategories,
  financeFunds,
  financeCategoryFunds,
  financeAccounts,
  roles,
  userRoles,
  users,
  permissions,
  rolePermissions,
  financeJournalEntries,
  financeJournalLines,
} from '../drizzle/schema'
import { eq, inArray, and } from 'drizzle-orm'
import {
  createDisbursementDraft,
  updateDisbursementDraft,
  submitDisbursement,
  approveDisbursement,
  payDisbursement,
  cancelDisbursement,
  reverseDisbursement
} from '../lib/finance/disbursement'
import crypto from 'crypto'

async function run() {
  console.log('--- STARTING FINANCE DISBURSEMENT TESTS ---')

  const timestamp = Date.now()
  
  // 1. Setup Test Data
  const [maker] = await db.insert(users).values({
    id: 9001 + timestamp % 1000,
    email: `maker_${timestamp}@test.com`,
    passwordHash: 'hash',
    fullName: 'Test Maker',
    phone: `0812${timestamp.toString().slice(-8)}`,
    role: 'FINANCE_STAFF'
  }).onConflictDoNothing().returning()

  const [checker] = await db.insert(users).values({
    id: 9002 + timestamp % 1000,
    email: `checker_${timestamp}@test.com`,
    passwordHash: 'hash',
    fullName: 'Test Checker',
    phone: `0813${timestamp.toString().slice(-8)}`,
    role: 'FINANCE_MANAGER'
  }).onConflictDoNothing().returning()

  // Setup Accounts
  const [expenseAccount] = await db.insert(financeAccounts).values({
    code: `EXP_${timestamp}`,
    name: 'Test Expense Account',
    accountType: 'EXPENSE',
    isActive: true
  }).returning()

  const [incomeAccount] = await db.insert(financeAccounts).values({
    code: `INC_${timestamp}`,
    name: 'Test Income Account',
    accountType: 'INCOME',
    isActive: true
  }).returning()

  const [assetAccount] = await db.insert(financeAccounts).values({
    code: `AST_${timestamp}`,
    name: 'Test Asset Account',
    accountType: 'ASSET',
    isActive: true
  }).returning()

  // Setup Funds
  const [activeFund] = await db.insert(financeFunds).values({
    code: `FND_${timestamp}`,
    name: 'Test Active Fund',
    fundType: 'ZISWAF',
    restrictionType: 'RESTRICTED',
    isActive: true
  }).returning()

  const [inactiveFund] = await db.insert(financeFunds).values({
    code: `INA_${timestamp}`,
    name: 'Test Inactive Fund',
    fundType: 'ZISWAF',
    restrictionType: 'RESTRICTED',
    isActive: false
  }).returning()

  // Setup Categories
  const [validCategory] = await db.insert(financeCategories).values({
    code: `CAT_${timestamp}`,
    name: 'Test Valid Expense Category',
    domain: 'ZISWAF',
    type: 'EXPENSE',
    defaultAccountId: expenseAccount.id,
    isActive: true
  }).returning()

  const [incomeCategory] = await db.insert(financeCategories).values({
    code: `ICAT_${timestamp}`,
    name: 'Test Income Category',
    domain: 'ZISWAF',
    type: 'INCOME',
    defaultAccountId: incomeAccount.id,
    isActive: true
  }).returning()

  // Mappings
  await db.insert(financeCategoryFunds).values({
    categoryId: validCategory.id,
    fundId: activeFund.id
  })

  let testCount = 0
  let passCount = 0

  const assert = (condition: boolean, message: string) => {
    testCount++
    if (!condition) {
      console.error(`❌ FAILED: ${message}`)
      throw new Error(message)
    }
    passCount++
    console.log(`✓ ${message}`)
  }

  // --- TESTS ---

  // 1. DRAFT Creation Validations
  try {
    await createDisbursementDraft({
      fundId: activeFund.id,
      categoryId: incomeCategory.id, // invalid
      amount: "500000",
      transactionDate: new Date().toISOString(),
      description: 'Test',
      beneficiaryName: null
    }, maker.id)
    assert(false, 'Should reject INCOME category')
  } catch (err: any) {
    assert(err.message.includes('Only EXPENSE categories are allowed'), 'Rejected INCOME category successfully')
  }

  try {
    await createDisbursementDraft({
      fundId: inactiveFund.id,
      categoryId: validCategory.id,
      amount: "500000",
      transactionDate: new Date().toISOString(),
      description: 'Test',
      beneficiaryName: null
    }, maker.id)
    assert(false, 'Should reject inactive fund')
  } catch (err: any) {
    assert(err.message.includes('Fund is inactive'), 'Rejected inactive fund successfully')
  }

  try {
    await createDisbursementDraft({
      fundId: activeFund.id,
      categoryId: validCategory.id,
      amount: "-1000",
      transactionDate: new Date().toISOString(),
      description: 'Test',
      beneficiaryName: null
    }, maker.id)
    assert(false, 'Should reject negative amount')
  } catch (err: any) {
    assert(err.message.includes('Amount must be greater than 0'), 'Rejected negative amount successfully')
  }

  // 2. Successful DRAFT Creation
  let draft = await createDisbursementDraft({
    fundId: activeFund.id,
    categoryId: validCategory.id,
    amount: "1500000",
    transactionDate: new Date().toISOString(),
    description: 'Test Disbursement',
    beneficiaryName: 'Bapak Fulan'
  }, maker.id)
  
  assert(draft.status === 'DRAFT', 'Created DRAFT disbursement successfully')
  assert(draft.amount.toString() === '1500000', 'Amount maintained as bigint')
  assert(draft.paymentAccountId === null, 'payment_account_id is NULL initially')

  // 3. Maker/Checker Separation
  let submitted = await submitDisbursement(draft.id, maker.id)
  assert(submitted.status === 'PENDING_APPROVAL', 'Successfully submitted disbursement')

  try {
    await approveDisbursement(draft.id, maker.id)
    assert(false, 'Should reject maker approving their own request')
  } catch (err: any) {
    assert(err.message.includes('Requester cannot approve their own disbursement'), 'Enforced maker/checker separation')
  }

  // 4. Approval and Double Approval
  let approved = await approveDisbursement(draft.id, checker.id)
  assert(approved.status === 'APPROVED', 'Checker successfully approved')

  try {
    await approveDisbursement(draft.id, checker.id)
    assert(false, 'Should reject double approval')
  } catch (err: any) {
    assert(err.message.includes('Disbursement not in PENDING_APPROVAL state'), 'Prevented double approval')
  }

  // 5. Payment and Journal Generation
  let paid = await payDisbursement(draft.id, assetAccount.id, checker.id)
  assert(paid.status === 'PAID', 'Disbursement paid successfully')
  assert(paid.paymentAccountId === assetAccount.id, 'payment_account_id persisted correctly')

  // Verify Journal
  const [journal] = await db.select().from(financeJournalEntries).where(and(
    eq(financeJournalEntries.sourceType, 'DISBURSEMENT'),
    eq(financeJournalEntries.sourceId, draft.id)
  ))
  assert(!!journal, 'Journal generated for disbursement')

  const lines = await db.select().from(financeJournalLines).where(eq(financeJournalLines.journalEntryId, journal.id))
  assert(lines.length === 2, 'Journal has exactly 2 lines (Dr and Cr)')
  
  const drLine = lines.find(l => l.accountId === expenseAccount.id)
  const crLine = lines.find(l => l.accountId === assetAccount.id)

  assert(drLine?.debit.toString() === '1500000', 'Expense account debited correctly')
  assert(crLine?.credit.toString() === '1500000', 'Asset account credited correctly')
  assert(drLine?.fundId === activeFund.id && crLine?.fundId === activeFund.id, 'Fund dimension maintained on both sides')

  // 6. Double Pay Prevention
  try {
    await payDisbursement(draft.id, assetAccount.id, checker.id)
    assert(false, 'Should reject double pay')
  } catch (err: any) {
    assert(err.message.includes('Only APPROVED disbursements can be paid'), 'Prevented double pay')
  }

  // 7. Cancellation
  try {
    await cancelDisbursement(draft.id, checker.id)
    assert(false, 'Should reject cancellation of PAID disbursement')
  } catch (err: any) {
    assert(err.message.includes('Cannot cancel disbursement in PAID status'), 'Prevented cancellation of PAID disbursement')
  }

  // 8. Reversal
  let reversed = await reverseDisbursement(draft.id, checker.id)
  assert(reversed.status === 'REVERSED', 'Successfully reversed paid disbursement')

  // Verify reversal journal
  const [revJournal] = await db.select().from(financeJournalEntries).where(and(
    eq(financeJournalEntries.sourceType, 'REVERSAL'),
    eq(financeJournalEntries.sourceId, journal.id),
    eq(financeJournalEntries.reversalOfId, journal.id)
  ))
  assert(!!revJournal, 'Reversal journal generated')

  try {
    await reverseDisbursement(draft.id, checker.id)
    assert(false, 'Should reject double reversal')
  } catch (err: any) {
    assert(err.message.includes('Only PAID disbursements can be reversed'), 'Prevented double reversal')
  }

  // 9. Cancel Unpaid
  let draftToCancel = await createDisbursementDraft({
    fundId: activeFund.id,
    categoryId: validCategory.id,
    amount: "100000",
    transactionDate: new Date().toISOString(),
    description: 'To be cancelled',
    beneficiaryName: null
  }, maker.id)
  
  let cancelled = await cancelDisbursement(draftToCancel.id, maker.id)
  assert(cancelled.status === 'CANCELLED', 'Successfully cancelled DRAFT disbursement')

  // 10. Role and Permissions
  const [testRole] = await db.insert(roles).values({ code: `ROLE_${timestamp}`, name: 'Test Disburser' }).returning()
  const managePerm = await db.select().from(permissions).where(eq(permissions.code, 'finance.disbursement.manage'))
  await db.insert(rolePermissions).values({ roleId: testRole.id, permissionId: managePerm[0].id })

  // Clean up
  await db.delete(financeDisbursements).where(inArray(financeDisbursements.id, [draft.id, draftToCancel.id]))
  // Delete Reversals first
  await db.delete(financeJournalEntries).where(and(eq(financeJournalEntries.sourceType, 'REVERSAL'), inArray(financeJournalEntries.sourceId, [journal.id])))
  // Delete Original Journals
  await db.delete(financeJournalEntries).where(and(eq(financeJournalEntries.sourceType, 'DISBURSEMENT'), inArray(financeJournalEntries.sourceId, [draft.id, draftToCancel.id])))
  
  console.log(`\n--- ALL TESTS PASSED (${passCount}/${testCount}) ---`)
}

run().catch(err => {
  console.error(err)
  process.exit(1)
}).finally(() => {
  process.exit(0)
})
