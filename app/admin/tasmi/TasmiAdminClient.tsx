'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useState, useCallback, useTransition, useEffect } from 'react'
import { Search, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { TasmiHistoryTable } from '@/components/tasmi/TasmiHistoryTable'
import type { TasmiHistoryRow } from '@/lib/tasmi/list'
import { TasmiForm, type TasmiFormData } from '@/components/tasmi/TasmiForm'
import type { SurahRow } from '@/lib/db/queries/surahs'
import { createTasmiAction, updateTasmiAction, deleteTasmiAction } from './actions'

interface TasmiAdminClientProps {
  data: TasmiHistoryRow[]
  total: number
  page: number
  pageSize: number
  search: string
  mode: string
  status: string
  surahs: SurahRow[]
  canManage: boolean
}

export function TasmiAdminClient({
  data,
  total,
  page,
  pageSize,
  search: initialSearch,
  mode: initialMode,
  status: initialStatus,
  surahs,
  canManage
}: TasmiAdminClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  
  const [searchTerm, setSearchTerm] = useState(initialSearch)
  const [modeFilter, setModeFilter] = useState(initialMode)
  const [statusFilter, setStatusFilter] = useState(initialStatus)

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formSaving, setFormSaving] = useState(false)
  const [editingRow, setEditingRow] = useState<TasmiHistoryRow | null>(null)
  
  // Student selection for Admin Create Modal
  const [studentSearchTerm, setStudentSearchTerm] = useState('')
  const [studentSearchResults, setStudentSearchResults] = useState<{id: number, name: string}[]>([])
  const [selectedStudent, setSelectedStudent] = useState<{id: number, name: string} | null>(null)
  const [isSearchingStudent, setIsSearchingStudent] = useState(false)

  // Redirect if out of bounds
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      const params = new URLSearchParams(searchParams.toString())
      params.set('page', totalPages.toString())
      router.replace(`${pathname}?${params.toString()}`)
    }
  }, [page, totalPages, pathname, router, searchParams])

  const createQueryString = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value === null) {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      }
      return params.toString()
    },
    [searchParams]
  )

  const handleFilterSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    startTransition(() => {
      router.push(pathname + '?' + createQueryString({
        search: searchTerm || null,
        mode: modeFilter !== 'all' ? modeFilter : null,
        status: statusFilter !== 'all' ? statusFilter : null,
        page: '1'
      }))
    })
  }

  const handlePageChange = (newPage: number) => {
    startTransition(() => {
      router.push(pathname + '?' + createQueryString({ page: String(newPage) }))
    })
  }

  // Admin student search
  useEffect(() => {
    if (studentSearchTerm.length < 2) {
      setStudentSearchResults([])
      return
    }
    const timer = setTimeout(async () => {
      setIsSearchingStudent(true)
      try {
        const res = await fetch(`/api/students?search=${encodeURIComponent(studentSearchTerm)}&limit=10`)
        if (res.ok) {
          const { data } = await res.json()
          setStudentSearchResults(data.map((s: any) => ({ id: s.id, name: s.full_name })))
        }
      } catch (err) {
        console.error(err)
      } finally {
        setIsSearchingStudent(false)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [studentSearchTerm])

  const handleSaveTasmi = async (formData: TasmiFormData) => {
    if (!canManage) return
    setFormSaving(true)
    try {
      if (editingRow) {
        const res = await updateTasmiAction(editingRow.id, {
          sessionDate: formData.session_date,
          score: formData.score,
          status: formData.status,
          notes: formData.notes,
          surahId: formData.mode === 'SURAH' ? formData.surah_id : undefined,
          startJuz: formData.mode === 'JUZ_RANGE' ? formData.start_juz : undefined,
          endJuz: formData.mode === 'JUZ_RANGE' ? formData.end_juz : undefined
        })
        if (!res.success) throw new Error(res.error)
      } else {
        if (!selectedStudent) throw new Error('Pilih santri terlebih dahulu')
        const res = await createTasmiAction({
          studentId: selectedStudent.id,
          mode: formData.mode,
          sessionDate: formData.session_date,
          score: formData.score,
          status: formData.status,
          notes: formData.notes,
          surahId: formData.mode === 'SURAH' ? formData.surah_id : undefined,
          startJuz: formData.mode === 'JUZ_RANGE' ? formData.start_juz : undefined,
          endJuz: formData.mode === 'JUZ_RANGE' ? formData.end_juz : undefined
        })
        if (!res.success) throw new Error(res.error)
      }
      setIsFormOpen(false)
      setEditingRow(null)
      startTransition(() => {
        router.refresh()
      })
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan')
    } finally {
      setFormSaving(false)
    }
  }

  const handleDelete = async (row: TasmiHistoryRow) => {
    if (!canManage) return
    // Target formatting manually for alert since we can't easily run the react component
    const targetTxt = row.mode === 'SURAH' ? row.surah_name_latin : `${row.end_juz! - row.start_juz! + 1} Juz • Juz ${row.start_juz === row.end_juz ? row.start_juz : `${row.start_juz}-${row.end_juz}`}`
    
    if (confirm(`Hapus data Tasmi ini?\n\nSantri: ${row.student_name}\nTanggal: ${new Date(row.session_date).toLocaleDateString('id-ID')}\nTarget: ${targetTxt}`)) {
      startTransition(async () => {
        try {
          const res = await deleteTasmiAction(row.id)
          if (!res.success) throw new Error(res.error)
          router.refresh()
        } catch (err: any) {
          alert(err.message || 'Gagal menghapus')
        }
      })
    }
  }

  const openCreateModal = () => {
    setEditingRow(null)
    setSelectedStudent(null)
    setStudentSearchTerm('')
    setIsFormOpen(true)
  }

  const openEditModal = (row: TasmiHistoryRow) => {
    setEditingRow(row)
    setSelectedStudent({ id: row.student_id, name: row.student_name })
    setIsFormOpen(true)
  }

  const initialFormData = editingRow ? {
    mode: editingRow.mode,
    surah_id: editingRow.surah_id,
    start_juz: editingRow.start_juz,
    end_juz: editingRow.end_juz,
    session_date: typeof editingRow.session_date === 'string' ? editingRow.session_date : editingRow.session_date.toISOString().split('T')[0],
    score: editingRow.score,
    status: editingRow.status,
    notes: editingRow.notes
  } : undefined

  return (
    <div className="space-y-4 pb-10">
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h3 className="font-bold text-gray-900 text-sm">Data Tasmi</h3>
          <p className="text-xs text-gray-500">Rekapitulasi dan manajemen ujian Tasmi</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          {canManage && (
            <button
              onClick={openCreateModal}
              className="flex items-center justify-center gap-2 bg-[#4B21A2] text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#3a1880] transition-colors"
            >
              <Plus className="w-4 h-4" /> Catat Tasmi
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
        <form onSubmit={handleFilterSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Cari santri..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4B21A2]/20 focus:border-[#4B21A2] transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
          <select 
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none"
            value={modeFilter}
            onChange={(e) => {
              setModeFilter(e.target.value)
              // Auto submit on change
              startTransition(() => {
                router.push(pathname + '?' + createQueryString({
                  mode: e.target.value !== 'all' ? e.target.value : null,
                  page: '1'
                }))
              })
            }}
          >
            <option value="all">Semua Jenis</option>
            <option value="SURAH">Tasmi Surat</option>
            <option value="JUZ_RANGE">Tasmi Sekali Duduk</option>
          </select>
          <select 
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              startTransition(() => {
                router.push(pathname + '?' + createQueryString({
                  status: e.target.value !== 'all' ? e.target.value : null,
                  page: '1'
                }))
              })
            }}
          >
            <option value="all">Semua Status</option>
            <option value="PASSED">Lulus</option>
            <option value="NEEDS_REVIEW">Perlu Pengulangan</option>
          </select>
          <button type="submit" className="hidden">Cari</button>
        </form>
      </div>

      <div className="relative">
        {isPending && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-2xl">
            <div className="w-6 h-6 border-2 border-[#4B21A2] border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        <TasmiHistoryTable 
          data={data} 
          canManage={canManage} 
          onEdit={openEditModal} 
          onDelete={handleDelete} 
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 p-3 border border-gray-100 rounded-2xl flex items-center justify-between text-xs text-gray-500 bg-white shadow-sm">
            <span>Menampilkan {data.length} dari {total} data</span>
            <div className="flex gap-1">
              <button
                disabled={page <= 1 || isPending}
                onClick={() => handlePageChange(page - 1)}
                className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages || isPending}
                onClick={() => handlePageChange(page + 1)}
                className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {isFormOpen && (
        <TasmiForm
          initialData={initialFormData}
          surahs={surahs}
          isEdit={!!editingRow}
          saving={formSaving}
          onSave={handleSaveTasmi}
          onCancel={() => setIsFormOpen(false)}
        />
      )}
      
      {/* Student selection overlay for Create in Admin */}
      {isFormOpen && !editingRow && (
        <div className="fixed inset-0 z-[60] pointer-events-none flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-transparent h-full flex flex-col pt-[80px] pointer-events-none">
            <div className="pointer-events-auto bg-white p-4 rounded-xl border border-gray-200 shadow-sm mx-4 mb-2">
              <label className="block text-xs font-bold text-gray-700 mb-1">Pilih Santri</label>
              {selectedStudent ? (
                <div className="flex items-center justify-between bg-purple-50 px-3 py-2 rounded-xl text-sm font-medium text-[#4B21A2] border border-purple-100">
                  {selectedStudent.name}
                  <button onClick={() => setSelectedStudent(null)} className="text-purple-400 hover:text-purple-700">Ganti</button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Ketik nama santri..."
                    value={studentSearchTerm}
                    onChange={(e) => setStudentSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#FBBF24] focus:ring-1 focus:ring-[#FBBF24]"
                  />
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  
                  {studentSearchTerm.length >= 2 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                      {isSearchingStudent ? (
                        <div className="p-2 text-xs text-center text-gray-500">Mencari...</div>
                      ) : studentSearchResults.length === 0 ? (
                        <div className="p-2 text-xs text-center text-gray-500">Santri tidak ditemukan</div>
                      ) : (
                        studentSearchResults.map(s => (
                          <button
                            key={s.id}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                            onClick={() => setSelectedStudent(s)}
                          >
                            {s.name}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
