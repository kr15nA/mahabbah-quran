import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { hasPermission } from '@/lib/auth/rbac'
import { db } from '@/lib/db/client'
import { getZiswafSummaryMetrics } from '@/lib/finance/ziswaf-dashboard'

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  
    const hasPerm = await hasPermission(session as any, 'finance.ziswaf.view')
    if (!hasPerm) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from') || undefined
  const to = searchParams.get('to') || undefined

  if (from && to && from > to) {
    return NextResponse.json({ error: 'Invalid date range' }, { status: 400 })
  }

  const range = { from, to }

  const metrics = await getZiswafSummaryMetrics(range)
  return NextResponse.json(metrics)
}
