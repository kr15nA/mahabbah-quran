'use client'

import { useState, useEffect } from 'react'
import { Search, Plus, Eye, Edit, Trash2, X } from 'lucide-react'
import ProgressRing from '@/components/ui/ProgressRing'

type Student = {
  id: number
  full_name: string
  nickname?: string
  class_name?: string
  program_name?: string
  teacher_name?: string
  last_score?: number
  attendance_pct?: number
  status: string
}

export default function DataSantriPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [search, setSearch] = useState('')
  const [filterProg, setFilterProg] = useState('all')
  const [filterCls, setFilterCls] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)

  // Form state
  const [fullName, setFullName] = useState('')
  const [nickname, setNickname] = useState('')
  const [classId, setClassId] = useState('1')
  const [gender, setGender] = useState<'male' | 'female'>('male')

  const fetchStudents = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/students?q=${encodeURIComponent(search)}`)
      const json = await res.json()
      if (json.data) {
        setStudents(json.data)
      }
    } catch (err) {
      console.error('Fetch students error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStudents()
  }, [search])

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: Number(classId),
          full_name: fullName,
          nickname,
          gender,
          enrollment_date: new Date().toISOString().split('T')[0],
        }),
      })

      if (res.ok) {
        setShowModal(false)
        setFullName('')
        setNickname('')
        fetchStudents()
      }
    } catch (err) {
      console.error('Failed to add student:', err)
    }
  }

  const PER = 6
  const filtered = students.filter((s) => {
    if (filterProg !== 'all' && s.program_name !== filterProg) return false
    if (filterCls !== 'all' && s.class_name !== filterCls) return false
    if (filterStatus !== 'all' && s.status !== filterStatus) return false
    return true
  })

  const total = filtered.length
  const pages = Math.max(1, Math.ceil(total / PER))
  const slice = filtered.slice((page - 1) * PER, page * PER)

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2.5 flex-1 min-w-[280px]">
          <div className="flex items-center gap-2 bg-[#F0EDF9] px-3 py-2 rounded-xl flex-1 max-w-xs">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Cari nama santri..."
              className="bg-transparent text-xs outline-none text-gray-900 w-full placeholder-gray-400"
            />
          </div>

          <select
            value={filterProg}
            onChange={(e) => {
              setFilterProg(e.target.value)
              setPage(1)
            }}
            className="border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white text-gray-700 outline-none"
          >
            <option value="all">Semua Program</option>
            <option value="Tahfizh Juz 30">Tahfizh Juz 30</option>
            <option value="Tahfizh Juz 29">Tahfizh Juz 29</option>
            <option value="Tahsin Dasar">Tahsin Dasar</option>
          </select>

          <select
            value={filterCls}
            onChange={(e) => {
              setFilterCls(e.target.value)
              setPage(1)
            }}
            className="border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white text-gray-700 outline-none"
          >
            <option value="all">Semua Kelas</option>
            <option value="Kelompok A">Kelompok A</option>
            <option value="Kelompok B">Kelompok B</option>
            <option value="Kelompok C">Kelompok C</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value)
              setPage(1)
            }}
            className="border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white text-gray-700 outline-none"
          >
            <option value="all">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Non-aktif</option>
          </select>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-[#4B21A2] hover:bg-[#3a1880] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" /> Tambah Santri
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F0EDF9] border-b border-gray-200 text-xs font-bold text-gray-400">
              <th className="p-3.5 px-4">Santri</th>
              <th className="p-3.5">Program</th>
              <th className="p-3.5">Kelas</th>
              <th className="p-3.5">Guru</th>
              <th className="p-3.5">Progress</th>
              <th className="p-3.5">Kehadiran</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5 px-4">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs text-gray-800">
            {loading ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-gray-400">
                  Memuat data santri...
                </td>
              </tr>
            ) : slice.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-gray-400">
                  Tidak ada santri ditemukan.
                </td>
              </tr>
            ) : (
              slice.map((s, idx) => (
                <tr key={s.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}>
                  <td className="p-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#4B21A2] text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                        {s.full_name
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{s.full_name}</div>
                        <div className="text-[10px] text-gray-400">ID: {String(s.id).padStart(4, '0')}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3.5 text-gray-600">{s.program_name || 'Tahfizh Juz 30'}</td>
                  <td className="p-3.5 text-gray-600">{s.class_name || 'Kelompok A'}</td>
                  <td className="p-3.5 text-gray-600">{s.teacher_name || 'Ust. Aldi Solihin'}</td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-2">
                      <ProgressRing pct={s.last_score || 75} size={32} />
                    </div>
                  </td>
                  <td className="p-3.5 font-bold text-emerald-600">{s.attendance_pct || 90}%</td>
                  <td className="p-3.5">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        s.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {s.status === 'active' ? 'Aktif' : 'Non-aktif'}
                    </span>
                  </td>
                  <td className="p-3.5 px-4">
                    <div className="flex gap-1.5">
                      <button className="w-7 h-7 rounded-lg bg-[#EDE9FE] text-[#4B21A2] flex items-center justify-center hover:bg-[#7B4BD6]/20">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button className="w-7 h-7 rounded-lg bg-[#EDE9FE] text-[#4B21A2] flex items-center justify-center hover:bg-[#7B4BD6]/20">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button className="w-7 h-7 rounded-lg bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-gray-200 flex justify-between items-center text-xs text-gray-500">
          <span>
            Menampilkan {Math.min((page - 1) * PER + 1, total)}–{Math.min(page * PER, total)} dari {total} santri
          </span>
          <div className="flex gap-1.5">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-50"
            >
              ← Sebelumnya
            </button>
            {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-lg font-bold ${
                  p === page ? 'bg-[#4B21A2] text-white' : 'border border-gray-200 text-gray-700'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              disabled={page === pages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-50"
            >
              Berikutnya →
            </button>
          </div>
        </div>
      </div>

      {/* Modal Tambah Santri */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-gray-900 text-base">Tambah Santri Baru</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddStudent} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ahmad Zaki Ramadhan"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#4B21A2]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nama Panggilan</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Ahmad"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#4B21A2]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Jenis Kelamin</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as 'male' | 'female')}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none"
                  >
                    <option value="male">Laki-laki</option>
                    <option value="female">Perempuan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Kelas</label>
                  <select
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none"
                  >
                    <option value="1">Kelompok A</option>
                    <option value="2">Kelompok B</option>
                    <option value="3">Kelompok C</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#4B21A2] text-white rounded-xl text-xs font-bold"
                >
                  Simpan Santri
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
