import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import {
  getLearningReportsByTeacherDate,
  getLearningReportsByStudent,
  getAllReportsAdmin,
  insertLearningReport,
} from '@/lib/db/queries/learning-reports'
import { insertHafalanRecord } from '@/lib/db/queries/hafalan'
import { insertTahsinRecord } from '@/lib/db/queries/tahsin'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const studentId = searchParams.get('student_id')
  const date = searchParams.get('date') ?? undefined

  if (studentId) {
    const reports = await getLearningReportsByStudent(Number(studentId))
    return NextResponse.json({ data: reports })
  }

  if (session.role === 'guru') {
    const reports = await getLearningReportsByTeacherDate(session.userId, date)
    return NextResponse.json({ data: reports })
  }

  const reports = await getAllReportsAdmin()
  return NextResponse.json({ data: reports })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'guru') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()
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
  } catch (error) {
    console.error('POST /api/learning-reports error:', error)
    return NextResponse.json({ error: 'Failed to create report' }, { status: 500 })
  }
}
