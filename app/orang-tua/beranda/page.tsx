import Link from 'next/link'
import { Sparkles, Calendar, BookOpen, Award, CheckCircle2, ChevronRight, User } from 'lucide-react'
import ProgressRing from '@/components/ui/ProgressRing'
import { getSession } from '@/lib/auth/session'
import { getAuthorizedAcademicChildren, studentIdToDbNumber } from '@/lib/guardians/parent-context'
import { getAttendanceSummaryByStudent } from '@/lib/db/queries/attendance'
import { getLastHafalanByStudent } from '@/lib/db/queries/hafalan'
import { getLearningReportsByStudent } from '@/lib/db/queries/learning-reports'
import { redirect } from 'next/navigation'
import Image from 'next/image'

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
}

function formatDate(dateStr: string | Date) {
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function ParentBerandaPage() {
  const session = await getSession()
  if (!session || session.role !== 'orang_tua') {
    redirect('/login')
  }

  const children = await getAuthorizedAcademicChildren(session.userId)

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="font-extrabold text-lg text-[#18085A]">Ahlan wa Sahlan,</h1>
          <p className="text-sm font-medium text-gray-600">{session.fullName}</p>
        </div>
      </div>

      {children.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="font-bold text-gray-900 mb-1">Belum Ada Data Anak</h3>
          <p className="text-sm text-gray-500">Anda belum dihubungkan dengan data santri. Silakan hubungi admin.</p>
        </div>
      ) : (
        await Promise.all(children.map(async (child) => {
          const dbStudentId = studentIdToDbNumber(child.student_id)
          const [attendance, lastHafalan, reports] = await Promise.all([
            getAttendanceSummaryByStudent(dbStudentId),
            getLastHafalanByStudent(dbStudentId),
            getLearningReportsByStudent(dbStudentId, 1)
          ])

          const presensiPct = attendance.total > 0 ? Math.round((attendance.hadir / attendance.total) * 100) : 0
          const hafalanScore = lastHafalan?.score || 0
          const latestReport = reports[0]

          return (
            <div key={child.student_id} className="space-y-4">
              {/* Child Header Card */}
              <div className="bg-gradient-to-r from-[#18085A] to-[#4B21A2] p-4 rounded-2xl text-white shadow-md flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {child.student_photo ? (
                    <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden relative">
                      <Image src={child.student_photo} alt={child.student_name || ''} fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[#FBBF24] text-[#18085A] font-bold text-sm flex items-center justify-center border-2 border-white">
                      {getInitials(child.student_name || '')}
                    </div>
                  )}
                  <div>
                    <h2 className="font-extrabold text-sm text-white">{child.student_name}</h2>
                    <p className="text-[11px] text-gray-300">{child.class_name} · {child.program_name}</p>
                    <p className="text-[10px] text-[#FBBF24] font-semibold mt-0.5">Guru: {child.teacher_name}</p>
                  </div>
                </div>
                <ProgressRing pct={presensiPct} size={48} />
              </div>

              {/* Metric Cards Grid */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="bg-white p-3 rounded-xl border border-gray-200 text-center shadow-sm">
                  <div className="text-base font-extrabold text-[#4B21A2]">{hafalanScore || '-'}</div>
                  <div className="text-[10px] text-gray-500 font-medium">Skor Hafalan</div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-gray-200 text-center shadow-sm">
                  <div className="text-base font-extrabold text-[#16A34A]">{presensiPct}%</div>
                  <div className="text-[10px] text-gray-500 font-medium">Presensi</div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-gray-200 text-center shadow-sm">
                  <div className="text-base font-extrabold text-amber-500">
                    {attendance.hadir}/{attendance.total}
                  </div>
                  <div className="text-[10px] text-gray-500 font-medium">Hadir</div>
                </div>
              </div>

              {/* Latest Report Card */}
              {latestReport ? (
                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-2.5">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
                      <Sparkles className="w-4 h-4 text-[#FBBF24]" /> Laporan Terbaru ({formatDate(latestReport.report_date)})
                    </div>
                    {latestReport.status === 'sent' && (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded-full">
                        BARU
                      </span>
                    )}
                  </div>

                  <div className="p-3 bg-[#F0EDF9] rounded-xl text-xs space-y-1.5">
                    <div className="font-bold text-[#4B21A2] text-xs">
                      Setoran: QS. {latestReport.surah_name_latin} {latestReport.ayah_start}-{latestReport.ayah_end}
                    </div>
                    <p className="text-gray-700 text-[11px] leading-relaxed line-clamp-3">
                      "{latestReport.ai_report_text || latestReport.teacher_notes || 'Tidak ada catatan.'}"
                    </p>
                  </div>

                  {latestReport.ai_parent_advice && (
                    <div className="p-3 bg-amber-50 rounded-xl text-xs space-y-1">
                      <span className="font-bold text-amber-900 text-[10px]">Saran Pendampingan:</span>
                      <p className="text-amber-800 text-[11px] leading-relaxed line-clamp-2">
                        "{latestReport.ai_parent_advice}"
                      </p>
                    </div>
                  )}

                  <Link
                    href={`/orang-tua/laporan/${latestReport.id}`}
                    className="w-full py-2.5 bg-[#4B21A2] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 hover:bg-[#3a1880]"
                  >
                    Lihat Laporan Selengkapnya <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              ) : (
                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm text-center">
                  <p className="text-xs text-gray-500">Belum ada laporan pembelajaran untuk santri ini.</p>
                </div>
              )}
            </div>
          )
        }))
      )}
    </div>
  )
}
