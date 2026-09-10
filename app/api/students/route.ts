import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getStudentsByTeacher, searchStudents, insertStudent } from '@/lib/db/queries/students'
import { z } from 'zod'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q') ?? undefined
  const classId = searchParams.get('class_id') ? Number(searchParams.get('class_id')) : undefined
  const status = searchParams.get('status') ?? undefined

  if (session.role === 'guru') {
    const students = await getStudentsByTeacher(session.userId)
    return NextResponse.json({ data: students })
  }

  const students = await searchStudents(q, { class_id: classId, status })
  return NextResponse.json({ data: students })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
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
  } catch (error) {
    console.error('POST /api/students error:', error)
    return NextResponse.json({ error: 'Failed to create student' }, { status: 500 })
  }
}
