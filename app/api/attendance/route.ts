import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireClassAccess, requireClassStudentAccess } from '@/lib/auth/rbac'
import { getAttendanceByClassDate, upsertAttendance } from '@/lib/db/queries/attendance'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const classId = Number(searchParams.get('class_id') || 1)
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

    await requireClassAccess(classId)

    const list = await getAttendanceByClassDate(classId, date)
    return NextResponse.json({ data: list })
  } catch (error: any) {
    if (error.name === 'AuthError') return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, role } = await requireAuth()
    if (role !== 'GURU' && role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const records = Array.isArray(body) ? body : [body]

    for (const item of records) {
      await requireClassStudentAccess(item.class_id, item.student_id)
      
      await upsertAttendance({
        student_id: item.student_id,
        class_id: item.class_id,
        teacher_id: session.userId, // Ignore body.teacher_id, rely on session
        attendance_date: item.attendance_date,
        status: item.status,
        notes: item.notes,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.name === 'AuthError') return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('POST /api/attendance error:', error)
    return NextResponse.json({ error: 'Failed to record attendance' }, { status: 500 })
  }
}
