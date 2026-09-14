import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth/rbac'
import { cancelPayment } from '@/lib/finance/payment'

export async function POST(request: Request, context: any) {
  try {
    const { session } = await requirePermission('finance.payment.manage')
    const { id } = await Promise.resolve(context.params)
    const paymentId = Number(id)
    
    await cancelPayment(paymentId, session.userId)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    if (err.name === 'AuthError') return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 400 })
  }
}
