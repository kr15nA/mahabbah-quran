import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { hasPermission } from '@/lib/auth/rbac'
import { getFeeTypes, createFeeType } from '@/lib/finance/fee-types'
import { toBigIntSafely, serializeAmountForApi } from '@/lib/finance/utils'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const canView = await hasPermission(session as any, 'finance.billing.view')
  const canManage = await hasPermission(session as any, 'finance.settings.manage')
  if (!canView) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const items = await getFeeTypes()
  
  // Serialize bigint
  const serialized = items.map(item => ({
    ...item,
    defaultAmount: item.defaultAmount !== null ? serializeAmountForApi(item.defaultAmount) : null
  }))

  return NextResponse.json(serialized)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const canManage = await hasPermission(session as any, 'finance.settings.manage')
  if (!canManage) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    
    const input = {
      ...body,
      defaultAmount: body.defaultAmount ? toBigIntSafely(body.defaultAmount) : undefined
    }

    const id = await createFeeType(input)
    return NextResponse.json({ id })
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 400 })
  }
}
