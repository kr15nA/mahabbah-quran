import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, AuthError } from '@/lib/auth/rbac'
import { db } from '@/lib/db/client'
import { teacherAssignments } from '@/drizzle/schema'
import { eq, and } from 'drizzle-orm'
import { getClassStudentReportsForBatch } from '@/lib/db/queries/learning-reports'
import { getAttendanceSummaryByStudent } from '@/lib/db/queries/attendance'
import { generateStudentReportPdf } from '@/lib/pdf/generator'
import { createZipArchive, ZipEntry } from '@/lib/utils/zip'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    let auth
    try {
      auth = await requireAuth()
    } catch (err: any) {
      if (err instanceof AuthError) {
        return NextResponse.json({ error: err.message }, { status: err.status })
      }
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { session, role } = auth
    const searchParams = req.nextUrl.searchParams
    const classIdStr = searchParams.get('classId')
    const dateStr = searchParams.get('date') || undefined
    const academicYearIdStr = searchParams.get('academicYearId')

    const classId = parseInt(classIdStr || '')
    if (isNaN(classId) || classId <= 0) {
      return NextResponse.json({ error: 'classId harus berupa angka bulat valid' }, { status: 400 })
    }

    const academicYearId = academicYearIdStr ? parseInt(academicYearIdStr) : undefined

    // Authoritative RBAC check:
    // Only SUPER_ADMIN and authorized GURU assigned to this class may batch export.
    // Parent and Santri are strictly blocked.
    if (role !== 'SUPER_ADMIN' && role !== 'GURU') {
      return NextResponse.json({ error: 'Akses ditolak: Hanya Admin dan Guru pembimbing yang dapat melakukan ekspor batch.' }, { status: 403 })
    }

    if (role === 'GURU') {
      const isAssigned = await db
        .select({ id: teacherAssignments.id })
        .from(teacherAssignments)
        .where(
          and(
            eq(teacherAssignments.teacherId, session.userId),
            eq(teacherAssignments.classId, classId)
          )
        )
        .limit(1)

      if (isAssigned.length === 0) {
        return NextResponse.json({ error: 'Akses ditolak: Anda tidak ditugaskan pada kelas ini.' }, { status: 403 })
      }
    }

    // Fetch enrolled students and their reports
    const reportItems = await getClassStudentReportsForBatch({
      classId,
      date: dateStr,
      academicYearId,
    })

    if (reportItems.length === 0) {
      return NextResponse.json({ error: 'Tidak ada santri terdaftar di kelas ini.' }, { status: 404 })
    }

    const className = reportItems[0]?.class_name || `Kelas-${classId}`
    const safeClassName = className.replace(/[^a-z0-9]/gi, '_').toLowerCase()
    const exportDateStr = dateStr || format(new Date(), 'yyyy-MM-dd')

    const zipEntries: ZipEntry[] = []
    const generatedStudents: string[] = []
    const skippedStudents: string[] = []

    for (const item of reportItems) {
      if (!item.report_id) {
        skippedStudents.push(item.student_name)
        continue
      }

      const itemDate = item.report_date || exportDateStr
      const monthPrefix = typeof itemDate === 'string' ? itemDate.substring(0, 7) : format(new Date(itemDate), 'yyyy-MM')

      const attendance = await getAttendanceSummaryByStudent(item.student_id, monthPrefix)

      const pdfData = {
        studentName: item.student_name,
        nickname: '',
        className: item.class_name,
        reportDate: itemDate,
        attendance,
        hafalan: item.hafalan_record_id ? {
          surahName: item.surah_name_latin || 'Surah',
          ayahStart: item.ayah_start || 1,
          ayahEnd: item.ayah_end || 1,
          type: item.hafalan_type || 'hafalan_baru',
          score: item.hafalan_score ?? null,
        } : null,
        tahsin: item.tahsin_record_id ? {
          makhrajScore: item.makhraj_score ?? null,
          tajwidScore: item.tajwid_score ?? null,
          kelancaranScore: item.kelancaran_score ?? null,
          ghunnahScore: item.ghunnah_score ?? null,
        } : null,
        report: {
          hafalanScore: item.hafalan_score ?? null,
          tahsinScore: item.tahsin_score ?? null,
          adabScore: item.adab_score ?? null,
          teacherNotes: item.teacher_notes ?? null,
          aiParentAdvice: item.ai_parent_advice ?? null,
          status: item.status || 'draft',
        },
      }

      const pdfBuffer = await generateStudentReportPdf(pdfData)
      const safeStudentName = item.student_name.replace(/[^a-z0-9]/gi, '_').toLowerCase()
      const itemDateClean = typeof itemDate === 'string' ? itemDate.replace(/-/g, '') : format(new Date(itemDate), 'yyyyMMdd')
      const pdfFilename = `laporan-${safeClassName}-${safeStudentName}-${itemDateClean}.pdf`

      zipEntries.push({
        name: pdfFilename,
        data: Buffer.from(pdfBuffer),
      })
      generatedStudents.push(item.student_name)
    }

    // Generate batch summary document
    const summaryLines = [
      '==================================================',
      'RINGKASAN EKSPOR BATCH LAPORAN PEMBELAJARAN SANTRI',
      '==================================================',
      `Kelas            : ${className}`,
      `Tanggal Ekspor   : ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`,
      `Total Terdaftar  : ${reportItems.length}`,
      `Berhasil Diunduh : ${generatedStudents.length}`,
      `Dilewati (Kosong): ${skippedStudents.length}`,
      '',
      '--- SANTRI DENGAN LAPORAN TERSEDIA ---',
      ...generatedStudents.map((s, idx) => `${idx + 1}. ${s}`),
      '',
      '--- SANTRI DILEWATI (BELUM MEMILIKI LAPORAN) ---',
      ...(skippedStudents.length > 0 
        ? skippedStudents.map((s, idx) => `${idx + 1}. ${s}`)
        : ['(Semua santri memiliki laporan)']),
      '',
      'Dokumen ini dihasilkan secara otomatis oleh Mahabbah Qur\'an System.',
    ]

    zipEntries.push({
      name: `_RINGKASAN_BATCH_${safeClassName}.txt`,
      data: Buffer.from(summaryLines.join('\n'), 'utf8'),
    })

    const zipBuffer = createZipArchive(zipEntries)
    const zipFilename = `laporan-kelas-${safeClassName}-${exportDateStr.replace(/-/g, '')}.zip`

    return new NextResponse(zipBuffer as any, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFilename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err: any) {
    console.error('Batch report export error:', err)
    return NextResponse.json({ error: 'Terjadi kesalahan saat memproses ekspor batch laporan.' }, { status: 500 })
  }
}
