import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, AuthError } from '@/lib/auth/rbac'
import { getAcademicYears, createAcademicYear } from '@/lib/db/queries/academic-years'
import { createAuditLog } from '@/lib/audit/logger'
import { AuditAction, AuditEntityType } from '@/lib/audit/types'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1).max(50),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
}).refine(data => new Date(data.startDate) < new Date(data.endDate), {
  message: 'End date must be after start date',
  path: ['endDate']
})

export async function GET(req: NextRequest) {
  try {
    const { role } = await requireAuth()
    if (role !== 'SUPER_ADMIN') throw new AuthError(403, 'Forbidden')
    const years = await getAcademicYears()
    return NextResponse.json(years)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, role } = await requireAuth()
    if (role !== 'SUPER_ADMIN') throw new AuthError(403, 'Forbidden')
    const body = await req.json()
    const parsed = createSchema.parse(body)
    
    const newYear = await createAcademicYear({
      name: parsed.name,
      startDate: parsed.startDate,
      endDate: parsed.endDate,
      isActive: false
    })

    await createAuditLog({
      actorUserId: session.userId,
      action: AuditAction.CREATE,
      entityType: AuditEntityType.ACADEMIC_YEAR,
      entityId: newYear.id,
      newValues: { name: parsed.name, startDate: parsed.startDate, endDate: parsed.endDate, isActive: false },
    })

    return NextResponse.json(newYear, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', details: error.issues }, { status: 400 })
    }
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    const err = error as any
    if (err.code === '23505' || err?.cause?.code === '23505') { // postgres unique violation
      return NextResponse.json({ error: 'Academic year name already exists' }, { status: 409 })
    }
    console.error('Failed to create academic year:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
