import Link from 'next/link'
import {
  Users,
  CheckCircle,
  User,
  Layers,
  Activity,
  AlertTriangle,
  Eye,
  Brain,
  RefreshCw,
  X,
} from 'lucide-react'
import LearningActivityChart from '@/components/charts/LearningActivityChart'
import AttendanceBarChart from '@/components/charts/AttendanceBarChart'
import { 
  getAcademicDashboardContext, 
  getAcademicPrimaryStats,
  getAttendanceToday,
  getAttendanceTrend7Days,
  getLearningActivityStats,
  getLearningActivityChart6Weeks
} from '@/lib/dashboard/academic'
import { getAtRiskStudents } from '@/lib/db/queries/students'

export default async function AdminDashboardPage() {
  const context = await getAcademicDashboardContext()

  if (!context) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-gray-200">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Tahun Ajaran Belum Dikonfigurasi</h2>
        <p className="text-gray-500 text-sm">
          Tidak ada Tahun Ajaran yang aktif. Silakan atur Tahun Ajaran aktif terlebih dahulu untuk melihat dashboard akademik.
        </p>
      </div>
    )
  }

  // Core KPIs - if these fail, the page throws (handled by error.tsx ideally)
  const primaryStats = await getAcademicPrimaryStats(context)
  
  // Optional queries
  const [
    attendanceTodayResult,
    attendanceTrendResult,
    activityStatsResult,
    activityChartResult,
    atRiskResult
  ] = await Promise.allSettled([
    getAttendanceToday(),
    getAttendanceTrend7Days(),
    getLearningActivityStats(),
    getLearningActivityChart6Weeks(),
    getAtRiskStudents()
  ])

  const attendanceToday = attendanceTodayResult.status === 'fulfilled' ? attendanceTodayResult.value : null
  const attendanceTrend = attendanceTrendResult.status === 'fulfilled' ? attendanceTrendResult.value : null
  const activityStats = activityStatsResult.status === 'fulfilled' ? activityStatsResult.value : null
  const activityChart = activityChartResult.status === 'fulfilled' ? activityChartResult.value : null
  const atRisk = atRiskResult.status === 'fulfilled' ? atRiskResult.value : null

  return (
    <div className="space-y-5">
      {/* Header Info */}
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Akademik</h1>
        <div className="bg-[#F0EDF9] px-4 py-1.5 rounded-full text-sm font-semibold text-[#4B21A2] border border-[#E9D5FF]">
          Tahun Ajaran {context.name}
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {[
          { icon: CheckCircle, label: 'Santri Aktif', val: primaryStats.santriAktif, sub: 'Terdaftar Aktif', col: '#16A34A' },
          { icon: User, label: 'Guru Aktif', val: primaryStats.guruAktif, sub: 'Pendidik', col: '#7B4BD6' },
          { icon: Layers, label: 'Kelas Aktif', val: primaryStats.kelasAktif, sub: 'Kelas', col: '#F59E0B' },
          { icon: Users, label: 'Program Aktif', val: primaryStats.programAktif, sub: 'Program Institusi', col: '#0EA5E9' },
        ].map(({ icon: Icon, label, val, sub, col }) => (
          <div key={label} className="bg-white p-4.5 rounded-2xl border border-gray-200 flex items-center gap-3.5 shadow-sm">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${col}15` }}>
              <Icon className="w-5.5 h-5.5" style={{ color: col }} />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-gray-900 leading-none">{val}</div>
              <div className="text-xs text-gray-400 mt-1 font-medium">{label}</div>
              <div className="text-[11px] font-semibold mt-0.5" style={{ color: col }}>{sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Secondary KPIs Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
        <div className="bg-white p-4.5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-center">
          <h3 className="text-xs font-bold text-gray-900 mb-3">Kehadiran Hari Ini</h3>
          {attendanceToday ? (
            (attendanceToday.hadir + attendanceToday.izin + attendanceToday.sakit + attendanceToday.alfa === 0) ? (
              <div className="text-xs text-gray-400 italic">Belum ada data kehadiran hari ini</div>
            ) : (
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <div className="text-lg font-extrabold text-[#4B21A2]">{attendanceToday.hadir}</div>
                  <div className="text-[10px] text-gray-500 font-medium">Hadir</div>
                </div>
                <div>
                  <div className="text-lg font-extrabold text-[#FBBF24]">{attendanceToday.izin}</div>
                  <div className="text-[10px] text-gray-500 font-medium">Izin</div>
                </div>
                <div>
                  <div className="text-lg font-extrabold text-[#F59E0B]">{attendanceToday.sakit}</div>
                  <div className="text-[10px] text-gray-500 font-medium">Sakit</div>
                </div>
                <div>
                  <div className="text-lg font-extrabold text-[#DC2626]">{attendanceToday.alfa}</div>
                  <div className="text-[10px] text-gray-500 font-medium">Alfa</div>
                </div>
              </div>
            )
          ) : (
             <div className="text-xs text-red-500">Data tidak dapat dimuat saat ini</div>
          )}
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-gray-200 shadow-sm md:col-span-3">
          <h3 className="text-xs font-bold text-gray-900 mb-3">Aktivitas Pembelajaran (7 Hari Terakhir)</h3>
          {activityStats ? (
            <div className="grid grid-cols-3 gap-4 text-center h-full items-center">
              <div>
                <div className="text-2xl font-extrabold text-[#4B21A2]">{activityStats.hafalan}</div>
                <div className="text-[11px] text-gray-500 font-medium">Santri Hafalan</div>
              </div>
              <div className="border-l border-gray-100">
                <div className="text-2xl font-extrabold text-[#FBBF24]">{activityStats.tahsin}</div>
                <div className="text-[11px] text-gray-500 font-medium">Santri Tahsin</div>
              </div>
              <div className="border-l border-gray-100">
                <div className="text-2xl font-extrabold text-[#16A34A]">{activityStats.penilaian}</div>
                <div className="text-[11px] text-gray-500 font-medium">Santri Dinilai</div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-red-500">Data tidak dapat dimuat saat ini</div>
          )}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-gray-900">Aktivitas Pembelajaran (6 Minggu)</h3>
            <Link href="/admin/analitik" className="text-xs font-semibold text-[#4B21A2] hover:underline">
              Detail →
            </Link>
          </div>
          <div className="flex gap-4 mb-3 text-xs text-gray-500">
            <div className="flex items-center gap-1.5"><span className="text-[#4B21A2]">●</span> Santri Hafalan</div>
            <div className="flex items-center gap-1.5"><span className="text-[#FBBF24]">●</span> Santri Tahsin</div>
            <div className="flex items-center gap-1.5"><span className="text-[#16A34A]">●</span> Santri Dinilai</div>
          </div>
          {activityChart ? (
            <LearningActivityChart data={activityChart} />
          ) : (
            <div className="h-[180px] flex items-center justify-center text-xs text-red-500 border border-dashed rounded-xl border-red-200 bg-red-50">
              Grafik tidak dapat dimuat saat ini
            </div>
          )}
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-gray-900">Kehadiran 7 Hari Terakhir</h3>
            <Link href="/admin/absensi" className="text-xs font-semibold text-[#4B21A2] hover:underline">
              Detail →
            </Link>
          </div>
          <div className="flex gap-4 mb-3 text-xs text-gray-500">
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#4B21A2]" /> Hadir</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#FBBF24]" /> Izin</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#F59E0B]" /> Sakit</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#DC2626]" /> Alfa</div>
          </div>
          {attendanceTrend ? (
            <AttendanceBarChart data={attendanceTrend} />
          ) : (
            <div className="h-[180px] flex items-center justify-center text-xs text-red-500 border border-dashed rounded-xl border-red-200 bg-red-50">
              Grafik tidak dapat dimuat saat ini
            </div>
          )}
        </div>
      </div>

      {/* At-Risk Table */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Santri Perlu Perhatian</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">Berdasarkan pola kehadiran dan perkembangan Hafalan terbaru.</p>
          </div>
          <Link href="/admin/santri" className="text-xs font-semibold text-[#4B21A2]">Lihat Semua →</Link>
        </div>
        
        {atRisk ? (
          atRisk.length === 0 ? (
            <div className="p-4 text-center text-xs text-gray-500 border border-dashed rounded-xl">
              Tidak ada santri yang memerlukan perhatian khusus saat ini.
            </div>
          ) : (
            <div className="space-y-2.5">
              {atRisk.map((r, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${
                    r.severity === 'danger' ? 'bg-red-50/50 border-red-200' : 'bg-amber-50/50 border-amber-200'
                  }`}
                >
                  <div className="flex gap-2.5 min-w-0">
                    <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${r.severity === 'danger' ? 'text-red-600' : 'text-amber-600'}`} />
                    <div>
                      <div className="text-xs font-bold text-gray-900">{r.name}</div>
                      <div className="text-[11px] text-gray-400">{r.class_name || 'Tanpa Kelas'}</div>
                      <div className={`text-[11px] font-semibold mt-1 ${r.severity === 'danger' ? 'text-red-600' : 'text-amber-600'}`}>
                        {r.issue}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <Link
                href="/admin/santri"
                className="w-full mt-2 py-2.5 bg-[#EDE9FE] border border-dashed border-[#7B4BD6] text-[#4B21A2] rounded-xl font-semibold text-xs flex items-center justify-center gap-2 hover:bg-[#7B4BD6]/10 transition-all"
              >
                <Eye className="w-3.5 h-3.5" /> Lihat semua santri
              </Link>
            </div>
          )
        ) : (
          <div className="p-4 text-center text-xs text-red-500 border border-dashed rounded-xl border-red-200 bg-red-50">
            Daftar santri tidak dapat dimuat saat ini.
          </div>
        )}
      </div>
    </div>
  )
}
