import { NextResponse } from 'next/server'
import { requireAuth, hasPermission } from '@/lib/auth/rbac'
import { db } from '@/lib/db/client'
import { ziswafReceipts, ziswafReceiptAllocations, financeParties, financeCategories, financeCampaigns } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import { updateReceiptDraft, allocateReceipt } from '@/lib/finance/ziswaf'
import { toBigIntSafely, serializeAmountForApi } from '@/lib/finance/utils'

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { session } = await requireAuth()
    const canView = await hasPermission(session, 'finance.ziswaf.view')
    if (!canView) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    
    const { id } = await props.params
    const receiptId = parseInt(id, 10)

    const [receiptData] = await db.select({
      receipt: ziswafReceipts,
      party: financeParties,
      category: financeCategories,
      campaign: financeCampaigns
    })
    .from(ziswafReceipts)
    .leftJoin(financeParties, eq(ziswafReceipts.partyId, financeParties.id))
    .leftJoin(financeCategories, eq(ziswafReceipts.categoryId, financeCategories.id))
    .leftJoin(financeCampaigns, eq(ziswafReceipts.campaignId, financeCampaigns.id))
    .where(eq(ziswafReceipts.id, receiptId))

    if (!receiptData) return NextResponse.json({ error: 'Not Found' }, { status: 404 })

    const allocations = await db.select().from(ziswafReceiptAllocations).where(eq(ziswafReceiptAllocations.receiptId, receiptId))

    const serialized = {
      ...receiptData,
      receipt: {
        ...receiptData.receipt,
        amount: serializeAmountForApi(receiptData.receipt.amount)
      },
      allocations: allocations.map(a => ({
        ...a,
        amount: serializeAmountForApi(a.amount)
      }))
    }

    return NextResponse.json({ data: serialized })
  } catch (err: any) {
    if (err.name === 'AuthError') return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { session } = await requireAuth()
    const canManage = await hasPermission(session, 'finance.ziswaf.manage')
    if (!canManage) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    
    const { id } = await props.params
    const receiptId = parseInt(id, 10)
    const body = await request.json()
    const { amount, allocations, ...data } = body
    
    const amountBigInt = amount !== undefined ? toBigIntSafely(amount) : undefined
    
    const receipt = await updateReceiptDraft(receiptId, {
      ...data,
      ...(amountBigInt !== undefined && { amount: amountBigInt })
    }, session.userId)

    if (allocations && Array.isArray(allocations)) {
      const fundAllocations = allocations.map((a: any) => ({
        fundId: a.fundId,
        amount: toBigIntSafely(a.amount)
      }))
      await allocateReceipt(receiptId, fundAllocations, session.userId)
    }

    return NextResponse.json({ data: { ...receipt, amount: serializeAmountForApi(receipt.amount) } })
  } catch (err: any) {
    if (err.name === 'AuthError') return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
