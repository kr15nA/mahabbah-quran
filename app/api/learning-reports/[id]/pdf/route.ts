import { NextRequest, NextResponse } from 'next/server'
import { requireReportAccess, AuthError } from '@/lib/auth/rbac'
import { getLearningReportById } from '@/lib/db/queries/learning-reports'
import { getAttendanceSummaryByStudent } from '@/lib/db/queries/attendance'
import { generateStudentReportPdf } from '@/lib/pdf/generator'
import { format } from 'date-fns'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reportIdStr } = await params
    const reportId = parseInt(reportIdStr)
    
    if (isNaN(reportId)) {
      return NextResponse.json({ error: 'ID tidak valid' }, { status: 400 })
    }

    try {
      await requireReportAccess(reportId)
    } catch (err: any) {
      if (err instanceof AuthError) {
        if (err.status === 403) {
           return NextResponse.json({ error: 'Not found' }, { status: 404 })
        }
        return NextResponse.json({ error: err.message }, { status: err.status })
      }
      throw err
    }

    const report = await getLearningReportById(reportId)
    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    const reportDateStr = typeof report.report_date === 'string' ? report.report_date : format(new Date(report.report_date), 'yyyy-MM-dd')
    const monthPrefix = reportDateStr.substring(0, 7)
    
    const attendance = await getAttendanceSummaryByStudent(report.student_id, monthPrefix)
    const reportAny = report as any

    const pdfData = {
      studentName: reportAny.student_name || 'Santri',
      nickname: '', // Nickname not in query currently, could be fetched but let's just use student_name
      className: reportAny.class_name || '-',
      reportDate: report.report_date,
      attendance: attendance,
      hafalan: report.hafalan_record_id ? {
        surahName: reportAny.surah_name_latin,
        ayahStart: reportAny.ayah_start,
        ayahEnd: reportAny.ayah_end,
        type: reportAny.hafalan_type,
        score: report.hafalan_score
      } : null,
      tahsin: report.tahsin_record_id ? {
        makhrajScore: reportAny.makhraj_score,
        tajwidScore: reportAny.tajwid_score,
        kelancaranScore: reportAny.kelancaran_score,
        ghunnahScore: reportAny.ghunnah_score
      } : null,
      report: {
        hafalanScore: report.hafalan_score,
        tahsinScore: report.tahsin_score,
        adabScore: report.adab_score,
        teacherNotes: report.teacher_notes,
        aiParentAdvice: report.ai_parent_advice,
        status: report.status
      }
    }

    const pdfBuffer = await generateStudentReportPdf(pdfData)

    const safeName = (reportAny.student_name || 'Santri').replace(/[^a-z0-9]/gi, '_').toLowerCase()
    const dateStr = format(new Date(report.report_date), 'yyyyMMdd')
    const filename = `laporan-${safeName}-${dateStr}.pdf`

    return new NextResponse(pdfBuffer as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })

  } catch (err: any) {
    console.error('PDF Generation Error:', err)
    return NextResponse.json({ error: 'Terjadi kesalahan saat membuat PDF' }, { status: 500 })
  }
}
