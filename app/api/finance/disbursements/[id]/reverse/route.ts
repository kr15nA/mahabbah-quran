import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '../../../../../../lib/auth/rbac'
import { reverseDisbursement } from '../../../../../../lib/finance/disbursement'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { session } = await requirePermission('finance.disbursement.reverse')
    const paramsObj = await params;
    const id = parseInt(paramsObj.id, 10)
    const result = await reverseDisbursement(id, session.userId)
    
    return NextResponse.json({ success: true, status: result.status })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 })
  }
}
