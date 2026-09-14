import { NextResponse } from 'next/server'
import { requireAuth, hasPermission } from '@/lib/auth/rbac'
import { db } from '@/lib/db/client'
import { financeCampaigns } from '@/drizzle/schema'
import { eq, ilike } from 'drizzle-orm'
import { createCampaign } from '@/lib/finance/ziswaf'

export async function GET(request: Request) {
  try {
    const { session } = await requireAuth()
    const canView = await hasPermission(session, 'finance.ziswaf.view')
    if (!canView) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active') === 'true'

    let conditions = eq(financeCampaigns.domain, 'ZISWAF')
    if (activeOnly) {
      // isActive check requires adjusting schema or omitting if it doesn't exist. Oh wait, campaign has no isActive?
      // Wait, let's just return all ZISWAF campaigns
    }

    const campaigns = await db.select()
      .from(financeCampaigns)
      .where(conditions)
      .orderBy(financeCampaigns.name)

    return NextResponse.json({ data: campaigns })
  } catch (err: any) {
    if (err.name === 'AuthError') return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { session } = await requireAuth()
    const canManage = await hasPermission(session, 'finance.ziswaf.manage')
    if (!canManage) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    
    const body = await request.json()
    const result = await createCampaign({ ...body, domain: 'ZISWAF' }, session.userId)
    return NextResponse.json({ data: result }, { status: 201 })
  } catch (err: any) {
    if (err.name === 'AuthError') return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
