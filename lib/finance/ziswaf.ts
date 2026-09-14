import { financeDb } from './tx'
import {
  financeParties,
  financeCampaigns,
  ziswafReceipts,
  ziswafReceiptAllocations,
  financeCategories,
  financeCategoryFunds,
  financeAccounts,
  auditLogs,
  financeJournalEntries,
} from '@/drizzle/schema'
import { eq, and, sql, inArray } from 'drizzle-orm'
import { postJournalEntry, reverseJournalEntry } from './ledger'
import { generateDocumentNumber } from './sequence'

// ------------------------------------------------------------------
// PARTIES (DONORS)
// ------------------------------------------------------------------
export async function createParty(data: {
  name: string
  phone?: string | null
  email?: string | null
  address?: string | null
  partyType: string
  userId?: number | null
}) {
  return await financeDb.transaction(async (tx) => {
    const [party] = await tx.insert(financeParties).values(data).returning()
    await tx.insert(auditLogs).values({
      actorUserId: data.userId ?? null, // Just for fallback if actor is same as donor
      action: 'CREATE',
      entityType: 'ZISWAF_PARTY',
      entityId: party.id,
      newValues: data,
    })
    return party
  })
}

export async function updateParty(id: number, data: Partial<typeof financeParties.$inferInsert>, actorId: number) {
  return await financeDb.transaction(async (tx) => {
    const [party] = await tx.update(financeParties).set({ ...data, updatedAt: new Date() }).where(eq(financeParties.id, id)).returning()
    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: 'UPDATE',
      entityType: 'ZISWAF_PARTY',
      entityId: party.id,
      newValues: data,
    })
    return party
  })
}

// ------------------------------------------------------------------
// CAMPAIGNS
// ------------------------------------------------------------------
export async function createCampaign(data: typeof financeCampaigns.$inferInsert, actorId: number) {
  return await financeDb.transaction(async (tx) => {
    const [campaign] = await tx.insert(financeCampaigns).values(data).returning()
    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: 'CREATE',
      entityType: 'ZISWAF_CAMPAIGN',
      entityId: campaign.id,
      newValues: data,
    })
    return campaign
  })
}

export async function updateCampaign(id: number, data: Partial<typeof financeCampaigns.$inferInsert>, actorId: number) {
  return await financeDb.transaction(async (tx) => {
    const [campaign] = await tx.update(financeCampaigns).set(data).where(eq(financeCampaigns.id, id)).returning()
    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: 'UPDATE',
      entityType: 'ZISWAF_CAMPAIGN',
      entityId: campaign.id,
      newValues: data,
    })
    return campaign
  })
}

// ------------------------------------------------------------------
// RECEIPTS (DRAFT)
// ------------------------------------------------------------------
export async function createReceiptDraft(data: Omit<typeof ziswafReceipts.$inferInsert, 'receiptNumber' | 'status'>, actorId: number) {
  return await financeDb.transaction(async (tx) => {
    const receiptNumber = await generateDocumentNumber('ZIS', tx)

    const [receipt] = await tx.insert(ziswafReceipts).values({
      ...data,
      receiptNumber,
      status: 'DRAFT',
    }).returning()

    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: 'CREATE',
      entityType: 'ZISWAF_RECEIPT',
      entityId: receipt.id,
      newValues: { receiptNumber, amount: data.amount.toString() },
    })

    return receipt
  })
}

export async function updateReceiptDraft(id: number, data: Partial<typeof ziswafReceipts.$inferInsert>, actorId: number) {
  return await financeDb.transaction(async (tx) => {
    const [existing] = await tx.select().from(ziswafReceipts).where(eq(ziswafReceipts.id, id))
    if (!existing) throw new Error('Receipt not found')
    if (existing.status !== 'DRAFT') throw new Error('Cannot edit non-DRAFT receipt')

    // If amount changes, we should ensure allocations don't exceed new amount
    if (data.amount !== undefined) {
      const [{ sum }] = await tx.select({ sum: sql<number>`sum(amount)` })
        .from(ziswafReceiptAllocations)
        .where(eq(ziswafReceiptAllocations.receiptId, id))
      
      const allocatedAmount = BigInt(sum || 0)
      if (allocatedAmount > BigInt(data.amount)) {
        throw new Error('New amount cannot be less than current allocated amount')
      }
    }

    const [receipt] = await tx.update(ziswafReceipts).set({ ...data, updatedAt: new Date() }).where(eq(ziswafReceipts.id, id)).returning()
    
    const serializedData = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, typeof v === 'bigint' ? v.toString() : v])
    )
    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: 'UPDATE_DRAFT',
      entityType: 'ZISWAF_RECEIPT',
      entityId: receipt.id,
      newValues: serializedData,
    })

    return receipt
  })
}

export async function allocateReceipt(receiptId: number, fundAllocations: { fundId: number; amount: bigint }[], actorId: number) {
  return await financeDb.transaction(async (tx) => {
    const [receipt] = await tx.select().from(ziswafReceipts).where(eq(ziswafReceipts.id, receiptId))
    if (!receipt) throw new Error('Receipt not found')
    if (receipt.status !== 'DRAFT') throw new Error('Cannot allocate non-DRAFT receipt')

    // Validate funds compatibility
    for (const alloc of fundAllocations) {
      if (alloc.amount <= BigInt(0)) throw new Error('Allocation amount must be positive')
      const [mapping] = await tx.select()
        .from(financeCategoryFunds)
        .where(and(
          eq(financeCategoryFunds.categoryId, receipt.categoryId),
          eq(financeCategoryFunds.fundId, alloc.fundId)
        ))
      if (!mapping) {
        throw new Error(`Fund ${alloc.fundId} is not compatible with category ${receipt.categoryId}`)
      }
    }

    let totalAlloc = fundAllocations.reduce((acc, a) => acc + a.amount, BigInt(0))
    if (totalAlloc > receipt.amount) {
      throw new Error('Total allocation exceeds receipt amount')
    }

    // Clear old
    await tx.delete(ziswafReceiptAllocations).where(eq(ziswafReceiptAllocations.receiptId, receiptId))

    // Insert new
    if (fundAllocations.length > 0) {
      await tx.insert(ziswafReceiptAllocations).values(
        fundAllocations.map(a => ({
          receiptId,
          fundId: a.fundId,
          amount: a.amount
        }))
      )
    }

    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: 'ALLOCATE',
      entityType: 'ZISWAF_RECEIPT',
      entityId: receiptId,
      newValues: { allocations: fundAllocations.map(a => ({ fundId: a.fundId, amount: a.amount.toString() })) },
    })
  })
}

export async function cancelReceipt(receiptId: number, actorId: number) {
  return await financeDb.transaction(async (tx) => {
    const [receipt] = await tx.select().from(ziswafReceipts).where(eq(ziswafReceipts.id, receiptId))
    if (!receipt) throw new Error('Receipt not found')
    if (receipt.status !== 'DRAFT') throw new Error('Only DRAFT receipts can be cancelled via this method')

    await tx.update(ziswafReceipts).set({ status: 'CANCELLED', updatedAt: new Date() }).where(eq(ziswafReceipts.id, receiptId))

    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: 'CANCEL',
      entityType: 'ZISWAF_RECEIPT',
      entityId: receiptId,
      newValues: { status: 'CANCELLED' },
    })
  })
}

// ------------------------------------------------------------------
// RECEIPTS (CONFIRM & REFUND)
// ------------------------------------------------------------------
export async function confirmZiswafReceipt(receiptId: number, actorId: number) {
  return await financeDb.transaction(async (tx) => {
    const [receipt] = await tx.select().from(ziswafReceipts).where(eq(ziswafReceipts.id, receiptId))
    if (!receipt) throw new Error('Receipt not found')
    if (receipt.status !== 'DRAFT') throw new Error('Receipt is not in DRAFT state')

    // 1. Validate Category
    const [category] = await tx.select().from(financeCategories).where(eq(financeCategories.id, receipt.categoryId))
    if (!category) throw new Error('Category not found')
    if (!category.isActive) throw new Error('Category is inactive')
    if (category.domain !== 'ZISWAF') throw new Error('Category domain must be ZISWAF')
    if (category.type !== 'INCOME') throw new Error('Category type must be INCOME')
    if (category.ziswafType !== receipt.ziswafType) throw new Error('ZISWAF type mismatch between receipt and category')
    if (!category.defaultAccountId) throw new Error('Category missing default account ID')

    // 2. Validate Default Income Account
    const [incomeAccount] = await tx.select().from(financeAccounts).where(eq(financeAccounts.id, category.defaultAccountId))
    if (!incomeAccount) throw new Error('Category default income account not found')
    if (!incomeAccount.isActive) throw new Error('Category default income account is inactive')
    if (incomeAccount.accountType !== 'INCOME') throw new Error('Category default account is not INCOME type')

    // 3. Validate Destination Asset Account
    const [assetAccount] = await tx.select().from(financeAccounts).where(eq(financeAccounts.id, receipt.destinationAccountId))
    if (!assetAccount) throw new Error('Destination account not found')
    if (!assetAccount.isActive) throw new Error('Destination account is inactive')
    if (assetAccount.accountType !== 'ASSET') throw new Error('Destination account must be ASSET type')

    // 4. Validate Allocations
    const allocations = await tx.select().from(ziswafReceiptAllocations).where(eq(ziswafReceiptAllocations.receiptId, receiptId))
    let totalAlloc = BigInt(0)
    for (const alloc of allocations) {
      if (alloc.amount <= BigInt(0)) throw new Error('Allocation amount must be positive')
      totalAlloc += alloc.amount

      const [mapping] = await tx.select()
        .from(financeCategoryFunds)
        .where(and(
          eq(financeCategoryFunds.categoryId, receipt.categoryId),
          eq(financeCategoryFunds.fundId, alloc.fundId)
        ))
      if (!mapping) throw new Error(`Incompatible fund ${alloc.fundId} for category ${receipt.categoryId}`)
    }
    if (totalAlloc !== receipt.amount) throw new Error('Allocations sum must exactly equal receipt amount')

    // 5. Build Journal Lines (Group by Account and Fund)
    const lines: Array<{ accountId: number; fundId: number; debit: bigint; credit: bigint; description: string }> = []
    
    for (const alloc of allocations) {
      // Debit: Bank/Asset account + Fund
      lines.push({
        accountId: assetAccount.id,
        fundId: alloc.fundId,
        debit: alloc.amount,
        credit: BigInt(0),
        description: `Penerimaan ZISWAF - ${receipt.receiptNumber}`
      })
      
      // Credit: Income account + Fund
      lines.push({
        accountId: incomeAccount.id,
        fundId: alloc.fundId,
        debit: BigInt(0),
        credit: alloc.amount,
        description: `Penerimaan ZISWAF - ${receipt.receiptNumber}`
      })
    }

    // 6. Post Journal
    await postJournalEntry({
      transactionDate: new Date(), // use current time for accounting, or receipt.receivedDate? ZISWAF is direct receipt so date of receipt or now. Usually receivedDate.
      description: `Penerimaan ZISWAF ${receipt.receiptNumber}`,
      sourceType: 'ZISWAF_RECEIPT',
      sourceId: receipt.id,
      sourceEvent: 'CONFIRMED',
      createdBy: actorId,
      lines: lines as any
    }, tx)

    // 7. Mark receipt confirmed
    await tx.update(ziswafReceipts).set({
      status: 'CONFIRMED',
      confirmedBy: actorId,
      updatedAt: new Date()
    }).where(eq(ziswafReceipts.id, receiptId))

    // 8. Audit
    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: 'CONFIRM',
      entityType: 'ZISWAF_RECEIPT',
      entityId: receipt.id,
      newValues: { status: 'CONFIRMED' },
    })
  })
}

export async function refundZiswafReceipt(receiptId: number, actorId: number) {
  return await financeDb.transaction(async (tx) => {
    const [receipt] = await tx.select().from(ziswafReceipts).where(eq(ziswafReceipts.id, receiptId))
    if (!receipt) throw new Error('Receipt not found')
    if (receipt.status !== 'CONFIRMED') throw new Error('Only CONFIRMED receipts can be refunded')

    // Verify journal exists
    const [originalJournal] = await tx.select().from(financeJournalEntries).where(and(
      eq(financeJournalEntries.sourceType, 'ZISWAF_RECEIPT'),
      eq(financeJournalEntries.sourceId, receipt.id),
      eq(financeJournalEntries.sourceEvent, 'CONFIRMED'),
      eq(financeJournalEntries.status, 'POSTED')
    ))
    if (!originalJournal) throw new Error('Original journal not found')

    // Reverse journal
    await reverseJournalEntry(originalJournal.id, actorId, tx)

    // Update receipt status
    await tx.update(ziswafReceipts).set({
      status: 'REFUNDED',
      updatedAt: new Date()
    }).where(eq(ziswafReceipts.id, receiptId))

    // Audit
    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: 'REFUND',
      entityType: 'ZISWAF_RECEIPT',
      entityId: receipt.id,
      newValues: { status: 'REFUNDED' },
    })
  })
}
