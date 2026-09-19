'use client'

import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import ProgressRing from '@/components/ui/ProgressRing'
import { ProfileAvatar } from '@/components/ui/ProfileAvatar'
import type { StudentRow } from '@/lib/db/queries/students'

export default function GuruSantriClient({ students, teacherName }: { students: StudentRow[], teacherName: string }) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    return students.filter(s => 
      s.full_name.toLowerCase().includes(search.toLowerCase()) || 
      (s.class_name && s.class_name.toLowerCase().includes(search.toLowerCase()))
    )
  }, [students, search])

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h3 className="font-bold text-gray-900 text-sm">Santri Binaan</h3>
          <p className="text-xs text-gray-500">Daftar santri dalam bimbingan {teacherName}</p>
        </div>
        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Cari nama santri..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#FBBF24] focus:ring-1 focus:ring-[#FBBF24] transition-colors"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-500">Tidak ada santri yang sesuai kriteria pencarian.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <div key={s.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-center relative overflow-hidden group hover:border-[#FBBF24] transition-colors">
              <div className="flex items-center gap-3.5 min-w-0">
                <ProfileAvatar 
                  src={s.photo_url} 
                  name={s.full_name} 
                  size={48} 
                  className="bg-[#4B21A2] text-white font-bold text-sm flex-shrink-0"
                />
                <div className="min-w-0 pr-2">
                  <h4 className="font-bold text-gray-900 text-sm truncate">{s.full_name}</h4>
                  <p className="text-xs text-gray-500 truncate">{s.class_name || s.program_name}</p>
                  <div className="flex flex-wrap gap-2 mt-1.5 text-[10px]">
                    <span className="font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full whitespace-nowrap">Presensi: {s.attendance_pct || 0}%</span>
                    <span className="font-semibold text-[#4B21A2] bg-[#F0EDF9] px-2 py-0.5 rounded-full whitespace-nowrap">Rata-rata: {s.last_score || 0}</span>
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0">
                <ProgressRing pct={s.last_score || 0} size={42} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
