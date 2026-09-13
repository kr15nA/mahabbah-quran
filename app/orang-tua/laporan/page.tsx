import Link from 'next/link'
import { FileText, ChevronRight, BookOpen } from 'lucide-react'
import { getSession } from '@/lib/auth/session'
import { getChildrenByParent } from '@/lib/db/queries/student-parents'
import { getLearningReportsByStudent } from '@/lib/db/queries/learning-reports'
import { redirect } from 'next/navigation'

function formatDate(dateStr: string | Date) {
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function ParentLaporanListPage() {
  const session = await getSession()
  if (!session || session.role !== 'orang_tua') {
    redirect('/login')
  }

  const children = await getChildrenByParent(session.userId)

  if (children.length === 0) {
    return (
      <div className="space-y-3">
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

  return (
    <div className="space-y-6 pb-20">
      {await Promise.all(
        children.map(async (child) => {
          const reports = await getLearningReportsByStudent(child.student_id, 20)

          return (
            <div key={child.student_id} className="space-y-3">
              <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-xs">Riwayat Laporan</h3>
                <span className="text-[10px] text-gray-500 font-semibold bg-gray-100 px-2 py-1 rounded-full">
                  {child.student_name}
                </span>
              </div>

              {reports.length === 0 ? (
                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm text-center">
                  <p className="text-xs text-gray-500">Belum ada laporan untuk santri ini.</p>
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
        })
      )}
    </div>
  )
}
