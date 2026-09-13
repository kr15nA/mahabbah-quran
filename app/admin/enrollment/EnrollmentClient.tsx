'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ChevronDown, Check, History, Layers } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import type { AcademicYear } from '@/lib/db/queries/academic-years'
import type { EnrollmentRow } from '@/lib/db/queries/enrollments'

type Props = {
  academicYears: AcademicYear[]
  classes: any[] // We can type this properly later, it has id, name, program_name
  students: any[] // StudentRow
}

export default function EnrollmentClient({ academicYears, classes, students }: Props) {
  const router = useRouter()
  const { showToast } = useToast()

  const activeYear = academicYears.find(y => y.isActive)
  const [selectedYearId, setSelectedYearId] = useState<number | ''>(activeYear?.id || (academicYears[0]?.id ?? ''))
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [classFilter, setClassFilter] = useState<number | ''>('')
  
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null)
  const [assignClassId, setAssignClassId] = useState<number | ''>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [historyModalStudent, setHistoryModalStudent] = useState<any | null>(null)
  const [studentHistory, setStudentHistory] = useState<EnrollmentRow[]>([])

  useEffect(() => {
    if (selectedYearId) {
      fetchEnrollments()
    } else {
      setEnrollments([])
    }
  }, [selectedYearId, classFilter])

  const fetchEnrollments = async () => {
    setIsLoading(true)
    try {
      let url = `/api/enrollments?academic_year_id=${selectedYearId}`
      if (classFilter) url += `&class_id=${classFilter}`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setEnrollments(data)
      }
    } catch (err) {
      showToast('Gagal memuat data penempatan', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchHistory = async (student: any) => {
    setHistoryModalStudent(student)
    setStudentHistory([])
    try {
      const res = await fetch(`/api/students/${student.id}/enrollments`)
      if (res.ok) {
        setStudentHistory(await res.json())
      }
    } catch (e) {
      showToast('Gagal memuat histori', 'error')
    }
  }

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStudentId || !selectedYearId || !assignClassId) return

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudentId,
          academicYearId: selectedYearId,
          classId: assignClassId
        })
      })

      if (res.ok) {
        showToast('Penempatan kelas berhasil disimpan', 'success')
        setShowAssignModal(false)
        fetchEnrollments()
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

  const openAssignModal = (studentId: number, currentClassId?: number) => {
    setSelectedStudentId(studentId)
    setAssignClassId(currentClassId || '')
    setShowAssignModal(true)
  }

  // Memoize matched students
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const q = searchQuery.toLowerCase()
      if (q && !s.full_name.toLowerCase().includes(q)) return false
      
      const enrollment = enrollments.find(e => e.student_id === s.id)
      
      // If a class filter is selected, we only want students enrolled in that class in the selected year
      if (classFilter) {
        return enrollment && enrollment.class_id === classFilter
      }
      
      return true
    })
  }, [students, enrollments, searchQuery, classFilter])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <label className="block text-xs font-semibold text-gray-700 mb-1">Filter Kelas</label>
          <div className="relative">
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value ? Number(e.target.value) : '')}
              className="w-full appearance-none border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#4B21A2] bg-white pr-10"
            >
              <option value="">Semua Kelas</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Cari Santri</label>
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Nama santri..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#4B21A2]"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading && enrollments.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">Memuat data penempatan...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-500 font-medium">
                <tr>
                  <th className="px-4 py-3 border-b border-gray-100">Nama Santri</th>
                  <th className="px-4 py-3 border-b border-gray-100">Status Penempatan</th>
                  <th className="px-4 py-3 border-b border-gray-100">Kelas Aktif</th>
                  <th className="px-4 py-3 border-b border-gray-100 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500 text-sm">
                      Tidak ada santri ditemukan
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map(student => {
                    const enrollment = enrollments.find(e => e.student_id === student.id)
                    const isEnrolled = !!enrollment

                    return (
                      <tr key={student.id} className="hover:bg-gray-50 transition-colors even:bg-gray-50/50 odd:bg-white">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center overflow-hidden">
                              {student.photo_url ? (
                                <img src={student.photo_url} alt={student.full_name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[10px] font-bold text-gray-500">{student.full_name.substring(0, 2).toUpperCase()}</span>
                              )}
                            </div>
                            <span className="font-semibold text-gray-900">{student.full_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {isEnrolled ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <Check className="w-3 h-3" /> Ditempatkan
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600">
                              Belum Ditempatkan
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isEnrolled ? (
                            <div className="flex items-center gap-1.5 text-gray-700 font-medium">
                              <Layers className="w-4 h-4 text-[#4B21A2]" />
                              {enrollment.class_name}
                            </div>
                          ) : (
                            <span className="text-gray-400 italic text-xs">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => fetchHistory(student)}
                              className="p-1.5 text-gray-400 hover:text-[#4B21A2] hover:bg-[#F0EDF9] rounded-lg transition-colors"
                              title="Lihat Histori"
                            >
                              <History className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openAssignModal(student.id, enrollment?.class_id)}
                              disabled={!selectedYearId}
                              className="px-3 py-1.5 rounded-lg bg-[#F0EDF9] text-[#4B21A2] text-xs font-bold hover:bg-[#3a1880] hover:text-white transition-all disabled:opacity-50"
                            >
                              Pindahkan
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
            <h3 className="font-bold text-gray-900 text-base">Penempatan Kelas</h3>
            <form onSubmit={handleAssignSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Pilih Kelas</label>
                <div className="relative">
                  <select
                    required
                    value={assignClassId}
                    onChange={(e) => setAssignClassId(Number(e.target.value))}
                    className="w-full appearance-none border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#4B21A2] bg-white pr-10"
                  >
                    <option value="" disabled>Pilih Kelas</option>
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name} - {c.program_name}</option>
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
                  disabled={isSubmitting || !assignClassId}
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
      {historyModalStudent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Histori Penempatan</h3>
                <p className="text-xs text-gray-500">{historyModalStudent.full_name}</p>
              </div>
              <button 
                onClick={() => setHistoryModalStudent(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {studentHistory.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">Belum ada histori penempatan.</p>
              ) : (
                studentHistory.map(h => (
                  <div key={h.id} className="p-3 border border-gray-100 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-gray-900">{h.academic_year_name}</div>
                      <div className="text-xs text-gray-500">{h.program_name}</div>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#F0EDF9] text-[#4B21A2] rounded-lg text-xs font-bold">
                      <Layers className="w-3.5 h-3.5" />
                      {h.class_name}
                    </div>
                  </div>
                ))
              )}
            </div>
            <button
              onClick={() => setHistoryModalStudent(null)}
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
