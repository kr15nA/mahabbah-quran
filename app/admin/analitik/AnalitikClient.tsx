'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useTransition, useState, useCallback } from 'react'
import { Users, GraduationCap, Building2, Calendar, FileText, Activity } from 'lucide-react'
import LearningActivityChart from '@/components/charts/LearningActivityChart'
import AttendanceBarChart from '@/components/charts/AttendanceBarChart'
import type { AdminAnalytics } from '@/lib/db/queries/analytics'

export default function AnalitikClient({
  analyticsData,
  progressChartData,
  attendanceChartData
}: {
  analyticsData: AdminAnalytics
  progressChartData: any[]
  attendanceChartData: any[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  
  const currentPeriod = analyticsData.periodStr // YYYY-MM
  const [selectedPeriod, setSelectedPeriod] = useState(currentPeriod)

  const handlePeriodChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setSelectedPeriod(val)
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (val) {
        params.set('period', val)
      } else {
        params.delete('period')
      }
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  // Derived totals
  const totalAttendance = analyticsData.attendance.hadir + analyticsData.attendance.izin + analyticsData.attendance.sakit + analyticsData.attendance.alfa
  const attendanceRate = totalAttendance > 0 
    ? Math.round((analyticsData.attendance.hadir / totalAttendance) * 100) 
    : 0

  return (
    <div className="space-y-5 pb-10 relative">
      {isPending && (
        <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] z-50 flex items-start justify-center pt-20 rounded-2xl">
          <div className="w-8 h-8 border-4 border-[#4B21A2] border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* Header and Filter */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h3 className="font-bold text-gray-900 text-sm">Analitik & Statistik Lembaga</h3>
          <p className="text-xs text-gray-500">Visualisasi data institusi Mahabbah Qur&apos;an</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-gray-600">Periode:</label>
          <input 
            type="month" 
            value={selectedPeriod}
            onChange={handlePeriodChange}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-700 focus:ring-2 focus:ring-[#4B21A2]/20 focus:border-[#4B21A2] outline-none"
          />
        </div>
      </div>

      {/* All-time KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Total Santri Aktif</p>
            <p className="text-xl font-bold text-gray-900">{analyticsData.totalStudents}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Sepanjang Waktu</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Total Guru Aktif</p>
            <p className="text-xl font-bold text-gray-900">{analyticsData.totalTeachers}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Sepanjang Waktu</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Total Kelas Aktif</p>
            <p className="text-xl font-bold text-gray-900">{analyticsData.totalClasses}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Sepanjang Waktu</p>
          </div>
        </div>
      </div>

      {/* Period-specific KPIs */}
      <div className="bg-[#4B21A2] rounded-2xl p-5 text-white shadow-sm">
        <h4 className="font-bold text-sm mb-4">Ringkasan Periode ({analyticsData.periodStr})</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/10 p-3 rounded-xl">
            <p className="text-xs text-white/80">Tingkat Kehadiran</p>
            <p className="text-2xl font-bold mt-1">{attendanceRate}%</p>
            <p className="text-[10px] text-white/60 mt-1">Hadir: {analyticsData.attendance.hadir} / Total: {totalAttendance}</p>
          </div>
          <div className="bg-white/10 p-3 rounded-xl">
            <p className="text-xs text-white/80">Total Laporan (Draft/Sent)</p>
            <p className="text-2xl font-bold mt-1">{analyticsData.reports.total}</p>
            <p className="text-[10px] text-white/60 mt-1">
              Draft: {analyticsData.reports.draft} • Terkirim: {analyticsData.reports.sent}
            </p>
          </div>
          <div className="bg-white/10 p-3 rounded-xl">
            <p className="text-xs text-white/80">Rata-rata Penilaian</p>
            <p className="text-2xl font-bold mt-1">{analyticsData.penilaianAverages.overall || 0}</p>
            <p className="text-[10px] text-white/60 mt-1">
              H: {analyticsData.penilaianAverages.hafalan} • T: {analyticsData.penilaianAverages.tahsin} • A: {analyticsData.penilaianAverages.adab}
            </p>
          </div>
          <div className="bg-white/10 p-3 rounded-xl">
            <p className="text-xs text-white/80">Aktivitas (Setoran)</p>
            <p className="text-2xl font-bold mt-1">{analyticsData.hafalanRecords}</p>
            <p className="text-[10px] text-white/60 mt-1">Tahsin: {analyticsData.tahsinRecords}</p>
          </div>
        </div>
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
          <h4 className="font-bold text-gray-900 text-sm">Tren Perkembangan Akademik</h4>
          <p className="text-[10px] text-gray-500 -mt-2">Rata-rata Nilai 8 Bulan Terakhir</p>
          <LearningActivityChart data={progressChartData} />
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
          <h4 className="font-bold text-gray-900 text-sm">Statistik Kehadiran Institusi</h4>
          <p className="text-[10px] text-gray-500 -mt-2">Distribusi Absensi 8 Bulan Terakhir</p>
          <AttendanceBarChart data={attendanceChartData} />
        </div>
      </div>
    </div>
  )
}
