'use client'

import Link from 'next/link'
import { Users, FileEdit, CheckCircle2, Clock } from 'lucide-react'
import ProgressRing from '@/components/ui/ProgressRing'

export default function GuruDashboardPage() {
  const students = [
    { id: 1, name: 'Ahmad Zaki Ramadhan', lastHafalan: 'An-Naba 1-10', score: 88 },
    { id: 2, name: 'Fatimah Az-Zahra', lastHafalan: "'Abasa 9-16", score: 80 },
    { id: 3, name: 'Yusuf Al-Amin', lastHafalan: "An-Nazi'at 16-25", score: 92 },
    { id: 4, name: 'Aisyah Nur Hidayah', lastHafalan: 'Al-Mulk 1-10', score: 72 },
  ]

  return (
    <div className="space-y-5">
      {/* Daily Summary & CTA */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#EDE9FE] text-[#4B21A2] flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-gray-900">4</div>
            <div className="text-xs text-gray-400">Santri Binaan (Kelompok A)</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-gray-900">4 / 4</div>
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
        <h3 className="font-bold text-gray-900 text-sm">Daftar Santri Kelompok A</h3>
        <div className="grid grid-cols-2 gap-4">
          {students.map((s) => (
            <div key={s.id} className="p-4 rounded-xl border border-gray-100 bg-[#FAFAFA] flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#4B21A2] text-white font-bold text-xs flex items-center justify-center">
                  {s.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-xs">{s.name}</h4>
                  <p className="text-[11px] text-gray-500">Setoran Terakhir: {s.lastHafalan}</p>
                </div>
              </div>
              <ProgressRing pct={s.score} size={36} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
