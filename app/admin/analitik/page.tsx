'use client'

import LearningProgressChart from '@/components/charts/LearningProgressChart'
import AttendanceBarChart from '@/components/charts/AttendanceBarChart'

export default function AdminAnalitikPage() {
  return (
    <div className="space-y-5">
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
        <h3 className="font-bold text-gray-900 text-sm">Analitik & Statistik Lembaga</h3>
        <p className="text-xs text-gray-500">Visualisasi data perkembangan hafalan & presensi 8 bulan terakhir</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
          <h4 className="font-bold text-gray-900 text-sm">Tren Perkembangan Hafalan & Tahsin</h4>
          <LearningProgressChart />
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
          <h4 className="font-bold text-gray-900 text-sm">Statistik Kehadiran Institusi</h4>
          <AttendanceBarChart />
        </div>
      </div>
    </div>
  )
}
