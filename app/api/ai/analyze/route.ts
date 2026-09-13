import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getStudentById } from '@/lib/db/queries/students'
import { getAttendanceSummaryByStudent } from '@/lib/db/queries/attendance'
import { sql, db } from '@/lib/db/client'
import { hafalanRecords, tahsinRecords, learningReports, surahs } from '@/drizzle/schema'
import { eq, and, sql as dSql } from 'drizzle-orm'
import { analyzeStudentAcademicData, AcademicContextData } from '@/lib/ai/student-analyzer'
import { requireAuth } from '@/lib/auth/rbac'

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth()
    
    // RBAC: Only Admin can access
    if (auth.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Akses ditolak. Fitur ini hanya untuk Admin.' }, { status: 403 })
    }

    const { studentId, period } = await req.json()
    
    if (!studentId || !period) {
      return NextResponse.json({ error: 'Parameter studentId dan period wajib diisi' }, { status: 400 })
    }

    // 1. Fetch Student safely
    console.log('Fetching student...')
    const student = await getStudentById(Number(studentId))
    console.log('Student:', student)
    if (!student) {
      return NextResponse.json({ error: 'Santri tidak ditemukan' }, { status: 404 })
    }

    // 2. Fetch Attendance
    console.log('Fetching attendance...')
    const attendanceSummary = await getAttendanceSummaryByStudent(student.id, period)
    console.log('Attendance:', attendanceSummary)
    const totalAttendance = attendanceSummary.total
    const attendanceData = totalAttendance > 0 ? {
      hadir: attendanceSummary.hadir,
      izin: attendanceSummary.izin,
      sakit: attendanceSummary.sakit,
      alfa: attendanceSummary.alfa,
      totalRate: (attendanceSummary.hadir / totalAttendance) * 100
    } : null

    // 3. Fetch Hafalan
    console.log('Fetching hafalan...')
    const hafalanRows = await db
      .select({
        score: hafalanRecords.score,
        surahName: surahs.nameLatin
      })
      .from(hafalanRecords)
      .leftJoin(surahs, eq(surahs.id, hafalanRecords.surahId))
      .where(
        and(
          eq(hafalanRecords.studentId, student.id),
          dSql`TO_CHAR(${hafalanRecords.sessionDate}, 'YYYY-MM') = ${period}`
        )
      )
    
    const hafalanData = hafalanRows.length > 0 ? {
      totalSessions: hafalanRows.length,
      averageScore: hafalanRows.reduce((sum, r) => sum + (r.score ?? 0), 0) / hafalanRows.filter(r => r.score !== null).length || null,
      surahs: Array.from(new Set(hafalanRows.map(r => r.surahName).filter(Boolean))) as string[]
    } : null

    // 4. Fetch Tahsin
    console.log('Fetching tahsin...')
    const tahsinRows = await db
      .select({
        makhraj: tahsinRecords.makhrajScore,
        tajwid: tahsinRecords.tajwidScore,
        kelancaran: tahsinRecords.kelancaranScore,
        ghunnah: tahsinRecords.ghunnahScore
      })
      .from(tahsinRecords)
      .where(
        and(
          eq(tahsinRecords.studentId, student.id),
          dSql`TO_CHAR(${tahsinRecords.sessionDate}, 'YYYY-MM') = ${period}`
        )
      )

    const calcAvg = (arr: any[], key: string) => {
      const valid = arr.filter(r => r[key] !== null)
      return valid.length > 0 ? valid.reduce((sum, r) => sum + r[key], 0) / valid.length : null
    }

    const tahsinData = tahsinRows.length > 0 ? {
      totalSessions: tahsinRows.length,
      makhrajAvg: calcAvg(tahsinRows, 'makhraj'),
      tajwidAvg: calcAvg(tahsinRows, 'tajwid'),
      kelancaranAvg: calcAvg(tahsinRows, 'kelancaran'),
      ghunnahAvg: calcAvg(tahsinRows, 'ghunnah')
    } : null

    // 5. Fetch Learning Reports
    console.log('Fetching reports...')
    const reportRows = await db
      .select({
        adab: learningReports.adabScore,
        notes: learningReports.teacherNotes
      })
      .from(learningReports)
      .where(
        and(
          eq(learningReports.studentId, student.id),
          dSql`TO_CHAR(${learningReports.reportDate}, 'YYYY-MM') = ${period}`
        )
      )

    const reportData = reportRows.length > 0 ? {
      count: reportRows.length,
      averageAdab: calcAvg(reportRows, 'adab'),
      teacherNotes: reportRows.map(r => r.notes).filter(Boolean) as string[]
    } : null

    // Construct Context
    console.log('Constructing context...')
    const context: AcademicContextData = {
      studentName: student.full_name,
      period,
      attendance: attendanceData,
      hafalan: hafalanData,
      tahsin: tahsinData,
      reports: reportData
    }

    // Call AI
    console.log('Calling AI...')
    const analysis = await analyzeStudentAcademicData(context)
    console.log('AI success')

    return NextResponse.json({ answer: analysis })
  } catch (error: any) {
    console.error('API AI Analyze error stack:', error.stack)
    if (error?.message?.includes('Konfigurasi AI')) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }
    return NextResponse.json({ error: 'Gagal memproses analisis: ' + error?.message }, { status: 500 })
  }
}
