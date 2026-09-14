import { NextResponse } from 'next/server'
import { requireAuth, hasPermission } from '@/lib/auth/rbac'
import { db } from '@/lib/db/client'
import { ziswafReceipts, financeParties, financeCategories, financeCampaigns } from '@/drizzle/schema'
import { eq, desc } from 'drizzle-orm'
import { createReceiptDraft, allocateReceipt } from '@/lib/finance/ziswaf'
import { toBigIntSafely, serializeAmountForApi } from '@/lib/finance/utils'

export async function GET(request: Request) {
  try {
    const { session } = await requireAuth()
    const canView = await hasPermission(session, 'finance.ziswaf.view')
    if (!canView) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    
    // We could add more filters, but let's fetch the latest 50 for now
    const receipts = await db.select({
      receipt: ziswafReceipts,
      party: financeParties,
      category: financeCategories,
      campaign: financeCampaigns
    })
    .from(ziswafReceipts)
    .leftJoin(financeParties, eq(ziswafReceipts.partyId, financeParties.id))
    .leftJoin(financeCategories, eq(ziswafReceipts.categoryId, financeCategories.id))
    .leftJoin(financeCampaigns, eq(ziswafReceipts.campaignId, financeCampaigns.id))
    .orderBy(desc(ziswafReceipts.createdAt))
    .limit(50)

    const serialized = receipts.map(r => ({
      ...r,
      receipt: {
        ...r.receipt,
        amount: serializeAmountForApi(r.receipt.amount)
      }
    }))

    return NextResponse.json({ data: serialized })
  } catch (err: any) {
    if (err.name === 'AuthError') return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { session } = await requireAuth()
    const canManage = await hasPermission(session, 'finance.ziswaf.manage')
    if (!canManage) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    
    const body = await request.json()
    const { amount, allocations, ...data } = body
    
    const amountBigInt = toBigIntSafely(amount)
    
    // Create draft
    const receipt = await createReceiptDraft({
      ...data,
      amount: amountBigInt,
      receivedBy: session.userId,
      receivedDate: data.receivedDate || new Date().toISOString().split('T')[0]
    }, session.userId)

    // Automatically allocate if passed
    if (allocations && Array.isArray(allocations)) {
      const fundAllocations = allocations.map((a: any) => ({
        fundId: a.fundId,
        amount: toBigIntSafely(a.amount)
      }))
      await allocateReceipt(receipt.id, fundAllocations, session.userId)
    }

    return NextResponse.json({ data: { ...receipt, amount: serializeAmountForApi(receipt.amount) } }, { status: 201 })
  } catch (err: any) {
    if (err.name === 'AuthError') return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
