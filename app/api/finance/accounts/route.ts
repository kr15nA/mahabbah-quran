import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/rbac'
import { db } from '@/lib/db/client'
import { financeAccounts } from '@/drizzle/schema'
import { eq, and } from 'drizzle-orm'

export async function GET(request: Request) {
  try {
    await requireAuth() // Need to be authenticated at least
    
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    
    let conditions = eq(financeAccounts.isActive, true)
    if (type) conditions = and(conditions, eq(financeAccounts.accountType, type as any)) as any

    const accounts = await db.select({
      id: financeAccounts.id,
      code: financeAccounts.code,
      name: financeAccounts.name,
      accountType: financeAccounts.accountType,
      assetSubtype: financeAccounts.assetSubtype,
    })
    .from(financeAccounts)
    .where(conditions)
    .orderBy(financeAccounts.code)

    return NextResponse.json({ data: accounts })
  } catch (err: any) {
    if (err.name === 'AuthError') return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
