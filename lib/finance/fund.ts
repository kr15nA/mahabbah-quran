import { db } from '@/lib/db/client'
import { financeCategoryFunds } from '@/drizzle/schema'
import { eq, and } from 'drizzle-orm'

export async function validateCategoryFundCompatibility(
  categoryId: number,
  fundId: number,
  tx?: any
): Promise<boolean> {
  const execDb = tx ?? db
  
  const result = await execDb.select({ id: financeCategoryFunds.id })
    .from(financeCategoryFunds)
    .where(and(
      eq(financeCategoryFunds.categoryId, categoryId),
      eq(financeCategoryFunds.fundId, fundId)
    ))
    .limit(1)

  return result.length > 0
}
