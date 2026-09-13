import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireStudentAccess } from '@/lib/auth/rbac'
import {
  getLearningReportsByTeacherDate,
  getLearningReportsByStudent,
  getAllReportsAdmin,
  insertLearningReport,
} from '@/lib/db/queries/learning-reports'
import { insertHafalanRecord } from '@/lib/db/queries/hafalan'
import { insertTahsinRecord } from '@/lib/db/queries/tahsin'
import { getActiveEnrollment } from '@/lib/db/queries/academic-context'

export async function GET(req: NextRequest) {
  try {
    const { session, role } = await requireAuth()

    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get('student_id')
    const date = searchParams.get('date') ?? undefined

    if (studentId) {
      await requireStudentAccess(Number(studentId))
      const reports = await getLearningReportsByStudent(Number(studentId))
      return NextResponse.json({ data: reports })
    }

    if (role === 'GURU') {
      const reports = await getLearningReportsByTeacherDate(session.userId, date)
      return NextResponse.json({ data: reports })
    }

    if (role === 'SUPER_ADMIN') {
      const reports = await getAllReportsAdmin()
      return NextResponse.json({ data: reports })
    }

    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  } catch (error: any) {
    if (error.name === 'AuthError') return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, role } = await requireAuth()
    if (role !== 'GURU') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    if (!body.student_id) return NextResponse.json({ error: 'student_id is required' }, { status: 400 })

    await requireStudentAccess(body.student_id)

    const activeEnrollment = await getActiveEnrollment(body.student_id)
    if (!activeEnrollment) {
      return NextResponse.json({ error: 'Active enrollment required to create a report' }, { status: 400 })
    }

    const reportDate = body.report_date || new Date().toISOString().split('T')[0]

    let hafalanRecordId: number | undefined
    if (body.surah_id && body.ayah_start && body.ayah_end) {
      hafalanRecordId = await insertHafalanRecord({
        student_id: body.student_id,
        teacher_id: session.userId,
        surah_id: body.surah_id,
        session_date: reportDate,
        ayah_start: body.ayah_start,
        ayah_end: body.ayah_end,
        type: body.hafalan_type || 'hafalan_baru',
        score: body.hafalan_score,
      })
    }

    let tahsinRecordId: number | undefined
    if (body.makhraj_score || body.tajwid_score) {
      tahsinRecordId = await insertTahsinRecord({
        student_id: body.student_id,
        teacher_id: session.userId,
        session_date: reportDate,
        makhraj_score: body.makhraj_score,
        tajwid_score: body.tajwid_score,
        kelancaran_score: body.kelancaran_score,
        ghunnah_score: body.ghunnah_score,
      })
    }

    const reportId = await insertLearningReport({
      student_id: body.student_id,
      class_id: activeEnrollment.classId,
      teacher_id: session.userId,
      report_date: reportDate,
      attendance_status: body.attendance_status || 'hadir',
      hafalan_record_id: hafalanRecordId,
      tahsin_record_id: tahsinRecordId,
      hafalan_score: body.hafalan_score,
      tahsin_score: body.tahsin_score,
      adab_score: body.adab_score,
      teacher_notes: body.teacher_notes,
      status: 'draft',
    })

    return NextResponse.json({ data: { id: reportId } }, { status: 201 })
  } catch (error: any) {
    if (error.name === 'AuthError') return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('POST /api/learning-reports error:', error)
    return NextResponse.json({ error: 'Failed to create report' }, { status: 500 })
  }
}
