import { NextResponse } from 'next/server'
import { requireAuth, hasPermission } from '@/lib/auth/rbac'
import { confirmZiswafReceipt } from '@/lib/finance/ziswaf'

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { session } = await requireAuth()
    const canManage = await hasPermission(session, 'finance.ziswaf.manage')
    if (!canManage) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    
    const { id } = await props.params
    const receiptId = parseInt(id, 10)
    
    await confirmZiswafReceipt(receiptId, session.userId)
    
    return NextResponse.json({ data: { success: true } })
  } catch (err: any) {
    if (err.name === 'AuthError') return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
