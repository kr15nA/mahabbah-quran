import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getStudentById, updateStudent, softDeleteStudent } from '@/lib/db/queries/students'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const resolvedParams = await params
  const id = Number(resolvedParams.id)
  const student = await getStudentById(id)

  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

  return NextResponse.json({ data: student })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const resolvedParams = await params
  const id = Number(resolvedParams.id)
  const body = await req.json()

  await updateStudent(id, body)
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const resolvedParams = await params
  const id = Number(resolvedParams.id)
  await softDeleteStudent(id)
  return NextResponse.json({ success: true })
}
