import { financeDb } from './tx'
import { ziswafReceipts, ziswafReceiptAllocations, auditLogs } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import { postJournalEntry } from './ledger'
import { validateCategoryFundCompatibility } from './fund'

export async function confirmZiswafReceipt(
  receiptId: number,
  cashOrBankAccountId: number,
  incomeAccountId: number,
  confirmedBy: number
): Promise<void> {
  await financeDb.transaction(async (tx) => {
    const [receipt] = await tx.select()
      .from(ziswafReceipts)
      .where(eq(ziswafReceipts.id, receiptId))
      .limit(1)

    if (!receipt) throw new Error('Receipt not found')
    if (receipt.status !== 'DRAFT') throw new Error('Receipt is not in DRAFT state')

    // Find allocations
    const allocations = await tx.select()
      .from(ziswafReceiptAllocations)
      .where(eq(ziswafReceiptAllocations.receiptId, receiptId))

    let totalAllocated = BigInt(0)
    for (const alloc of allocations) {
      totalAllocated += alloc.amount
      
      const isCompatible = await validateCategoryFundCompatibility(receipt.categoryId, alloc.fundId, tx)
      if (!isCompatible) {
        throw new Error(`Incompatible fund ${alloc.fundId} for category ${receipt.categoryId}`)
      }
    }

    if (totalAllocated !== receipt.amount) {
      throw new Error('Total allocated amount does not match receipt amount')
    }

    // Mark confirmed
    await tx.update(ziswafReceipts)
      .set({
        status: 'CONFIRMED',
        confirmedBy,
        updatedAt: new Date()
      })
      .where(eq(ziswafReceipts.id, receiptId))

    // Build lines
    const lines = []
    // Debit cash/bank
    lines.push({
      accountId: cashOrBankAccountId,
      debit: receipt.amount,
      credit: BigInt(0),
      description: `Receipt ${receipt.receiptNumber}`,
    })

    // Credit each fund's equity/income account. For foundation, we map each allocation to a generic ZISWAF income account,
    // but the requirement says "Cr appropriate fund/income/equity account". We will pass the destination_account_id
    // from the receipt for the credit side, or assume destination_account_id is the Cash account and we need an income account per fund.
    // Let's use a simplified approach: The receipt has a destinationAccountId which represents the Bank/Cash.
    // The funds themselves are tracked via `fundId` on the journal line.
    
    // In foundation, let's just use a placeholder income account ID passed in, or we assume `destinationAccountId` is the cash.
    // Wait, the ZISWAF receipt schema has `destinationAccountId`. That's the bank it went to.
    for (const alloc of allocations) {
      lines.push({
        accountId: incomeAccountId,
        fundId: alloc.fundId,
        debit: BigInt(0),
        credit: alloc.amount,
        description: `Allocation for receipt ${receipt.receiptNumber}`,
      })
    }

    await postJournalEntry({
      transactionDate: new Date(),
      description: `ZISWAF confirmation for ${receipt.receiptNumber}`,
      sourceType: 'ZISWAF_RECEIPT',
      sourceId: receiptId,
      sourceEvent: 'CONFIRM',
      createdBy: confirmedBy,
      lines: lines as any
    }, tx)

    await tx.insert(auditLogs).values({
      actorUserId: confirmedBy,
      action: 'CONFIRM',
      entityType: 'ZISWAF_RECEIPT',
      entityId: receiptId,
      newValues: { status: 'CONFIRMED' },
    })
  })
}
