'use client'

import { Calendar, CheckCircle2, AlertCircle, XCircle, Clock } from 'lucide-react'

export default function AdminAbsensiPage() {
  const attendance = [
    { name: 'Ahmad Zaki Ramadhan', class: 'Kelompok A', date: '4 Sep 2026', status: 'hadir' },
    { name: 'Fatimah Az-Zahra', class: 'Kelompok A', date: '4 Sep 2026', status: 'hadir' },
    { name: 'Yusuf Al-Amin', class: 'Kelompok A', date: '4 Sep 2026', status: 'izin' },
    { name: 'Aisyah Nur Hidayah', class: 'Kelompok A', date: '4 Sep 2026', status: 'hadir' },
    { name: 'Muhammad Raihan', class: 'Kelompok B', date: '4 Sep 2026', status: 'sakit' },
    { name: 'Khadijah Putri', class: 'Kelompok B', date: '4 Sep 2026', status: 'alfa' },
  ]

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-center">
        <div>
          <h3 className="font-bold text-gray-900 text-sm">Rekap Kehadiran Santri</h3>
          <p className="text-xs text-gray-500">Status presensi harian di semua kelompok</p>
        </div>
        <div className="flex items-center gap-2 bg-[#F0EDF9] px-3 py-1.5 rounded-xl text-xs font-semibold text-[#4B21A2]">
          <Calendar className="w-4 h-4" /> Kamis, 4 Sep 2026
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#F0EDF9] text-gray-500 font-bold border-b border-gray-200">
              <th className="p-3.5 px-4">Nama Santri</th>
              <th className="p-3.5">Kelas</th>
              <th className="p-3.5">Tanggal</th>
              <th className="p-3.5 px-4">Status Presensi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-800">
            {attendance.map((a, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="p-3.5 px-4 font-bold text-gray-900">{a.name}</td>
                <td className="p-3.5 text-gray-600">{a.class}</td>
                <td className="p-3.5 text-gray-600">{a.date}</td>
                <td className="p-3.5 px-4">
                  {a.status === 'hadir' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      <CheckCircle2 className="w-3 h-3" /> Hadir
                    </span>
                  )}
                  {a.status === 'izin' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      <Clock className="w-3 h-3" /> Izin
                    </span>
                  )}
                  {a.status === 'sakit' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800">
                      <AlertCircle className="w-3 h-3" /> Sakit
                    </span>
                  )}
                  {a.status === 'alfa' && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                      <XCircle className="w-3 h-3" /> Alfa
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
