import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireStudentAccess } from '@/lib/auth/rbac'
import { getStudentById, updateStudent, softDeleteStudent } from '@/lib/db/queries/students'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params
    const id = Number(resolvedParams.id)
    
    await requireStudentAccess(id)

    const student = await getStudentById(id)
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

    return NextResponse.json({ data: student })
  } catch (error: any) {
    if (error.name === 'AuthError') return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { role } = await requireAuth()
    if (role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const resolvedParams = await params
    const id = Number(resolvedParams.id)
    const body = await req.json()

    await updateStudent(id, body)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.name === 'AuthError') return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { role } = await requireAuth()
    if (role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const resolvedParams = await params
    const id = Number(resolvedParams.id)
    await softDeleteStudent(id)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.name === 'AuthError') return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
