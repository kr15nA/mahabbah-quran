import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, AuthError } from '@/lib/auth/rbac'
import { getAuditLogs, GetAuditLogsFilters } from '@/lib/db/queries/audit-logs'

export async function GET(req: NextRequest) {
  try {
    const { role } = await requireAuth()
    if (role !== 'SUPER_ADMIN') throw new AuthError(403, 'Forbidden')

    const { searchParams } = new URL(req.url)
    
    const filters: GetAuditLogsFilters = {}
    
    if (searchParams.has('actorUserId')) {
      filters.actorUserId = parseInt(searchParams.get('actorUserId')!, 10)
    }
    if (searchParams.has('action')) {
      filters.action = searchParams.get('action')!
    }
    if (searchParams.has('entityType')) {
      filters.entityType = searchParams.get('entityType')!
    }
    if (searchParams.has('entityId')) {
      filters.entityId = parseInt(searchParams.get('entityId')!, 10)
    }
    if (searchParams.has('limit')) {
      const parsedLimit = parseInt(searchParams.get('limit')!, 10)
      filters.limit = !isNaN(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : 50
    }
    if (searchParams.has('offset')) {
      const parsedOffset = parseInt(searchParams.get('offset')!, 10)
      filters.offset = !isNaN(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0
    }

    const logs = await getAuditLogs(filters)
    return NextResponse.json(logs)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('GET /api/audit-logs error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
