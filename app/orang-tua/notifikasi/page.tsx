'use client'

import { Bell } from 'lucide-react'

export default function ParentNotifikasiPage() {
  const notifs = [
    { title: 'Laporan Pembelajaran Baru', body: 'Ustadz Aldi Solihin telah mengirimkan laporan pembelajaran untuk Ahmad.', time: '16:30' },
    { title: 'Presensi Terkonfirmasi', body: 'Ahmad terverifikasi HADIR pada sesi tahfizh hari ini.', time: '14:15' },
  ]

  return (
    <div className="space-y-3">
      <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="font-bold text-gray-900 text-xs">Pemberitahuan Orang Tua</h3>
      </div>

      <div className="space-y-2">
        {notifs.map((n, i) => (
          <div key={i} className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-sm flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[#F0EDF9] text-[#4B21A2] flex items-center justify-center flex-shrink-0 mt-0.5">
              <Bell className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-gray-900 text-xs">{n.title}</h4>
                <span className="text-[10px] text-gray-400">{n.time}</span>
              </div>
              <p className="text-[11px] text-gray-600 mt-0.5 leading-snug">{n.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
