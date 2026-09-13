import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/rbac'
import { getAllClasses, getClassesByTeacher, getClassesByParent, insertClass } from '@/lib/db/queries/classes'

export async function GET() {
  try {
    const { session, role } = await requireAuth()

    if (role === 'SUPER_ADMIN') {
      const list = await getAllClasses()
      return NextResponse.json({ data: list })
    } else if (role === 'GURU') {
      const list = await getClassesByTeacher(session.userId)
      return NextResponse.json({ data: list })
    } else if (role === 'ORANG_TUA') {
      const list = await getClassesByParent(session.userId)
      return NextResponse.json({ data: list })
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
    if (role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await req.json()
    
    if (!body.name || !body.name.trim()) return NextResponse.json({ error: 'Nama kelas wajib diisi' }, { status: 400 })
    const programId = parseInt(body.program_id, 10)
    if (isNaN(programId) || programId <= 0) return NextResponse.json({ error: 'Program tidak valid' }, { status: 400 })
    const teacherId = parseInt(body.teacher_id, 10)
    if (isNaN(teacherId) || teacherId <= 0) return NextResponse.json({ error: 'Guru tidak valid' }, { status: 400 })

    const id = await insertClass({
      name: body.name.trim(),
      program_id: programId,
      teacher_id: teacherId,
      level: body.level?.trim() || undefined
    })
    return NextResponse.json({ data: { id } }, { status: 201 })
  } catch (error: any) {
    if (error.name === 'AuthError') return NextResponse.json({ error: error.message }, { status: error.status })
    if (error.message === 'Active academic year required for class creation') {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
