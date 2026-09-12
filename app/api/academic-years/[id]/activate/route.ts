import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, AuthError } from '@/lib/auth/rbac'
import { activateAcademicYear } from '@/lib/db/queries/academic-years'
import { createAuditLog } from '@/lib/audit/logger'
import { AuditAction, AuditEntityType } from '@/lib/audit/types'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { session, role } = await requireAuth()
    if (role !== 'SUPER_ADMIN') throw new AuthError(403, 'Forbidden')
    const id = parseInt((await params).id, 10)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    const activated = await activateAcademicYear(id)

    if (!activated) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await createAuditLog({
      actorUserId: session.userId,
      action: AuditAction.ACTIVATE,
      entityType: AuditEntityType.ACADEMIC_YEAR,
      entityId: id,
      newValues: { isActive: true },
    })

    return NextResponse.json(activated)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Failed to activate academic year:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
