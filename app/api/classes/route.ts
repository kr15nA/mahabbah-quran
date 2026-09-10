import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getAllClasses, getClassesByTeacher, insertClass } from '@/lib/db/queries/classes'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (session.role === 'guru') {
    const list = await getClassesByTeacher(session.userId)
    return NextResponse.json({ data: list })
  }

  const list = await getAllClasses()
  return NextResponse.json({ data: list })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const id = await insertClass(body)
  return NextResponse.json({ data: { id } }, { status: 201 })
}
