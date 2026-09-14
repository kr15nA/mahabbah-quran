import { NextResponse } from 'next/server'
import { requireAuth, hasPermission } from '@/lib/auth/rbac'
import { db } from '@/lib/db/client'
import { financeParties } from '@/drizzle/schema'
import { eq, ilike } from 'drizzle-orm'
import { createParty, updateParty } from '@/lib/finance/ziswaf'

export async function GET(request: Request) {
  try {
    const { session } = await requireAuth()
    const canView = await hasPermission(session, 'finance.ziswaf.view')
    if (!canView) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('q')
    
    let conditions = undefined
    if (search) conditions = ilike(financeParties.name, `%${search}%`)

    const parties = await db.select()
      .from(financeParties)
      .where(conditions)
      .orderBy(financeParties.name)

    return NextResponse.json({ data: parties })
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
    const result = await createParty({ ...body, userId: session.userId })
    return NextResponse.json({ data: result }, { status: 201 })
  } catch (err: any) {
    if (err.name === 'AuthError') return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
