import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getInvoiceDetails } from '@/lib/finance/invoices'
import { serializeAmountForApi } from '@/lib/finance/utils'
import { canAccessStudentFinance } from '@/lib/finance/authorization'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'orang_tua') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const invoice = await getInvoiceDetails(Number(id))
  
  if (!invoice || invoice.status === 'DRAFT') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Verify parent has access to THIS invoice's student
  const hasAccess = await canAccessStudentFinance(session as any, invoice.studentId)
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const serialized = {
    ...invoice,
    amount: serializeAmountForApi(invoice.amount),
    paidAmount: serializeAmountForApi(invoice.paidAmount),
    outstandingAmount: serializeAmountForApi(invoice.outstandingAmount)
  }

  return NextResponse.json(serialized)
}
