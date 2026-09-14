import { NextResponse } from 'next/server'
import { requireAuth, hasPermission } from '@/lib/auth/rbac'
import { refundZiswafReceipt } from '@/lib/finance/ziswaf'

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { session } = await requireAuth()
    const canRefund = await hasPermission(session, 'finance.ziswaf.refund')
    if (!canRefund) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    
    const { id } = await props.params
    const receiptId = parseInt(id, 10)
    
    await refundZiswafReceipt(receiptId, session.userId)
    
    return NextResponse.json({ data: { success: true } })
  } catch (err: any) {
    if (err.name === 'AuthError') return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
