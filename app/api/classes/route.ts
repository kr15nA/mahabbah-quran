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
    const id = await insertClass(body)
    return NextResponse.json({ data: { id } }, { status: 201 })
  } catch (error: any) {
    if (error.name === 'AuthError') return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
