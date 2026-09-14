import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { hasPermission } from '@/lib/auth/rbac'
import { issueInvoice } from '@/lib/finance/invoices'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const canManage = await hasPermission(session as any, 'finance.billing.manage')
  if (!canManage) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id } = await params
    await issueInvoice(Number(id), session.userId)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 400 })
  }
}
