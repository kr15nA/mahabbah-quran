import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireStudentAccess } from '@/lib/auth/rbac'
import { getHafalanByStudent, insertHafalanRecord } from '@/lib/db/queries/hafalan'
import { getSurahById } from '@/lib/db/queries/surahs'
import { validateSurahAyahRange } from '@/lib/quran/validators'
import { assertNotSelfAssessment } from '@/lib/identity/self-assessment'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const studentId = searchParams.get('student_id')

    if (!studentId) {
      return NextResponse.json({ error: 'student_id is required' }, { status: 400 })
    }

    await requireStudentAccess(Number(studentId))
    const list = await getHafalanByStudent(Number(studentId))
    
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
    if (!body.student_id) return NextResponse.json({ error: 'student_id is required' }, { status: 400 })
    if (!body.surah_id) return NextResponse.json({ error: 'surah_id is required' }, { status: 400 })
    if (!body.ayah_start || !body.ayah_end) return NextResponse.json({ error: 'ayah_start and ayah_end are required' }, { status: 400 })

    await requireStudentAccess(body.student_id)
    await assertNotSelfAssessment({ actorUserId: session.userId, targetStudentId: body.student_id })
    
    const surah = await getSurahById(body.surah_id)
    const validationError = validateSurahAyahRange(surah, body.ayah_start, body.ayah_end)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }
      
    const id = await insertHafalanRecord({
      student_id: body.student_id,
      teacher_id: session.userId, // Source of truth for teacher
      surah_id: body.surah_id,
      session_date: body.session_date || new Date().toISOString().split('T')[0],
      ayah_start: body.ayah_start,
      ayah_end: body.ayah_end,
      type: body.type,
      score: body.score
    })

    return NextResponse.json({ data: { id } }, { status: 201 })
  } catch (error: any) {
    if (error.name === 'AuthError') return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('POST /api/hafalan error:', error)
    return NextResponse.json({ error: 'Failed to record hafalan' }, { status: 500 })
  }
}
