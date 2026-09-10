'use client'

import { Calendar, CheckCircle2, Clock, AlertCircle } from 'lucide-react'

export default function ParentAbsensiPage() {
  const days = [
    { date: '1 Sep', status: 'hadir' },
    { date: '2 Sep', status: 'hadir' },
    { date: '3 Sep', status: 'izin' },
    { date: '4 Sep', status: 'hadir' },
    { date: '5 Sep', status: 'hadir' },
  ]

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-1">
        <h3 className="font-bold text-gray-900 text-xs">Rekap Kehadiran Bulan Ini</h3>
        <p className="text-[11px] text-gray-400">Ahmad Zaki Ramadhan · September 2026</p>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center text-xs">
        <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl">
          <div className="font-extrabold text-emerald-700 text-base">4</div>
          <div className="text-[10px] text-emerald-800 font-semibold">Hadir</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl">
          <div className="font-extrabold text-amber-700 text-base">1</div>
          <div className="text-[10px] text-amber-800 font-semibold">Izin</div>
        </div>
        <div className="bg-orange-50 border border-orange-200 p-2.5 rounded-xl">
          <div className="font-extrabold text-orange-700 text-base">0</div>
          <div className="text-[10px] text-orange-800 font-semibold">Sakit</div>
        </div>
        <div className="bg-red-50 border border-red-200 p-2.5 rounded-xl">
          <div className="font-extrabold text-red-700 text-base">0</div>
          <div className="text-[10px] text-red-800 font-semibold">Alfa</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100 text-xs">
        {days.map((d, i) => (
          <div key={i} className="p-3.5 flex justify-between items-center">
            <span className="font-bold text-gray-900">{d.date} 2026</span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                d.status === 'hadir' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {d.status === 'hadir' ? 'HADIR' : 'IZIN'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
