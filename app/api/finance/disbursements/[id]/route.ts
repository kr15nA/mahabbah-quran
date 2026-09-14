import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '../../../../../lib/auth/rbac'
import { db } from '../../../../../lib/db/client'
import { financeDisbursements } from '../../../../../drizzle/schema'
import { updateDisbursementDraft } from '../../../../../lib/finance/disbursement'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const updateSchema = z.object({
  fundId: z.number().positive().optional(),
  categoryId: z.number().positive().optional(),
  amount: z.string().min(1).optional(),
  transactionDate: z.string().optional(),
  description: z.string().min(1).optional(),
  beneficiaryName: z.string().nullable().optional(),
})

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session } = await requirePermission('finance.disbursement.view')
    const paramsObj = await params;
    const id = parseInt(paramsObj.id, 10)
    
    const [disbursement] = await db.select()
      .from(financeDisbursements)
      .where(eq(financeDisbursements.id, id))

    if (!disbursement) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const serialized = {
      ...disbursement,
      amount: typeof disbursement.amount === 'bigint' ? disbursement.amount.toString() : disbursement.amount
    }

    return NextResponse.json(serialized)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session } = await requirePermission('finance.disbursement.manage')
    const paramsObj = await params;
    const id = parseInt(paramsObj.id, 10)
    
    const body = await req.json()
    const data = updateSchema.parse(body)

    const disbursement = await updateDisbursementDraft(id, data, session.userId)

    const serialized = {
      ...disbursement,
      amount: typeof disbursement.amount === 'bigint' ? disbursement.amount.toString() : disbursement.amount
    }

    return NextResponse.json(serialized)
  } catch (error: any) {
    if (error.name === 'ZodError') return NextResponse.json({ error: error.errors }, { status: 400 })
    return NextResponse.json({ error: error.message }, { status: error.status || 500 })
  }
}
