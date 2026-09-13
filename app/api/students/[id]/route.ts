import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireStudentAccess } from '@/lib/auth/rbac'
import { getStudentById, updateStudent, softDeleteStudent } from '@/lib/db/queries/students'
import { getActiveAcademicContext } from '@/lib/db/queries/academic-context'
import { upsertEnrollment } from '@/lib/db/queries/enrollments'

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
    
    // Separate legacy academic field from generic fields
    const { class_id, ...profileData } = body

    if (class_id !== undefined) {
      const activeYear = await getActiveAcademicContext()
      if (!activeYear) {
        return NextResponse.json({ error: 'Active academic year required for academic placement' }, { status: 400 })
      }
      // This will intrinsically update students.class_id mirror
      await upsertEnrollment(id, activeYear.id, class_id)
    }

    // Only pass safe generic fields to generic updater
    if (Object.keys(profileData).length > 0) {
      await updateStudent(id, profileData)
    }

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
