import { financeDb as db } from './tx'
import {
  financeDisbursements,
  financeCategories,
  financeFunds,
  financeCategoryFunds,
  financeAccounts,
  auditLogs,
  financeJournalEntries,
} from '../../drizzle/schema'
import { eq, and } from 'drizzle-orm'
import { generateDocumentNumber } from './sequence'
import { toBigIntSafely } from './utils'
import { postJournalEntry, reverseJournalEntry } from './ledger'
import { sql } from 'drizzle-orm'

class DomainError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'DomainError'
  }
}

/**
 * Validates that category and fund are explicitly allowed in financeCategoryFunds,
 * and that the category is an active EXPENSE category with a default account.
 */
async function validateCategoryAndFund(categoryId: number, fundId: number) {
  const [category] = await db.select().from(financeCategories).where(eq(financeCategories.id, categoryId))
  if (!category) throw new DomainError(404, 'Category not found')
  if (!category.isActive) throw new DomainError(400, 'Category is inactive')
  if (category.type !== 'EXPENSE') throw new DomainError(400, 'Only EXPENSE categories are allowed for disbursements')
  if (!category.defaultAccountId) throw new DomainError(400, 'Category missing default expense account')

  const [fund] = await db.select().from(financeFunds).where(eq(financeFunds.id, fundId))
  if (!fund) throw new DomainError(404, 'Fund not found')
  if (!fund.isActive) throw new DomainError(400, 'Fund is inactive')

  const [mapping] = await db.select().from(financeCategoryFunds)
    .where(and(
      eq(financeCategoryFunds.categoryId, categoryId),
      eq(financeCategoryFunds.fundId, fundId)
    ))

  if (!mapping) throw new DomainError(400, 'Category and Fund are not compatible')

  return category
}

export async function createDisbursementDraft(data: {
  fundId: number,
  categoryId: number,
  amount: string | bigint,
  transactionDate: string,
  description: string,
  beneficiaryName: string | null
}, actorId: number) {
  const amountVal = toBigIntSafely(data.amount.toString())
  if (amountVal <= BigInt(0)) throw new DomainError(400, 'Amount must be greater than 0')

  await validateCategoryAndFund(data.categoryId, data.fundId)

  return await db.transaction(async (tx: any) => {
    const disbursementNumber = await generateDocumentNumber('OUT', tx)

    const [disbursement] = await tx.insert(financeDisbursements).values({
      disbursementNumber,
      fundId: data.fundId,
      categoryId: data.categoryId,
      amount: amountVal,
      transactionDate: data.transactionDate,
      description: data.description,
      beneficiaryName: data.beneficiaryName,
      status: 'DRAFT',
      requestedBy: actorId,
    }).returning()

    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: 'DISBURSEMENT_CREATE',
      entityType: 'FINANCE_DISBURSEMENT',
      entityId: disbursement.id,
      newValues: { 
        disbursementNumber, 
        amount: amountVal.toString(),
        fundId: data.fundId,
        categoryId: data.categoryId
      },
    })

    return disbursement
  })
}

export async function updateDisbursementDraft(id: number, data: {
  fundId?: number,
  categoryId?: number,
  amount?: string | bigint,
  transactionDate?: string,
  description?: string,
  beneficiaryName?: string | null
}, actorId: number) {
  return await db.transaction(async (tx: any) => {
    const [disbursement] = await tx.select().from(financeDisbursements).where(eq(financeDisbursements.id, id))
    if (!disbursement) throw new DomainError(404, 'Disbursement not found')
    if (disbursement.status !== 'DRAFT') throw new DomainError(400, 'Can only edit DRAFT disbursement')

    const updateData: any = { ...data, updatedAt: new Date() }
    
    if (data.amount !== undefined) {
      updateData.amount = toBigIntSafely(data.amount.toString())
      if (updateData.amount <= BigInt(0)) throw new DomainError(400, 'Amount must be greater than 0')
    }

    const checkFundId = data.fundId ?? disbursement.fundId
    const checkCategoryId = data.categoryId ?? disbursement.categoryId
    await validateCategoryAndFund(checkCategoryId, checkFundId)

    const [updated] = await tx.update(financeDisbursements)
      .set(updateData)
      .where(eq(financeDisbursements.id, id))
      .returning()

    const serializedData = Object.fromEntries(
      Object.entries(updateData).map(([k, v]) => [k, typeof v === 'bigint' ? v.toString() : v])
    )

    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: 'DISBURSEMENT_UPDATE_DRAFT',
      entityType: 'FINANCE_DISBURSEMENT',
      entityId: disbursement.id,
      newValues: serializedData,
    })

    return updated
  })
}

export async function submitDisbursement(id: number, actorId: number) {
  return await db.transaction(async (tx: any) => {
    const [disbursement] = await tx.select().from(financeDisbursements).where(eq(financeDisbursements.id, id))
    if (!disbursement) throw new DomainError(404, 'Disbursement not found')
    if (disbursement.status !== 'DRAFT') throw new DomainError(400, 'Can only submit DRAFT disbursement')

    await validateCategoryAndFund(disbursement.categoryId, disbursement.fundId)

    const [updated] = await tx.update(financeDisbursements)
      .set({ status: 'PENDING_APPROVAL', updatedAt: new Date() })
      .where(eq(financeDisbursements.id, id))
      .returning()

    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: 'DISBURSEMENT_SUBMIT',
      entityType: 'FINANCE_DISBURSEMENT',
      entityId: id,
    })

    return updated
  })
}

export async function approveDisbursement(id: number, actorId: number) {
  return await db.transaction(async (tx: any) => {
    // lock and revalidate
    const res = await tx.execute(
      sql`SELECT id, status, requested_by, category_id, fund_id FROM finance_disbursements WHERE id = ${id} FOR UPDATE`
    )
    const disbursement = res.rows[0] as any

    if (!disbursement) throw new DomainError(404, 'Disbursement not found')
    if (disbursement.status !== 'PENDING_APPROVAL') throw new DomainError(400, 'Disbursement not in PENDING_APPROVAL state')
    if (Number(disbursement.requested_by) === actorId) throw new DomainError(403, 'Requester cannot approve their own disbursement (Maker/Checker separation)')

    await validateCategoryAndFund(Number(disbursement.category_id), Number(disbursement.fund_id))

    const [updated] = await tx.update(financeDisbursements)
      .set({ 
        status: 'APPROVED', 
        approvedBy: actorId,
        approvedAt: new Date(),
        updatedAt: new Date() 
      })
      .where(eq(financeDisbursements.id, id))
      .returning()

    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: 'DISBURSEMENT_APPROVE',
      entityType: 'FINANCE_DISBURSEMENT',
      entityId: id,
    })

    return updated
  })
}

export async function payDisbursement(id: number, paymentAccountId: number, actorId: number) {
  return await db.transaction(async (tx: any) => {
    // lock and revalidate
    const res = await tx.execute(
      sql`SELECT id, status, amount, category_id, fund_id, transaction_date, description FROM finance_disbursements WHERE id = ${id} FOR UPDATE`
    )
    const disbursement = res.rows[0] as any

    if (!disbursement) throw new DomainError(404, 'Disbursement not found')
    if (disbursement.status !== 'APPROVED') throw new DomainError(400, 'Only APPROVED disbursements can be paid')

    const category = await validateCategoryAndFund(Number(disbursement.category_id), Number(disbursement.fund_id))
    
    // Validate Expense Account (from Category)
    const [expenseAccount] = await tx.select().from(financeAccounts).where(eq(financeAccounts.id, category.defaultAccountId!))
    if (!expenseAccount) throw new DomainError(400, 'Expense Account not found')
    if (!expenseAccount.isActive) throw new DomainError(400, 'Expense Account is inactive')
    if (expenseAccount.accountType !== 'EXPENSE') throw new DomainError(400, 'Category default account must be an EXPENSE account')

    // Validate Payment Account
    const [paymentAccount] = await tx.select().from(financeAccounts).where(eq(financeAccounts.id, paymentAccountId))
    if (!paymentAccount) throw new DomainError(400, 'Payment Account not found')
    if (!paymentAccount.isActive) throw new DomainError(400, 'Payment Account is inactive')
    if (paymentAccount.accountType !== 'ASSET') throw new DomainError(400, 'Payment account must be an ASSET account')

    // Post Journal
    const amountVal = BigInt(disbursement.amount)
    
    await postJournalEntry({
      sourceType: 'DISBURSEMENT',
      sourceId: disbursement.id,
      sourceEvent: 'PAID',
      transactionDate: disbursement.transaction_date,
      description: disbursement.description,
      lines: [
        {
          accountId: expenseAccount.id, // Dr Expense
          fundId: Number(disbursement.fund_id),
          debit: amountVal,
          credit: BigInt(0)
        },
        {
          accountId: paymentAccount.id, // Cr Asset
          fundId: Number(disbursement.fund_id),
          debit: BigInt(0),
          credit: amountVal
        }
      ]
    }, tx)

    const [updated] = await tx.update(financeDisbursements)
      .set({ 
        status: 'PAID', 
        paymentAccountId,
        paidBy: actorId,
        paidAt: new Date(),
        updatedAt: new Date() 
      })
      .where(eq(financeDisbursements.id, id))
      .returning()

    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: 'DISBURSEMENT_PAY',
      entityType: 'FINANCE_DISBURSEMENT',
      entityId: id,
      newValues: { paymentAccountId },
    })

    return updated
  })
}

export async function cancelDisbursement(id: number, actorId: number) {
  return await db.transaction(async (tx: any) => {
    const [disbursement] = await tx.select().from(financeDisbursements).where(eq(financeDisbursements.id, id))
    if (!disbursement) throw new DomainError(404, 'Disbursement not found')
    if (['PAID', 'CANCELLED', 'REVERSED'].includes(disbursement.status)) {
      throw new DomainError(400, `Cannot cancel disbursement in ${disbursement.status} status`)
    }

    const [updated] = await tx.update(financeDisbursements)
      .set({ status: 'CANCELLED', updatedAt: new Date() })
      .where(eq(financeDisbursements.id, id))
      .returning()

    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: 'DISBURSEMENT_CANCEL',
      entityType: 'FINANCE_DISBURSEMENT',
      entityId: id,
    })

    return updated
  })
}

export async function reverseDisbursement(id: number, actorId: number) {
  return await db.transaction(async (tx: any) => {
    // lock
    const res = await tx.execute(
      sql`SELECT id, status FROM finance_disbursements WHERE id = ${id} FOR UPDATE`
    )
    const disbursement = res.rows[0] as any

    if (!disbursement) throw new DomainError(404, 'Disbursement not found')
    if (disbursement.status !== 'PAID') throw new DomainError(400, 'Only PAID disbursements can be reversed')

    const originalJournal = await tx.select().from(financeJournalEntries)
      .where(and(
        eq(financeJournalEntries.sourceType, 'DISBURSEMENT'),
        eq(financeJournalEntries.sourceId, id),
        eq(financeJournalEntries.sourceEvent, 'PAID')
      )).limit(1)

    if (originalJournal.length === 0) throw new DomainError(404, 'Original journal not found')

    await reverseJournalEntry(originalJournal[0].id, actorId, tx)

    const [updated] = await tx.update(financeDisbursements)
      .set({ status: 'REVERSED', updatedAt: new Date() })
      .where(eq(financeDisbursements.id, id))
      .returning()

    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: 'DISBURSEMENT_REVERSE',
      entityType: 'FINANCE_DISBURSEMENT',
      entityId: id,
    })

    return updated
  })
}
