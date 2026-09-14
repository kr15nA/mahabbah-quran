import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { hasPermission } from '@/lib/auth/rbac'
import { getInvoiceDetails } from '@/lib/finance/invoices'
import { serializeAmountForApi } from '@/lib/finance/utils'
import { db } from '@/lib/db/client'
import { financeInvoices } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const canView = await hasPermission(session as any, 'finance.billing.view')
  if (!canView) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const invoice = await getInvoiceDetails(Number(id))
  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const serialized = {
    ...invoice,
    amount: serializeAmountForApi(invoice.amount),
    paidAmount: serializeAmountForApi(invoice.paidAmount),
    outstandingAmount: serializeAmountForApi(invoice.outstandingAmount)
  }

  return NextResponse.json(serialized)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const canManage = await hasPermission(session as any, 'finance.billing.manage')
  if (!canManage) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id } = await params
    const body = await req.json()
    
    // Validate we can only update DRAFT
    const [invoice] = await db.select().from(financeInvoices).where(eq(financeInvoices.id, Number(id)))
    if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (invoice.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Can only update DRAFT invoices' }, { status: 400 })
    }

    const updates: any = {}
    if (body.description !== undefined) updates.description = body.description
    if (body.dueDate !== undefined) updates.dueDate = new Date(body.dueDate)
    // Avoid updating amount here for simplicity, otherwise we'd need to convert it via toBigIntSafely

    await db.update(financeInvoices)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(financeInvoices.id, Number(id)))

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 400 })
  }
}
