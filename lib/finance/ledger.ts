import { db } from '@/lib/db/client'
import { financeJournalEntries, financeJournalLines } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import { generateDocumentNumber } from './sequence'

export interface JournalLineInput {
  accountId: number
  fundId?: number | null
  debit: bigint
  credit: bigint
  description?: string
}

export interface JournalEntryInput {
  transactionDate: Date
  description: string
  sourceType: string
  sourceId: number
  sourceEvent: string
  createdBy?: number | null
  lines: JournalLineInput[]
  reversalOfId?: number
}

export async function postJournalEntry(input: JournalEntryInput, tx?: any): Promise<number> {
  const execDb = tx ?? db

  // Validate total debit == total credit
  let totalDebit = BigInt(0)
  let totalCredit = BigInt(0)

  if (!input.lines || input.lines.length < 2) {
    throw new Error('A journal entry must have at least two lines')
  }

  for (const line of input.lines) {
    if (line.debit < BigInt(0) || line.credit < BigInt(0)) {
      throw new Error('Debit and credit cannot be negative')
    }
    if (line.debit > BigInt(0) && line.credit > BigInt(0)) {
      throw new Error('A single line cannot have both debit and credit > 0')
    }
    if (line.debit === BigInt(0) && line.credit === BigInt(0)) {
      throw new Error('A line must have either debit or credit > 0')
    }
    totalDebit += line.debit
    totalCredit += line.credit
  }

  if (totalDebit !== totalCredit) {
    throw new Error('Journal is not balanced: Total Debit != Total Credit')
  }

  const journalNumber = await generateDocumentNumber('JRN', execDb)

  const [header] = await execDb.insert(financeJournalEntries).values({
    journalNumber,
    transactionDate: input.transactionDate,
    description: input.description,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    sourceEvent: input.sourceEvent,
    status: 'POSTED',
    createdBy: input.createdBy ?? null,
    postedBy: input.createdBy ?? null,
    postedAt: new Date(),
    reversalOfId: input.reversalOfId ?? null,
  }).returning({ id: financeJournalEntries.id })

  const mappedLines = input.lines.map((l: JournalLineInput) => ({
    journalEntryId: header.id,
    accountId: l.accountId,
    fundId: l.fundId ?? null,
    debit: l.debit,
    credit: l.credit,
    description: l.description,
  }))

  await execDb.insert(financeJournalLines).values(mappedLines)

  return header.id
}

export async function reverseJournalEntry(originalJournalId: number, reversedBy: number, tx: any): Promise<number> {
  const [original] = await tx.select().from(financeJournalEntries).where(eq(financeJournalEntries.id, originalJournalId))
  if (!original) throw new Error('Original journal does not exist')
  if (original.status !== 'POSTED') throw new Error('Original journal must be POSTED to be reversed')
  
  const existingReversals = await tx.select().from(financeJournalEntries).where(eq(financeJournalEntries.reversalOfId, originalJournalId))
  if (existingReversals.length > 0) throw new Error('Journal has already been reversed')

  const originalLines = await tx.select().from(financeJournalLines).where(eq(financeJournalLines.journalEntryId, originalJournalId))

  const reversalLines = originalLines.map((l: any) => ({
    accountId: l.accountId,
    fundId: l.fundId,
    // Swap debit and credit to reverse
    debit: l.credit,
    credit: l.debit,
    description: `Reversal of ${original.journalNumber}`
  }))

  const reversalId = await postJournalEntry({
    transactionDate: new Date(),
    description: `Reversal of ${original.journalNumber}`,
    sourceType: 'REVERSAL',
    sourceId: originalJournalId,
    sourceEvent: 'REVERSE',
    createdBy: reversedBy,
    lines: reversalLines,
    reversalOfId: originalJournalId
  }, tx)

  await tx.update(financeJournalEntries)
    .set({ status: 'REVERSED' })
    .where(eq(financeJournalEntries.id, originalJournalId))

  return reversalId
}
