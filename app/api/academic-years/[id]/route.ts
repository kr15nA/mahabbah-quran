import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, AuthError } from '@/lib/auth/rbac'
import { updateAcademicYear, getAcademicYearById } from '@/lib/db/queries/academic-years'
import { z } from 'zod'
import { createAuditLog } from '@/lib/audit/logger'
import { AuditAction, AuditEntityType } from '@/lib/audit/types'

const updateSchema = z.object({
  name: z.string().min(1).max(50),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
}).refine(data => new Date(data.startDate) < new Date(data.endDate), {
  message: 'End date must be after start date',
  path: ['endDate']
})

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

    const body = await req.json()
    const parsed = updateSchema.parse(body)

    const oldData = await getAcademicYearById(id)
    if (!oldData) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const updated = await updateAcademicYear(id, {
      name: parsed.name,
      startDate: parsed.startDate,
      endDate: parsed.endDate
    })

    if (!updated) {
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }

    await createAuditLog({
      actorUserId: session.userId,
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.ACADEMIC_YEAR,
      entityId: id,
      oldValues: { name: oldData.name, startDate: oldData.startDate, endDate: oldData.endDate },
      newValues: { name: updated.name, startDate: updated.startDate, endDate: updated.endDate },
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', details: error.issues }, { status: 400 })
    }
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if ((error as any).code === '23505') { // postgres unique violation
      return NextResponse.json({ error: 'Academic year name already exists' }, { status: 409 })
    }
    console.error('Failed to update academic year:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
