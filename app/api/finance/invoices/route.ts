import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { hasPermission } from '@/lib/auth/rbac'
import { createInvoiceDraft } from '@/lib/finance/invoices'
import { db } from '@/lib/db/client'
import { financeInvoices } from '@/drizzle/schema'
import { toBigIntSafely, serializeAmountForApi } from '@/lib/finance/utils'
import { eq } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const canView = await hasPermission(session as any, 'finance.billing.view')
  if (!canView) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // TODO: Add filters (studentId, academicYearId, status, etc)
  const items = await db.select().from(financeInvoices)

  const serialized = items.map(item => ({
    ...item,
    amount: serializeAmountForApi(item.amount)
  }))

  return NextResponse.json(serialized)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const canManage = await hasPermission(session as any, 'finance.billing.manage')
  if (!canManage) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()

    // Server-side validation
    if (!body.amount) return NextResponse.json({ error: 'Amount is required' }, { status: 400 })

    const input = {
      studentId: Number(body.studentId),
      academicYearId: Number(body.academicYearId),
      feeTypeId: Number(body.feeTypeId),
      period: body.period,
      description: body.description,
      amount: toBigIntSafely(body.amount),
      dueDate: new Date(body.dueDate).toISOString().split('T')[0],
      createdBy: session.userId
    }

    const id = await createInvoiceDraft(input)
    return NextResponse.json({ id })
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 400 })
  }
}
