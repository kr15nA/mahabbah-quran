import { db } from '@/lib/db/client'
import { financeFeeTypes, financeInvoices } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'

export interface FeeTypeInput {
  code: string
  name: string
  description?: string
  categoryId: number
  receivableAccountId: number
  incomeAccountId: number
  defaultFundId?: number
  defaultAmount?: bigint
  billingFrequency: 'ONE_TIME' | 'MONTHLY' | 'CUSTOM'
  isActive?: boolean
}

export async function createFeeType(input: FeeTypeInput): Promise<number> {
  const [result] = await db.insert(financeFeeTypes).values({
    code: input.code,
    name: input.name,
    description: input.description,
    categoryId: input.categoryId,
    receivableAccountId: input.receivableAccountId,
    incomeAccountId: input.incomeAccountId,
    defaultFundId: input.defaultFundId,
    defaultAmount: input.defaultAmount,
    billingFrequency: input.billingFrequency,
    isActive: input.isActive ?? true,
  }).returning({ id: financeFeeTypes.id })

  return result.id
}

export async function updateFeeType(id: number, input: Partial<FeeTypeInput>): Promise<void> {
  await db.update(financeFeeTypes)
    .set({
      name: input.name,
      description: input.description,
      categoryId: input.categoryId,
      receivableAccountId: input.receivableAccountId,
      incomeAccountId: input.incomeAccountId,
      defaultFundId: input.defaultFundId,
      defaultAmount: input.defaultAmount,
      billingFrequency: input.billingFrequency,
      isActive: input.isActive,
    })
    .where(eq(financeFeeTypes.id, id))
}

export async function deactivateFeeType(id: number): Promise<void> {
  // Check if it's already used
  const invoices = await db.select({ id: financeInvoices.id }).from(financeInvoices).where(eq(financeInvoices.feeTypeId, id)).limit(1)
  
  // We can't hard delete if it's referenced.
  if (invoices.length > 0) {
    // Just deactivate it
    await db.update(financeFeeTypes).set({ isActive: false }).where(eq(financeFeeTypes.id, id))
  } else {
    // Optional: hard delete if strictly never used, but usually we just deactivate
    await db.update(financeFeeTypes).set({ isActive: false }).where(eq(financeFeeTypes.id, id))
  }
}

export async function getFeeTypes() {
  return db.select().from(financeFeeTypes)
}

export async function getFeeTypeById(id: number) {
  const [feeType] = await db.select().from(financeFeeTypes).where(eq(financeFeeTypes.id, id))
  return feeType
}
