import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getAttendanceByClassDate, upsertAttendance } from '@/lib/db/queries/attendance'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const classId = Number(searchParams.get('class_id') || 1)
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

  const list = await getAttendanceByClassDate(classId, date)
  return NextResponse.json({ data: list })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || (session.role !== 'guru' && session.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const records = Array.isArray(body) ? body : [body]

    for (const item of records) {
      await upsertAttendance({
        student_id: item.student_id,
        class_id: item.class_id,
        teacher_id: session.userId,
        attendance_date: item.attendance_date,
        status: item.status,
        notes: item.notes,
      })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('POST /api/attendance error:', err)
    return NextResponse.json({ error: 'Failed to record attendance' }, { status: 500 })
  }
}
