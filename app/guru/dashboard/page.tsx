
import Link from 'next/link'
import { Users, FileEdit, CheckCircle2, Clock } from 'lucide-react'
import ProgressRing from '@/components/ui/ProgressRing'
import { requireAuth } from '@/lib/auth/rbac'
import { getStudentsByTeacher } from '@/lib/db/queries/students'
import { getClassesByTeacher } from '@/lib/db/queries/classes'
import { getLearningReportsByTeacherDate } from '@/lib/db/queries/learning-reports'

export const dynamic = 'force-dynamic'

export default async function GuruDashboardPage() {
  const { session } = await requireAuth()
  
  const [classes, students, todayReports] = await Promise.all([
    getClassesByTeacher(session.userId),
    getStudentsByTeacher(session.userId),
    getLearningReportsByTeacherDate(session.userId)
  ])

  const classNames = classes.map(c => c.name).join(', ')
  const activeStudents = students.filter(s => s.status === 'active')
  const reportsSentToday = todayReports.length
  
  const topStudents = activeStudents
    .sort((a, b) => ((b.last_score || 0) - (a.last_score || 0)))
    .slice(0, 4)

  return (
    <div className="space-y-5">
      {/* Daily Summary & CTA */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#EDE9FE] text-[#4B21A2] flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-gray-900">{activeStudents.length}</div>
            <div className="text-xs text-gray-400">Santri Binaan ({classNames || 'Belum ada kelas'})</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-gray-900">{reportsSentToday}</div>
            <div className="text-xs text-gray-400">Laporan Terkirim Hari Ini</div>
          </div>
        </div>

        <Link
          href="/guru/laporan"
          className="bg-gradient-to-r from-[#FBBF24] to-[#F59E0B] p-5 rounded-2xl text-[#18085A] font-extrabold flex items-center justify-center gap-3 shadow-md hover:shadow-lg transition-all"
        >
          <FileEdit className="w-6 h-6" /> INPUT LAPORAN HARIAN
        </Link>
      </div>

      {/* Santri Cards */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <h3 className="font-bold text-gray-900 text-sm">Progress Tertinggi Santri Binaan</h3>
        {activeStudents.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500">Belum ada data santri aktif.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {topStudents.map((s) => (
              <div key={s.id} className="p-4 rounded-xl border border-gray-100 bg-[#FAFAFA] flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#4B21A2] text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                    {s.full_name
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-gray-900 text-xs truncate">{s.full_name}</h4>
                    <p className="text-[11px] text-gray-500 truncate">Kelas: {s.class_name}</p>
                  </div>
                </div>
                <ProgressRing pct={s.last_score || 0} size={36} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
