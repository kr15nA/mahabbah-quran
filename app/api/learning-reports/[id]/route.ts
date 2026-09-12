import { NextRequest, NextResponse } from 'next/server'
import { requireReportAccess } from '@/lib/auth/rbac'
import { getLearningReportById } from '@/lib/db/queries/learning-reports'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params
    const id = Number(resolvedParams.id)
    
    await requireReportAccess(id)

    const report = await getLearningReportById(id)
    if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 })

    return NextResponse.json({ data: report })
  } catch (error: any) {
    if (error.name === 'AuthError') return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
