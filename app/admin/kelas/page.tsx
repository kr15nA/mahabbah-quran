'use client'

import { Layers, Users, User, Plus } from 'lucide-react'

export default function DataKelasPage() {
  const classes = [
    { id: 1, name: 'Kelompok A', level: 'Juz 30', teacher: 'Ustadz Aldi Solihin', students: 4, program: 'Tahfizh Juz 30' },
    { id: 2, name: 'Kelompok B', level: 'Juz 30', teacher: 'Ustadzah Siti Rahmah', students: 3, program: 'Tahfizh Juz 30' },
    { id: 3, name: 'Kelompok C', level: 'Juz 29', teacher: 'Ustadz Ahmad Fauzi', students: 3, program: 'Tahfizh Juz 29' },
  ]

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-center">
        <div>
          <h3 className="font-bold text-gray-900 text-sm">Manajemen Kelas Tahfizh</h3>
          <p className="text-xs text-gray-500">Daftar kelompok belajar santri</p>
        </div>
        <button className="flex items-center gap-2 bg-[#4B21A2] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm">
          <Plus className="w-4 h-4" /> Tambah Kelas
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {classes.map((cls) => (
          <div key={cls.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-extrabold text-[#4B21A2] text-base">{cls.name}</h4>
                <p className="text-xs text-amber-600 font-semibold">{cls.level}</p>
              </div>
              <span className="px-2.5 py-1 bg-[#F0EDF9] text-[#4B21A2] font-bold text-[10px] rounded-lg">
                {cls.program}
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-gray-600 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" /> Guru: <span className="font-medium text-gray-900">{cls.teacher}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" /> Jumlah Santri: <span className="font-bold text-[#16A34A]">{cls.students} santri</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
