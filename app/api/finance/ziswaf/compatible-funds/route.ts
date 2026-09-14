import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/rbac'
import { db } from '@/lib/db/client'
import { financeCategoryFunds, financeFunds } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'

export async function GET(request: Request) {
  try {
    await requireAuth() // Need to be authenticated at least
    
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')
    
    if (!categoryId) return NextResponse.json({ error: 'Missing categoryId' }, { status: 400 })

    const funds = await db.select({
      id: financeFunds.id,
      code: financeFunds.code,
      name: financeFunds.name,
      fundType: financeFunds.fundType,
      isDefault: financeCategoryFunds.isDefault
    })
    .from(financeCategoryFunds)
    .innerJoin(financeFunds, eq(financeCategoryFunds.fundId, financeFunds.id))
    .where(eq(financeCategoryFunds.categoryId, parseInt(categoryId, 10)))
    .orderBy(financeFunds.code)

    return NextResponse.json({ data: funds })
  } catch (err: any) {
    if (err.name === 'AuthError') return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
