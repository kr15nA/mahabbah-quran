import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getAllPrograms, insertProgram } from '@/lib/db/queries/programs'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const list = await getAllPrograms()
  return NextResponse.json({ data: list })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const id = await insertProgram(body)
  return NextResponse.json({ data: { id } }, { status: 201 })
}
