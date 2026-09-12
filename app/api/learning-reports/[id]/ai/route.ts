import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireReportAccess } from '@/lib/auth/rbac'
import { getLearningReportById, updateLearningReport } from '@/lib/db/queries/learning-reports'
import { generateAIReport } from '@/lib/ai/report-generator'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { role } = await requireAuth()
    if (role !== 'GURU' && role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const resolvedParams = await params
    const id = Number(resolvedParams.id)
    
    await requireReportAccess(id)

    const report = await getLearningReportById(id)

    if (!report) {
      return NextResponse.json({ error: 'Laporan tidak ditemukan' }, { status: 404 })
    }

    const { reportText, parentAdvice } = await generateAIReport(report)

    await updateLearningReport(id, {
      ai_report_text: reportText,
      ai_parent_advice: parentAdvice,
    })

    return NextResponse.json({ data: { reportText, parentAdvice } })
  } catch (error: any) {
    if (error.name === 'AuthError') return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('AI Report generation error:', error)
    return NextResponse.json({ error: 'Gagal membuat laporan dengan AI' }, { status: 500 })
  }
}
