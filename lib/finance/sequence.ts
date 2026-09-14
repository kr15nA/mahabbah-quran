import { db } from '@/lib/db/client'
import { financeNumberSequences } from '@/drizzle/schema'
import { sql } from 'drizzle-orm'

export async function generateDocumentNumber(
  documentType: 'INV' | 'PAY' | 'ZIS' | 'OUT' | 'JRN',
  tx?: any
): Promise<string> {
  const currentYear = new Date().getFullYear()
  const execDb = tx ?? db

  const result = await execDb
    .insert(financeNumberSequences)
    .values({
      documentType,
      year: currentYear,
      lastNumber: 1,
    })
    .onConflictDoUpdate({
      target: [financeNumberSequences.documentType, financeNumberSequences.year],
      set: {
        lastNumber: sql`${financeNumberSequences.lastNumber} + 1`,
      },
    })
    .returning({ lastNumber: financeNumberSequences.lastNumber })

  const nextNum = result[0].lastNumber
  const paddedNum = String(nextNum).padStart(6, '0')
  return `${documentType}-${currentYear}-${paddedNum}`
}
