'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ChevronDown, History, User } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import type { AcademicYear } from '@/lib/db/queries/academic-years'
import type { TeacherAssignmentRow } from '@/lib/db/queries/teacher-assignments'
import type { ClassRow } from '@/lib/db/queries/classes'
import type { SafeGuruRow } from '@/lib/db/queries/users'

type Props = {
  academicYears: AcademicYear[]
  classes: ClassRow[]
  gurus: SafeGuruRow[]
}

export default function AssignmentClient({ academicYears, classes, gurus }: Props) {
  const router = useRouter()
  const { showToast } = useToast()

  const activeYear = academicYears.find(y => y.isActive)
  const [selectedYearId, setSelectedYearId] = useState<number | ''>(activeYear?.id || (academicYears[0]?.id ?? ''))
  const [assignments, setAssignments] = useState<TeacherAssignmentRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null)
  const [assignTeacherId, setAssignTeacherId] = useState<number | ''>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [historyModalClass, setHistoryModalClass] = useState<any | null>(null)
  const [classHistory, setClassHistory] = useState<TeacherAssignmentRow[]>([])

  useEffect(() => {
    if (selectedYearId) {
      fetchAssignments()
    } else {
      setAssignments([])
    }
  }, [selectedYearId])

  const fetchAssignments = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/teacher-assignments?academic_year_id=${selectedYearId}`)
      if (res.ok) {
        const data = await res.json()
        setAssignments(data)
      }
    } catch (err) {
      showToast('Gagal memuat data penugasan', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchHistory = async (cls: any) => {
    setHistoryModalClass(cls)
    setClassHistory([])
    try {
      const res = await fetch(`/api/classes/${cls.id}/teacher-assignments`)
      if (res.ok) {
        setClassHistory(await res.json())
      }
    } catch (e) {
      showToast('Gagal memuat histori', 'error')
    }
  }

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedClassId || !selectedYearId || !assignTeacherId) return

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/teacher-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: selectedClassId,
          academicYearId: selectedYearId,
          teacherId: assignTeacherId
        })
      })

      if (res.ok) {
        showToast('Penugasan guru berhasil disimpan', 'success')
        setShowAssignModal(false)
        fetchAssignments()
        router.refresh()
      } else {
        const data = await res.json()
        showToast(data.error || 'Terjadi kesalahan', 'error')
      }
    } catch (err) {
      showToast('Kesalahan jaringan', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const openAssignModal = (classId: number, currentTeacherId?: number) => {
    setSelectedClassId(classId)
    setAssignTeacherId(currentTeacherId || '')
    setShowAssignModal(true)
  }

  // Memoize matched classes
  const filteredClasses = useMemo(() => {
    return classes.filter(c => {
      const q = searchQuery.toLowerCase()
      if (q && !c.name.toLowerCase().includes(q) && !c.program_name?.toLowerCase().includes(q)) return false
      return true
    })
  }, [classes, searchQuery])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Tahun Ajaran</label>
          <div className="relative">
            <select
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value ? Number(e.target.value) : '')}
              className="w-full appearance-none border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#4B21A2] bg-white pr-10"
            >
              <option value="" disabled>Pilih Tahun Ajaran</option>
              {academicYears.map(y => (
                <option key={y.id} value={y.id}>
                  {y.name} {y.isActive ? '(Aktif)' : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Cari Kelas</label>
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Nama kelas atau program..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#4B21A2]"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading && assignments.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">Memuat data penugasan...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-500 font-medium">
                <tr>
                  <th className="px-4 py-3 border-b border-gray-100">Nama Kelas</th>
                  <th className="px-4 py-3 border-b border-gray-100">Program</th>
                  <th className="px-4 py-3 border-b border-gray-100">Guru Bertugas</th>
                  <th className="px-4 py-3 border-b border-gray-100 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredClasses.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500 text-sm">
                      Tidak ada kelas ditemukan
                    </td>
                  </tr>
                ) : (
                  filteredClasses.map(cls => {
                    const assignment = assignments.find(a => a.class_id === cls.id)
                    const isAssigned = !!assignment

                    return (
                      <tr key={cls.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-semibold text-gray-900">{cls.name}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {cls.program_name}
                        </td>
                        <td className="px-4 py-3">
                          {isAssigned ? (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-[#F0EDF9] flex items-center justify-center text-[#4B21A2]">
                                <User className="w-3 h-3" />
                              </div>
                              <span className="font-medium text-gray-900">{assignment.teacher_name}</span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                              Belum Ditugaskan
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => fetchHistory(cls)}
                              className="p-1.5 text-gray-400 hover:text-[#4B21A2] hover:bg-[#F0EDF9] rounded-lg transition-colors"
                              title="Lihat Histori"
                            >
                              <History className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openAssignModal(cls.id, assignment?.teacher_id)}
                              disabled={!selectedYearId}
                              className="px-3 py-1.5 rounded-lg bg-[#F0EDF9] text-[#4B21A2] text-xs font-bold hover:bg-[#3a1880] hover:text-white transition-all disabled:opacity-50"
                            >
                              {isAssigned ? 'Ganti Guru' : 'Tugaskan Guru'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-xl">
            <h3 className="font-bold text-gray-900 text-base">Penugasan Guru</h3>
            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Pilih Guru</label>
                <div className="relative">
                  <select
                    required
                    value={assignTeacherId}
                    onChange={(e) => setAssignTeacherId(Number(e.target.value))}
                    className="w-full appearance-none border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#4B21A2] bg-white pr-10"
                  >
                    <option value="" disabled>Pilih Guru</option>
                    {gurus.map(g => (
                      <option key={g.id} value={g.id}>{g.full_name}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !assignTeacherId}
                  className="flex-1 py-2.5 bg-[#4B21A2] text-white rounded-xl text-xs font-bold hover:bg-[#3a1880] transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyModalClass && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Histori Penugasan</h3>
                <p className="text-xs text-gray-500">Kelas: {historyModalClass.name}</p>
              </div>
              <button 
                onClick={() => setHistoryModalClass(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {classHistory.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">Belum ada histori penugasan.</p>
              ) : (
                classHistory.map(h => (
                  <div key={h.id} className="p-3 border border-gray-100 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-gray-900">{h.academic_year_name}</div>
                      <div className="text-xs text-gray-500">Status: {h.status}</div>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#F0EDF9] text-[#4B21A2] rounded-lg text-xs font-bold">
                      <User className="w-3.5 h-3.5" />
                      {h.teacher_name}
                    </div>
                  </div>
                ))
              )}
            </div>
            <button
              onClick={() => setHistoryModalClass(null)}
              className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-200 transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
