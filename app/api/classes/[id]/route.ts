import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/rbac'
import { updateClass } from '@/lib/db/queries/classes'
import { getActiveAcademicContext } from '@/lib/db/queries/academic-context'
import { upsertTeacherAssignment } from '@/lib/db/queries/teacher-assignments'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { role } = await requireAuth()
    if (role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id: idStr } = await params
    const id = parseInt(idStr, 10)
    if (isNaN(id) || id <= 0) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

    const body = await req.json()
    const updateData: any = {}
    if (body.name !== undefined) {
      if (!body.name.trim()) return NextResponse.json({ error: 'Nama kelas wajib diisi' }, { status: 400 })
      updateData.name = body.name.trim()
    }
    if (body.level !== undefined) {
      updateData.level = body.level.trim() || null
    }

    if (body.teacher_id !== undefined) {
      const teacherId = parseInt(body.teacher_id, 10)
      if (isNaN(teacherId) || teacherId <= 0) return NextResponse.json({ error: 'Guru tidak valid' }, { status: 400 })
      
      const activeYear = await getActiveAcademicContext()
      if (!activeYear) {
        return NextResponse.json({ error: 'Active academic year required for academic assignment' }, { status: 400 })
      }
      
      await upsertTeacherAssignment(activeYear.id, id, teacherId)
    }

    if (body.program_id !== undefined) {
      // currently updateClass doesn't update program_id, but the user didn't say we can change program after creation. If needed we can add it to updateClass query later.
      // updateData.program_id = ...
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No data to update' }, { status: 400 })
    }

    await updateClass(id, updateData)
    return NextResponse.json({ message: 'Success' }, { status: 200 })
  } catch (error: any) {
    if (error.name === 'AuthError') return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { role } = await requireAuth()
    if (role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { id: idStr } = await params
    const id = parseInt(idStr, 10)
    if (isNaN(id) || id <= 0) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })

    await updateClass(id, { is_active: false })
    return NextResponse.json({ message: 'Success' }, { status: 200 })
  } catch (error: any) {
    if (error.name === 'AuthError') return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
