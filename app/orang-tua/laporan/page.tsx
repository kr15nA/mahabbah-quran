import Link from 'next/link'
import { FileText, ChevronRight, BookOpen, User } from 'lucide-react'
import { getSession } from '@/lib/auth/session'
import { resolveParentChildContext, studentIdToDbNumber } from '@/lib/guardians/parent-context'
import { getLearningReportsByStudent } from '@/lib/db/queries/learning-reports'
import { getAcademicYears } from '@/lib/db/queries/academic-years'
import { redirect } from 'next/navigation'
import ChildSwitcher from '@/components/orang-tua/ChildSwitcher'
import AcademicYearSwitcher from '@/components/orang-tua/AcademicYearSwitcher'

function formatDate(dateStr: string | Date) {
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function ParentLaporanListPage({
  searchParams,
}: {
  searchParams: Promise<{ child_id?: string; academic_year_id?: string }>
}) {
  const session = await getSession()
  if (!session || session.role !== 'orang_tua') {
    redirect('/login')
  }

  const resolvedParams = await searchParams
  const allYears = await getAcademicYears()
  const activeYear = allYears.find((y) => y.isActive) || allYears[0]
  const parsedYearId = resolvedParams.academic_year_id ? parseInt(resolvedParams.academic_year_id, 10) : undefined
  const selectedYear = (parsedYearId ? allYears.find((y) => y.id === parsedYearId) : null) || activeYear

  const context = await resolveParentChildContext({
    userId: session.userId,
    requestedChildId: resolvedParams.child_id,
    academicYearId: selectedYear?.id,
  })

  if (context.status === 'NO_CHILDREN') {
    return (
      <div className="space-y-4 pb-20">
        <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="font-bold text-gray-900 mb-1">Belum Ada Data Laporan</h3>
          <p className="text-sm text-gray-500">Anda belum dihubungkan dengan data santri.</p>
        </div>
      </div>
    )
  }

  if (context.status === 'CHILD_REQUIRED') {
    return (
      <div className="space-y-4 pb-20">
        <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="font-bold text-gray-900 mb-1">Pilih Santri</h3>
          <p className="text-sm text-gray-500 mb-4">Pilih santri untuk melihat riwayat laporan pembelajaran.</p>
          <div className="flex justify-center">
            <ChildSwitcher childrenData={context.children} activeChildId="" />
          </div>
        </div>
      </div>
    )
  }

  if (context.status === 'INVALID_CHILD') {
    return (
      <div className="space-y-4 pb-20">
        <div className="bg-red-50 p-4 rounded-2xl border border-red-200 text-center">
          <h3 className="font-bold text-red-900 mb-1">Data Tidak Valid</h3>
          <p className="text-sm text-red-700">Identitas santri tidak valid.</p>
        </div>
      </div>
    )
  }

  if (context.status === 'FORBIDDEN_CHILD') {
    return (
      <div className="space-y-4 pb-20">
        <div className="bg-red-50 p-4 rounded-2xl border border-red-200 text-center">
          <h3 className="font-bold text-red-900 mb-1">Akses Ditolak</h3>
          <p className="text-sm text-red-700">Santri ini tidak terhubung dengan akun Anda.</p>
        </div>
      </div>
    )
  }

  // context.status === 'AUTHORIZED'
  const { child, children, childId } = context
  const dbStudentId = studentIdToDbNumber(childId)

  const reports = await getLearningReportsByStudent(dbStudentId, 50, {
    startDate: selectedYear?.startDate,
    endDate: selectedYear?.endDate,
  })

  return (
    <div className="space-y-4 pb-20">
      <ChildSwitcher childrenData={children} activeChildId={childId} />

      {/* Academic Year Switcher */}
      {allYears.length > 0 && selectedYear && (
        <AcademicYearSwitcher
          academicYears={allYears.map((ay) => ({
            id: ay.id,
            name: ay.name,
            isActive: ay.isActive,
          }))}
          selectedYearId={selectedYear.id}
        />
      )}

      {/* Student & Year Context Card */}
      <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-900 text-xs">Riwayat Laporan Pembelajaran</h3>
          <p className="text-[10px] text-gray-500 mt-0.5">
            Tahun Ajaran {selectedYear?.name} {selectedYear?.isActive ? '(Aktif)' : '(Arsip)'}
            {child.class_name ? ` · Kelas ${child.class_name}` : ''}
          </p>
        </div>
        <span className="text-[10px] text-purple-700 font-semibold bg-purple-50 px-2 py-1 rounded-full">
          {child.student_name}
        </span>
      </div>

      {/* Reports List */}
      {reports.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2 text-gray-400">
            <FileText className="w-6 h-6" />
          </div>
          <p className="text-xs font-semibold text-gray-700">Belum Ada Laporan</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Tidak ditemukan catatan laporan pembelajaran untuk tahun ajaran {selectedYear?.name}.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {reports.map((r) => (
            <Link
              key={r.id}
              href={`/orang-tua/laporan/${r.id}`}
              className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-center hover:border-[#4B21A2] transition-all"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 text-xs">
                    {r.surah_name_latin ? `QS. ${r.surah_name_latin}` : 'Laporan Harian'}
                  </span>
                  {r.hafalan_score != null && (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[9px] rounded-full">
                      Nilai: {r.hafalan_score}
                    </span>
                  )}
                  {r.status === 'sent' && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold text-[9px] rounded-full">
                      Terkirim
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-gray-500">
                  {formatDate(r.report_date)} {r.teacher_name ? `· ${r.teacher_name}` : ''}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
