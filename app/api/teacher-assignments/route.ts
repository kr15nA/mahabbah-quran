import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, AuthError } from '@/lib/auth/rbac'
import { getTeacherAssignmentsByYear, upsertTeacherAssignment } from '@/lib/db/queries/teacher-assignments'
import { z } from 'zod'

const upsertSchema = z.object({
  academicYearId: z.number().int().positive(),
  classId: z.number().int().positive(),
  teacherId: z.number().int().positive(),
})

export async function GET(req: NextRequest) {
  try {
    const { role } = await requireAuth()
    if (role !== 'SUPER_ADMIN') throw new AuthError(403, 'Forbidden')

    const { searchParams } = new URL(req.url)
    const yearId = searchParams.get('academic_year_id')

    if (!yearId) {
      return NextResponse.json({ error: 'academic_year_id is required' }, { status: 400 })
    }

    const yearIdNum = parseInt(yearId, 10)

    if (isNaN(yearIdNum)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
    }

    const assignments = await getTeacherAssignmentsByYear(yearIdNum)
    return NextResponse.json(assignments)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('GET /api/teacher-assignments error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { role } = await requireAuth()
    if (role !== 'SUPER_ADMIN') throw new AuthError(403, 'Forbidden')

    const body = await req.json()
    const parsed = upsertSchema.parse(body)

    // F-005: upsertTeacherAssignment returns 'created' or 'updated'
    const outcome = await upsertTeacherAssignment(parsed.academicYearId, parsed.classId, parsed.teacherId)

    // 201 Created on new assignment, 200 OK on update of existing
    const statusCode = outcome === 'created' ? 201 : 200
    return NextResponse.json({ success: true, outcome }, { status: statusCode })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', details: error.issues }, { status: 400 })
    }
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    if (error instanceof Error && error.message.includes('guru role')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    if (error instanceof Error && error.message.includes('inactive teacher')) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('POST /api/teacher-assignments error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
