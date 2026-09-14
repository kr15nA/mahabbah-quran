import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { hasPermission } from '@/lib/auth/rbac'
import { bulkIssueInvoices } from '@/lib/finance/bulk-billing'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const canManage = await hasPermission(session as any, 'finance.billing.manage')
  if (!canManage) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()

    if (!body.invoiceIds || !Array.isArray(body.invoiceIds)) {
      return NextResponse.json({ error: 'invoiceIds array is required' }, { status: 400 })
    }

    const result = await bulkIssueInvoices(body.invoiceIds.map(Number), session.userId)
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 400 })
  }
}
