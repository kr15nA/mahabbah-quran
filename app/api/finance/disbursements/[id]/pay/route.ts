import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '../../../../../../lib/auth/rbac'
import { payDisbursement } from '../../../../../../lib/finance/disbursement'
import { z } from 'zod'

const paySchema = z.object({
  paymentAccountId: z.number().positive()
})

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session } = await requirePermission('finance.disbursement.pay')
    const paramsObj = await params;
    const id = parseInt(paramsObj.id, 10)
    
    const body = await req.json()
    const data = paySchema.parse(body)

    const result = await payDisbursement(id, data.paymentAccountId, session.userId)
    
    return NextResponse.json({ success: true, status: result.status })
  } catch (error: any) {
    if (error.name === 'ZodError') return NextResponse.json({ error: error.errors }, { status: 400 })
    return NextResponse.json({ error: error.message }, { status: error.status || 500 })
  }
}
