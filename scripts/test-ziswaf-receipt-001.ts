import { db } from '../lib/db/client'
import {
  users,
  roles,
  permissions,
  rolePermissions,
  userRoles,
  financeParties,
  financeCampaigns,
  financeCategories,
  financeFunds,
  financeCategoryFunds,
  financeAccounts,
  ziswafReceipts,
  financeJournalEntries,
  financeJournalLines
} from '../drizzle/schema'
import { eq, inArray, and } from 'drizzle-orm'
import {
  createParty,
  createCampaign,
  createReceiptDraft,
  allocateReceipt,
  confirmZiswafReceipt,
  cancelReceipt,
  refundZiswafReceipt
} from '../lib/finance/ziswaf'
import { toBigIntSafely, serializeAmountForApi } from '../lib/finance/utils'

async function run() {
  console.log('--- STARTING ZISWAF RECEIPT TESTS ---')

  // Setup mock user
  const [admin] = await db.insert(users).values({
    fullName: 'ZISWAF Test Admin',
    email: `ziswaf_admin_${Date.now()}@test.com`,
    passwordHash: 'hash',
    role: 'admin',
    phone: `0811${Date.now().toString().slice(-8)}`
  }).returning()

  // Setup permissions dynamically
  const [ziswafRole] = await db.insert(roles).values({ code: `ZISWAF_ADMIN_${Date.now()}`, name: 'ZISWAF Admin' }).returning()
  const perms = ['finance.ziswaf.view', 'finance.ziswaf.manage', 'finance.ziswaf.refund']
  
  for (const code of perms) {
    const [p] = await db.insert(permissions).values({ code, name: code }).onConflictDoUpdate({ target: permissions.code, set: { name: code } }).returning()
    await db.insert(rolePermissions).values({ roleId: ziswafRole.id, permissionId: p.id }).onConflictDoNothing()
  }
  
  await db.insert(userRoles).values({ userId: admin.id, roleId: ziswafRole.id })
  const { hasPermission } = await import('../lib/auth/rbac')
  const session = { userId: admin.id, role: 'guru' } // guru base, but has ziswaf admin dynamic role
  if (!(await hasPermission(session as any, 'finance.ziswaf.manage'))) throw new Error('Dynamic ZISWAF permission failed')

  // Setup Asset and Income Accounts
  const [bankAccount] = await db.insert(financeAccounts).values({
    code: `BANK_ZIS_${Date.now()}`,
    name: 'Bank BSI ZISWAF Test',
    accountType: 'ASSET'
  }).returning()

  const [zakatIncomeAccount] = await db.insert(financeAccounts).values({
    code: `INC_ZAKAT_${Date.now()}`,
    name: 'Pendapatan Zakat Test',
    accountType: 'INCOME'
  }).returning()

  const [sedekahIncomeAccount] = await db.insert(financeAccounts).values({
    code: `INC_SDKH_${Date.now()}`,
    name: 'Pendapatan Sedekah Test',
    accountType: 'INCOME'
  }).returning()

  // Setup Funds
  const [zakatFund] = await db.insert(financeFunds).values({
    code: `FUND_ZAKAT_${Date.now()}`,
    name: 'Dana Zakat Test',
    fundType: 'ZAKAT',
    restrictionType: 'RESTRICTED'
  }).returning()

  const [operasionalFund] = await db.insert(financeFunds).values({
    code: `FUND_OPS_${Date.now()}`,
    name: 'Dana Operasional Test',
    fundType: 'OPERASIONAL',
    restrictionType: 'UNRESTRICTED'
  }).returning()

  // Setup Categories
  const [zakatCategory] = await db.insert(financeCategories).values({
    code: `CAT_ZAKAT_${Date.now()}`,
    name: 'Zakat Maal Test',
    type: 'INCOME',
    domain: 'ZISWAF',
    ziswafType: 'ZAKAT',
    defaultAccountId: zakatIncomeAccount.id
  }).returning()

  const [sedekahCategory] = await db.insert(financeCategories).values({
    code: `CAT_SDKH_${Date.now()}`,
    name: 'Sedekah Umum Test',
    type: 'INCOME',
    domain: 'ZISWAF',
    ziswafType: 'SEDEKAH',
    defaultAccountId: sedekahIncomeAccount.id
  }).returning()

  // Setup Category-Fund Whitelists
  await db.insert(financeCategoryFunds).values([
    { categoryId: zakatCategory.id, fundId: zakatFund.id, isDefault: true },
    { categoryId: sedekahCategory.id, fundId: operasionalFund.id, isDefault: true },
    // Intentionally omit zakatCategory -> operasionalFund mapping
  ])

  // Test 1: Party Creation
  console.log('Testing Party Creation...')
  const party = await createParty({ name: 'H. Abdullah', partyType: 'MUZAKKI' })
  if (!party || party.name !== 'H. Abdullah') throw new Error('Party creation failed')
  console.log('✓ Party Creation passed')

  // Test 2: Campaign Creation
  console.log('Testing Campaign Creation...')
  const campaign = await createCampaign({
    code: `CAMP_${Date.now()}`,
    name: 'Zakat Ramadhan Test',
    domain: 'ZISWAF',
    defaultFundId: zakatFund.id
  }, admin.id)
  if (!campaign) throw new Error('Campaign creation failed')
  console.log('✓ Campaign Creation passed')

  // Test 3: Receipt Creation & Invalid Allocation Check
  console.log('Testing Receipt Allocation (Valid & Invalid)...')
  const receipt1 = await createReceiptDraft({
    partyId: party.id,
    categoryId: zakatCategory.id,
    ziswafType: 'ZAKAT',
    amount: toBigIntSafely(1000000),
    receivedDate: '2026-09-14',
    paymentMethod: 'BANK_TRANSFER',
    destinationAccountId: bankAccount.id,
  }, admin.id)

  try {
    await allocateReceipt(receipt1.id, [{ fundId: operasionalFund.id, amount: BigInt(1000000) }], admin.id)
    throw new Error('Should have rejected incompatible fund (Zakat -> Operational)')
  } catch (e: any) {
    if (!e.message.includes('not compatible')) throw e
  }

  // Valid Allocation
  await allocateReceipt(receipt1.id, [{ fundId: zakatFund.id, amount: BigInt(1000000) }], admin.id)
  console.log('✓ Receipt Allocation (Whitelist) passed')

  // Test 4: Confirm Receipt & Journal
  console.log('Testing Receipt Confirm & Journal generation...')
  await confirmZiswafReceipt(receipt1.id, admin.id)
  
  const [confirmedReceipt1] = await db.select().from(ziswafReceipts).where(eq(ziswafReceipts.id, receipt1.id))
  if (confirmedReceipt1.status !== 'CONFIRMED') throw new Error('Status not updated to CONFIRMED')

  const journals = await db.select().from(financeJournalEntries).where(and(eq(financeJournalEntries.sourceType, 'ZISWAF_RECEIPT'), eq(financeJournalEntries.sourceId, receipt1.id)))
  if (journals.length !== 1) throw new Error('Should create exactly one journal')
  
  const lines = await db.select().from(financeJournalLines).where(eq(financeJournalLines.journalEntryId, journals[0].id))
  if (lines.length !== 2) throw new Error('Should create 2 journal lines')

  const debitLine = lines.find(l => l.debit === BigInt(1000000))
  const creditLine = lines.find(l => l.credit === BigInt(1000000))
  if (!debitLine || debitLine.accountId !== bankAccount.id || debitLine.fundId !== zakatFund.id) throw new Error('Invalid debit line')
  if (!creditLine || creditLine.accountId !== zakatIncomeAccount.id || creditLine.fundId !== zakatFund.id) throw new Error('Invalid credit line')
  
  console.log('✓ Receipt Confirm & Balanced Journal passed')

  // Test 5: Classification Bypass Check
  console.log('Testing Classification Bypass (ZiswafType mismatch)...')
  const receipt2 = await createReceiptDraft({
    partyId: null, // anonymous
    categoryId: sedekahCategory.id, // Sedekah category
    ziswafType: 'ZAKAT', // User tried to force ZAKAT
    amount: BigInt(50000),
    receivedDate: '2026-09-14',
    paymentMethod: 'CASH',
    destinationAccountId: bankAccount.id,
  }, admin.id)

  await allocateReceipt(receipt2.id, [{ fundId: operasionalFund.id, amount: BigInt(50000) }], admin.id)
  
  try {
    await confirmZiswafReceipt(receipt2.id, admin.id)
    throw new Error('Should have rejected ziswafType mismatch')
  } catch (e: any) {
    if (!e.message.includes('ZISWAF type mismatch')) throw e
  }
  
  // Cleanly cancel the failed attempt
  await cancelReceipt(receipt2.id, admin.id)
  const [canceledReceipt] = await db.select().from(ziswafReceipts).where(eq(ziswafReceipts.id, receipt2.id))
  if (canceledReceipt.status !== 'CANCELLED') throw new Error('Cancel failed')
  console.log('✓ Classification Bypass rejected and Cancel passed')

  // Test 6: Refund
  console.log('Testing Full Refund...')
  await refundZiswafReceipt(receipt1.id, admin.id)
  const [refundedReceipt] = await db.select().from(ziswafReceipts).where(eq(ziswafReceipts.id, receipt1.id))
  if (refundedReceipt.status !== 'REFUNDED') throw new Error('Status not REFUNDED')
  
  const reversalJournal = await db.select().from(financeJournalEntries).where(eq(financeJournalEntries.reversalOfId, journals[0].id))
  if (reversalJournal.length !== 1) throw new Error('Reversal journal missing')
  console.log('✓ Full Refund passed')

  console.log('--- ALL ZISWAF TESTS PASSED ---')
}

run().catch(err => {
  console.error(err)
  process.exit(1)
}).finally(() => {
  process.exit(0)
})
