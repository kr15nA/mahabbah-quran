import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { hasPermission } from '@/lib/auth/rbac'
import { db } from '@/lib/db/client'
import { getAcademicReceivableReconciliation } from '@/lib/finance/dashboard'

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  
    const hasPerm = await hasPermission(session as any, 'finance.report.view')
    if (!hasPerm) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  

  const reconciliation = await getAcademicReceivableReconciliation()
  return NextResponse.json(reconciliation)
}
