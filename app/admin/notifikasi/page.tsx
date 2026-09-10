'use client'

import { Bell, Check } from 'lucide-react'

export default function AdminNotifikasiPage() {
  const notifs = [
    { title: '4 laporan terkirim — Kelompok A', body: 'Ustadz Aldi Solihin telah mengirim laporan untuk semua santri Kelompok A.', time: '16:42', date: 'Kamis, 4 Sep' },
    { title: 'Khadijah Putri — kehadiran rendah', body: 'Kehadiran bulan ini 68%, di bawah ambang minimum 70%.', time: '09:15', date: 'Kamis, 4 Sep' },
    { title: 'Fulan bin Fulan — nilai menurun', body: 'Nilai hafalan 3 sesi terakhir rata-rata 55/100.', time: '08:30', date: 'Kamis, 4 Sep' },
    { title: 'Laporan mingguan tersedia', body: 'Ringkasan perkembangan mingguan semua kelas sudah siap ditinjau.', time: '07:00', date: 'Kamis, 4 Sep' },
  ]

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-center">
        <div>
          <h3 className="font-bold text-gray-900 text-sm">Pusat Notifikasi</h3>
          <p className="text-xs text-gray-500">Pemberitahuan sistem & pengingat aktivitas</p>
        </div>
        <button className="text-xs text-[#4B21A2] font-semibold hover:underline flex items-center gap-1">
          <Check className="w-3.5 h-3.5" /> Tandai Semua Dibaca
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100">
        {notifs.map((n, i) => (
          <div key={i} className="p-4 flex gap-3.5 items-start hover:bg-gray-50">
            <div className="w-9 h-9 rounded-full bg-[#F0EDF9] text-[#4B21A2] flex items-center justify-center flex-shrink-0 mt-0.5">
              <Bell className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-gray-900 text-xs">{n.title}</h4>
                <span className="text-[10px] text-gray-400">{n.time} · {n.date}</span>
              </div>
              <p className="text-xs text-gray-600 mt-0.5">{n.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
