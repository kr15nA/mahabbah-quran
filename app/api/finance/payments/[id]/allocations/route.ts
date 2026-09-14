import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth/rbac'
import { allocatePayment } from '@/lib/finance/payment'
import { z } from 'zod'

const allocationSchema = z.array(z.object({
  invoiceId: z.number().int().positive(),
  amount: z.string().regex(/^\d+$/)
}))

export async function POST(request: Request, context: any) {
  try {
    const { session } = await requirePermission('finance.payment.manage')
    const { id } = await Promise.resolve(context.params)
    const paymentId = Number(id)
    
    const body = await request.json()
    const parsed = allocationSchema.parse(body)

    const allocations = parsed.map(a => ({
      invoiceId: a.invoiceId,
      amount: BigInt(a.amount)
    }))

    await allocatePayment(paymentId, allocations, session.userId)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    if (err.name === 'AuthError') return NextResponse.json({ error: err.message }, { status: err.status })
    if (err instanceof z.ZodError) return NextResponse.json({ error: (err as any).errors || (err as any).issues }, { status: 400 })
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 400 })
  }
}
