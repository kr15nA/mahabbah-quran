import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/rbac'
import { getStudentsByTeacher, searchStudents, insertStudent } from '@/lib/db/queries/students'
import { getChildrenByParent } from '@/lib/db/queries/student-parents'
import { z } from 'zod'

export async function GET(req: NextRequest) {
  try {
    const { session, role } = await requireAuth()

    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') ?? undefined
    const classId = searchParams.get('class_id') ? Number(searchParams.get('class_id')) : undefined
    const status = searchParams.get('status') ?? undefined

    if (role === 'SUPER_ADMIN') {
      const students = await searchStudents(q, { class_id: classId, status })
      return NextResponse.json({ data: students })
    } else if (role === 'GURU') {
      const students = await getStudentsByTeacher(session.userId)
      return NextResponse.json({ data: students })
    } else if (role === 'ORANG_TUA') {
      const students = await getChildrenByParent(session.userId)
      return NextResponse.json({ data: students })
    }

    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  } catch (error: any) {
    if (error.name === 'AuthError') return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { role } = await requireAuth()
    if (role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const schema = z.object({
      class_id: z.number(),
      full_name: z.string().min(2),
      nickname: z.string().optional(),
      gender: z.enum(['male', 'female']).optional(),
      date_of_birth: z.string().optional(),
      enrollment_date: z.string(),
      photo_url: z.string().optional(),
    })

    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }

    const id = await insertStudent(parsed.data)
    return NextResponse.json({ data: { id } }, { status: 201 })
  } catch (error: any) {
    if (error.name === 'AuthError') return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('POST /api/students error:', error)
    return NextResponse.json({ error: 'Failed to create student' }, { status: 500 })
  }
}
