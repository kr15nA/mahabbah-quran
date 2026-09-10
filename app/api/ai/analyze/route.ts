import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { analyzeInstitution } from '@/lib/ai/institution-analyzer'
import { getAtRiskStudents } from '@/lib/db/queries/students'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { question } = await req.json()
    if (!question) {
      return NextResponse.json({ error: 'Pertanyaan wajib diisi' }, { status: 400 })
    }

    const atRisk = await getAtRiskStudents()
    const answer = await analyzeInstitution(question, {
      totalStudents: 150,
      activeStudents: 143,
      avgAttendance: 92,
      atRiskStudents: atRisk,
    })

    return NextResponse.json({ answer })
  } catch (error) {
    console.error('API AI Analyze error:', error)
    return NextResponse.json({ error: 'Gagal memproses analisis' }, { status: 500 })
  }
}
