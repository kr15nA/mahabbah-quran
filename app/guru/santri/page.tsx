'use client'

import { Users, Eye } from 'lucide-react'
import ProgressRing from '@/components/ui/ProgressRing'

export default function GuruSantriPage() {
  const students = [
    { id: 1, name: 'Ahmad Zaki Ramadhan', nickname: 'Ahmad', program: 'Tahfizh Juz 30', pct: 75, att: 92, score: 88 },
    { id: 2, name: 'Fatimah Az-Zahra', nickname: 'Fatimah', program: 'Tahfizh Juz 30', pct: 60, att: 88, score: 80 },
    { id: 3, name: 'Yusuf Al-Amin', nickname: 'Yusuf', program: 'Tahfizh Juz 30', pct: 80, att: 93, score: 92 },
    { id: 4, name: 'Aisyah Nur Hidayah', nickname: 'Aisyah', program: 'Tahfizh Juz 30', pct: 50, att: 85, score: 72 },
  ]

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-center">
        <div>
          <h3 className="font-bold text-gray-900 text-sm">Santri Binaan — Kelompok A</h3>
          <p className="text-xs text-gray-500">Daftar santri dalam bimbingan Ustadz Aldi Solihin</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {students.map((s) => (
          <div key={s.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-center">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-full bg-[#4B21A2] text-white font-bold text-sm flex items-center justify-center">
                {s.nickname[0]}
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-sm">{s.name}</h4>
                <p className="text-xs text-gray-500">{s.program}</p>
                <div className="flex gap-3 mt-1.5 text-xs">
                  <span className="font-semibold text-emerald-600">Presensi: {s.att}%</span>
                  <span className="font-semibold text-[#4B21A2]">Nilai Rata: {s.score}</span>
                </div>
              </div>
            </div>
            <ProgressRing pct={s.pct} size={42} />
          </div>
        ))}
      </div>
    </div>
  )
}
