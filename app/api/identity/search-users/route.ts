import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePermission } from '@/lib/auth/rbac'
import { searchUsersForLinking } from '@/lib/identity/manage'
import { AuthError } from '@/lib/auth/rbac'

export async function GET(req: NextRequest) {
  try {
    await requirePermission('system.user.manage')

    const searchParams = req.nextUrl.searchParams
    const q = searchParams.get('q')

    if (!q || q.length < 2) {
      return NextResponse.json({ results: [] })
    }

    const results = await searchUsersForLinking(q)
    return NextResponse.json({ results })
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Search users error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
