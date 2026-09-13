import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/rbac'
import { getProgramById, updateProgram, archiveProgram } from '@/lib/db/queries/programs'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireAuth() // Any authenticated user can read a program
  
  const id = Number((await params).id)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const program = await getProgramById(id)
  if (!program) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ data: program })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { role } = await requireAuth()
  if (role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const id = Number((await params).id)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const program = await getProgramById(id)
  if (!program) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  if (!body.name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  await updateProgram(id, body)
  
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { role } = await requireAuth()
  if (role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const id = Number((await params).id)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

  const program = await getProgramById(id)
  if (!program) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await archiveProgram(id)
  
  return NextResponse.json({ success: true })
}
