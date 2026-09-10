'use client'

import { useState, useEffect } from 'react'
import { Search, UserPlus, Mail, Phone, BookOpen, Users as UsersIcon } from 'lucide-react'

type Teacher = {
  id: number
  full_name: string
  email: string
  phone: string
  class_count?: number
  student_count?: number
}

export default function DataGuruPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    // Seed default teachers or fetch from API
    setTeachers([
      { id: 1, full_name: 'Ustadz Aldi Solihin', email: 'aldi.solihin@mahabbahquran.id', phone: '081234560001', class_count: 1, student_count: 4 },
      { id: 2, full_name: 'Ustadzah Siti Rahmah', email: 'siti.rahmah@mahabbahquran.id', phone: '081234560002', class_count: 1, student_count: 3 },
      { id: 3, full_name: 'Ustadz Ahmad Fauzi', email: 'ahmad.fauzi@mahabbahquran.id', phone: '081234560003', class_count: 1, student_count: 3 },
    ])
  }, [])

  const filtered = teachers.filter(t => t.full_name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-center">
        <div className="flex items-center gap-2 bg-[#F0EDF9] px-3 py-2 rounded-xl w-72">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari ustaz / ustazah..."
            className="bg-transparent text-xs outline-none text-gray-900 w-full"
          />
        </div>
        <button className="flex items-center gap-2 bg-[#4B21A2] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm">
          <UserPlus className="w-4 h-4" /> Tambah Guru
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {filtered.map((t) => (
          <div key={t.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#7B4BD6] text-white font-bold text-sm flex items-center justify-center">
                {t.full_name.split(' ').slice(-1)[0][0]}
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-sm">{t.full_name}</h4>
                <p className="text-[10px] text-gray-400">Guru Tahfizh</p>
              </div>
            </div>

            <div className="space-y-1 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-gray-400" /> {t.email}
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-gray-400" /> {t.phone}
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 grid grid-cols-2 gap-2 text-center">
              <div className="bg-[#F0EDF9] p-2 rounded-xl">
                <div className="flex items-center justify-center gap-1 text-[#4B21A2] font-bold text-sm">
                  <BookOpen className="w-3.5 h-3.5" /> {t.class_count}
                </div>
                <div className="text-[10px] text-gray-500">Kelas</div>
              </div>
              <div className="bg-[#F0EDF9] p-2 rounded-xl">
                <div className="flex items-center justify-center gap-1 text-[#16A34A] font-bold text-sm">
                  <UsersIcon className="w-3.5 h-3.5" /> {t.student_count}
                </div>
                <div className="text-[10px] text-gray-500">Santri</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
