import { financeDb } from './tx'
import { financeDisbursements, auditLogs } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import { postJournalEntry } from './ledger'

export async function payDisbursement(
  disbursementId: number,
  expenseAccountId: number,
  paidBy: number
): Promise<void> {
  await financeDb.transaction(async (tx) => {
    const [disbursement] = await tx.select()
      .from(financeDisbursements)
      .where(eq(financeDisbursements.id, disbursementId))
      .limit(1)

    if (!disbursement) throw new Error('Disbursement not found')
    if (disbursement.status !== 'APPROVED') throw new Error('Disbursement is not APPROVED')

    // Mark paid
    await tx.update(financeDisbursements)
      .set({
        status: 'PAID',
        paidBy,
        paidAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(financeDisbursements.id, disbursementId))

    // Post to ledger: Dr Expense, Cr Cash/Bank
    await postJournalEntry({
      transactionDate: new Date(),
      description: `Payment for disbursement ${disbursement.disbursementNumber}`,
      sourceType: 'DISBURSEMENT',
      sourceId: disbursementId,
      sourceEvent: 'PAY',
      createdBy: paidBy,
      lines: [
        {
          accountId: expenseAccountId,
          fundId: disbursement.fundId,
          debit: disbursement.amount,
          credit: BigInt(0),
          description: disbursement.description,
        },
        {
          accountId: disbursement.accountId, // This is the Bank/Cash account paying out
          debit: BigInt(0),
          credit: disbursement.amount,
          description: `Disbursement ${disbursement.disbursementNumber}`,
        }
      ]
    }, tx)

    await tx.insert(auditLogs).values({
      actorUserId: paidBy,
      action: 'PAY',
      entityType: 'DISBURSEMENT',
      entityId: disbursementId,
      newValues: { status: 'PAID' },
    })
  })
}
