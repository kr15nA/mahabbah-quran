import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { hasPermission } from '@/lib/auth/rbac'
import { db } from '@/lib/db/client'
import { financeAccounts } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  
    const hasPerm = await hasPermission(session as any, 'finance.settings.manage')
    if (!hasPerm) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  

  const { id } = await context.params
  const body = await request.json()
  const { assetSubtype } = body

  // Validate combinations
  const [account] = await db.select().from(financeAccounts).where(eq(financeAccounts.id, Number(id)))
  if (!account) return NextResponse.json({ error: 'Not Found' }, { status: 404 })

  if (assetSubtype && account.accountType !== 'ASSET') {
    return NextResponse.json({ error: 'assetSubtype can only be set on ASSET accounts' }, { status: 400 })
  }

  const allowedSubtypes = ['CASH', 'BANK', 'RECEIVABLE', 'OTHER_ASSET']
  if (assetSubtype && !allowedSubtypes.includes(assetSubtype)) {
    return NextResponse.json({ error: 'Invalid assetSubtype' }, { status: 400 })
  }

  await db.update(financeAccounts)
    .set({ assetSubtype: assetSubtype || null })
    .where(eq(financeAccounts.id, Number(id)))

  return NextResponse.json({ success: true })
}
