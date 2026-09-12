import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, AuthError } from '@/lib/auth/rbac'
import { getEnrollmentsByAcademicYear, upsertEnrollment } from '@/lib/db/queries/enrollments'
import { z } from 'zod'

const upsertSchema = z.object({
  studentId: z.number().int().positive(),
  academicYearId: z.number().int().positive(),
  classId: z.number().int().positive(),
})

export async function GET(req: NextRequest) {
  try {
    const { role } = await requireAuth()
    if (role !== 'SUPER_ADMIN') throw new AuthError(403, 'Forbidden')

    const { searchParams } = new URL(req.url)
    const yearId = searchParams.get('academic_year_id')
    const classId = searchParams.get('class_id')

    if (!yearId) {
      return NextResponse.json({ error: 'academic_year_id is required' }, { status: 400 })
    }

    const yearIdNum = parseInt(yearId, 10)
    const classIdNum = classId ? parseInt(classId, 10) : undefined

    if (isNaN(yearIdNum) || (classId && isNaN(classIdNum!))) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
    }

    const enrollments = await getEnrollmentsByAcademicYear(yearIdNum, classIdNum)
    return NextResponse.json(enrollments)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('GET /api/enrollments error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { role } = await requireAuth()
    if (role !== 'SUPER_ADMIN') throw new AuthError(403, 'Forbidden')

    const body = await req.json()
    const parsed = upsertSchema.parse(body)

    await upsertEnrollment(parsed.studentId, parsed.academicYearId, parsed.classId)

    return NextResponse.json({ success: true }, { status: 201 })
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
    const err = error as any
    if (err.code === '23505' || err?.cause?.code === '23505') {
      return NextResponse.json({ error: 'Enrollment already exists for this student and academic year' }, { status: 409 })
    }
    console.error('POST /api/enrollments error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
