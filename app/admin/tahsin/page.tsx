'use client'

import { Star, Award } from 'lucide-react'

export default function AdminTahsinPage() {
  const records = [
    { name: 'Ahmad Zaki Ramadhan', makhraj: 4, tajwid: 5, kelancaran: 4, ghunnah: 3, date: '4 Sep 2026' },
    { name: 'Fatimah Az-Zahra', makhraj: 3, tajwid: 4, kelancaran: 3, ghunnah: 4, date: '4 Sep 2026' },
    { name: 'Yusuf Al-Amin', makhraj: 5, tajwid: 5, kelancaran: 4, ghunnah: 5, date: '4 Sep 2026' },
    { name: 'Aisyah Nur Hidayah', makhraj: 3, tajwid: 3, kelancaran: 3, ghunnah: 2, date: '4 Sep 2026' },
  ]

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-center">
        <div>
          <h3 className="font-bold text-gray-900 text-sm">Penilaian Tahsin & Tajwid</h3>
          <p className="text-xs text-gray-500">Evaluasi 4 dimensi kualitas bacaan santri</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {records.map((r, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-gray-900 text-sm">{r.name}</h4>
              <span className="text-[10px] text-gray-400">{r.date}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between items-center bg-[#F0EDF9] p-2 rounded-xl">
                <span className="text-gray-600 font-medium">Makhraj</span>
                <span className="font-bold text-[#4B21A2] flex items-center gap-0.5">{r.makhraj} <Star className="w-3 h-3 fill-amber-400 text-amber-400" /></span>
              </div>
              <div className="flex justify-between items-center bg-[#F0EDF9] p-2 rounded-xl">
                <span className="text-gray-600 font-medium">Tajwid</span>
                <span className="font-bold text-[#4B21A2] flex items-center gap-0.5">{r.tajwid} <Star className="w-3 h-3 fill-amber-400 text-amber-400" /></span>
              </div>
              <div className="flex justify-between items-center bg-[#F0EDF9] p-2 rounded-xl">
                <span className="text-gray-600 font-medium">Kelancaran</span>
                <span className="font-bold text-[#4B21A2] flex items-center gap-0.5">{r.kelancaran} <Star className="w-3 h-3 fill-amber-400 text-amber-400" /></span>
              </div>
              <div className="flex justify-between items-center bg-[#F0EDF9] p-2 rounded-xl">
                <span className="text-gray-600 font-medium">Ghunnah</span>
                <span className="font-bold text-[#4B21A2] flex items-center gap-0.5">{r.ghunnah} <Star className="w-3 h-3 fill-amber-400 text-amber-400" /></span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
