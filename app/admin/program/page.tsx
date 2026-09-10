'use client'

import { BookOpen, Plus } from 'lucide-react'

export default function DataProgramPage() {
  const programs = [
    { id: 1, name: 'Tahfizh Juz 30', desc: 'Program hafalan Juz 30 (Juz \'Amma) untuk pemula', status: 'Aktif' },
    { id: 2, name: 'Tahfizh Juz 29', desc: 'Program hafalan Juz 29 setelah menyelesaikan Juz 30', status: 'Aktif' },
    { id: 3, name: 'Tahsin Dasar', desc: 'Program perbaikan tajwid dan makhraj sebelum hafalan', status: 'Aktif' },
    { id: 4, name: 'Tahfizh Full', desc: 'Program hafalan Al-Qur\'an 30 Juz', status: 'Aktif' },
  ]

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-center">
        <div>
          <h3 className="font-bold text-gray-900 text-sm">Program Pembelajaran</h3>
          <p className="text-xs text-gray-500">Daftar kurikulum & program yang tersedia</p>
        </div>
        <button className="flex items-center gap-2 bg-[#4B21A2] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm">
          <Plus className="w-4 h-4" /> Tambah Program
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {programs.map((p) => (
          <div key={p.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#EDE9FE] text-[#4B21A2] flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-gray-900 text-sm">{p.name}</h4>
                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                  {p.status}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">{p.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
