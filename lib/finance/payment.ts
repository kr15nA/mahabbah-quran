import { financeDb } from './tx'
import { financePayments, financeInvoices, financePaymentAllocations, auditLogs } from '@/drizzle/schema'
import { eq, inArray, sum } from 'drizzle-orm'
import { postJournalEntry } from './ledger'

export async function confirmPayment(
  paymentId: number,
  cashOrBankAccountId: number,
  receivableAccountId: number,
  confirmedBy: number
): Promise<void> {
  await financeDb.transaction(async (tx) => {
    const [payment] = await tx.select()
      .from(financePayments)
      .where(eq(financePayments.id, paymentId))
      .limit(1)

    if (!payment) throw new Error('Payment not found')
    if (payment.status !== 'PENDING') throw new Error('Payment is not in PENDING state')

    // Mark confirmed
    await tx.update(financePayments)
      .set({
        status: 'CONFIRMED',
        confirmedBy,
        updatedAt: new Date()
      })
      .where(eq(financePayments.id, paymentId))

    // Post to ledger: Dr Cash/Bank, Cr Receivable
    await postJournalEntry({
      transactionDate: new Date(),
      description: `Payment confirmation for ${payment.paymentNumber}`,
      sourceType: 'PAYMENT',
      sourceId: paymentId,
      sourceEvent: 'CONFIRM',
      createdBy: confirmedBy,
      lines: [
        {
          accountId: cashOrBankAccountId,
          debit: payment.amount,
          credit: BigInt(0),
          description: `Cash received for payment ${payment.paymentNumber}`,
        },
        {
          accountId: receivableAccountId,
          debit: BigInt(0),
          credit: payment.amount,
          description: `Clear receivable for payment ${payment.paymentNumber}`,
        }
      ]
    }, tx)

    await tx.insert(auditLogs).values({
      actorUserId: confirmedBy,
      action: 'CONFIRM',
      entityType: 'PAYMENT',
      entityId: paymentId,
      newValues: { status: 'CONFIRMED' },
    })
  })
}
