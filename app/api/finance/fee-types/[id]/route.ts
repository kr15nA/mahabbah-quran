import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { hasPermission } from '@/lib/auth/rbac'
import { getFeeTypeById, updateFeeType, deactivateFeeType } from '@/lib/finance/fee-types'
import { toBigIntSafely, serializeAmountForApi } from '@/lib/finance/utils'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const canView = await hasPermission(session as any, 'finance.billing.view')
  const canManage = await hasPermission(session as any, 'finance.settings.manage')
  if (!canView) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const item = await getFeeTypeById(Number(id))
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const serialized = {
    ...item,
    defaultAmount: item.defaultAmount !== null ? serializeAmountForApi(item.defaultAmount) : null
  }

  return NextResponse.json(serialized)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const canManage = await hasPermission(session as any, 'finance.settings.manage')
  if (!canManage) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id } = await params
    const body = await req.json()
    
    // Deactivation special case? Or handle generically via isActive flag.
    if (body.isActive === false && Object.keys(body).length === 1) {
      await deactivateFeeType(Number(id))
      return NextResponse.json({ success: true })
    }

    const input = {
      ...body,
      defaultAmount: body.defaultAmount ? toBigIntSafely(body.defaultAmount) : undefined
    }

    await updateFeeType(Number(id), input)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 400 })
  }
}
