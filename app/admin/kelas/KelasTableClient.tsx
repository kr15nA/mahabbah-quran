'use client'

import { useState, useCallback, useTransition, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, Plus, Edit2, Trash2, User, Users, CheckCircle2, XCircle } from 'lucide-react'
import Pagination from '@/components/ui/Pagination'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { ClassRow } from '@/lib/db/queries/classes'
import { SafeGuruRow } from '@/lib/db/queries/users'
import { ProgramRow } from '@/lib/db/queries/programs'

type Props = {
  data: ClassRow[]
  total: number
  page: number
  limit: number
  teachers: SafeGuruRow[]
  programs: ProgramRow[]
}

export default function KelasTableClient({ data, total, page, limit, teachers, programs }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const { showToast } = useToast()
  
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [editingClass, setEditingClass] = useState<ClassRow | null>(null)
  const [archivingClass, setArchivingClass] = useState<ClassRow | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    program_id: '',
    teacher_id: '',
    level: '',
    is_active: true
  })

  // URL Updates
  const handleFilter = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    
    if (key !== 'page') params.set('page', '1')

    startTransition(() => {
      router.push(`?${params.toString()}`)
      router.refresh()
    })
  }, [searchParams, router])

  // Search Debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== (searchParams.get('search') || '')) {
        handleFilter('search', searchTerm)
      }
    }, 500)
    return () => clearTimeout(timeoutId)
  }, [searchTerm, handleFilter, searchParams])

  const openModal = (cls?: ClassRow) => {
    if (cls) {
      setEditingClass(cls)
      setFormData({
        name: cls.name,
        program_id: String(cls.program_id),
        teacher_id: String(cls.current_teacher_id),
        level: cls.level || '',
        is_active: cls.is_active
      })
    } else {
      setEditingClass(null)
      setFormData({ 
        name: '', 
        program_id: programs.length > 0 ? String(programs[0].id) : '', 
        teacher_id: '', 
        level: '', 
        is_active: true 
      })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingClass(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const url = editingClass ? `/api/classes/${editingClass.id}` : '/api/classes'
      const method = editingClass ? 'PATCH' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Terjadi kesalahan')
      }

      showToast(editingClass ? 'Kelas berhasil diperbarui' : 'Kelas berhasil ditambahkan', 'success')
      closeModal()
      router.refresh()
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleArchive = async () => {
    if (!archivingClass) return
    setIsSubmitting(true)

    try {
      const res = await fetch(`/api/classes/${archivingClass.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Terjadi kesalahan')
      }

      showToast('Kelas berhasil diarsipkan', 'success')
      setArchivingClass(null)
      router.refresh()
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 flex gap-3">
          <div className="flex-1 max-w-xs flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-gray-200">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari kelas..."
              className="bg-transparent text-xs outline-none text-gray-900 w-full"
            />
          </div>

          <select
            value={searchParams.get('status') || 'active'}
            onChange={(e) => handleFilter('status', e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white text-gray-700 outline-none"
          >
            <option value="active">Aktif</option>
            <option value="archived">Arsip</option>
            <option value="all">Semua Status</option>
          </select>
        </div>

        <button 
          onClick={() => openModal()}
          className="flex items-center justify-center gap-2 bg-[#4B21A2] text-white px-4 py-2 rounded-xl text-xs font-bold"
        >
          <Plus className="w-4 h-4" /> Tambah Kelas
        </button>
      </div>

      {/* Grid */}
      {data.length === 0 ? (
        <EmptyState
          title="Tidak ada data"
          description="Belum ada data kelas yang sesuai dengan pencarian Anda."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" style={{ opacity: isPending ? 0.6 : 1 }}>
          {data.map((cls) => (
            <div key={cls.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3 relative group">
              {!cls.is_active && (
                <div className="absolute top-4 right-4 bg-gray-100 text-gray-500 px-2 py-1 rounded text-[10px] font-bold">
                  Arsip
                </div>
              )}
              
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0 flex-1">
                  <h4 className="font-extrabold text-[#4B21A2] text-base min-w-0 whitespace-normal break-words">{cls.name}</h4>
                  {cls.level && (
                    <p className="text-xs text-amber-600 font-semibold min-w-0 whitespace-normal break-words">{cls.level}</p>
                  )}
                </div>
                <span className="px-2.5 py-1 bg-[#F0EDF9] text-[#4B21A2] font-bold text-[10px] rounded-lg flex-shrink-0 text-center">
                  {cls.program_name}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-gray-600 pt-2 border-t border-gray-100">
                <div className="flex items-start gap-2">
                  <User className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" /> 
                  <span className="min-w-0 flex-1 whitespace-normal break-words">Guru: <span className="font-medium text-gray-900">{cls.teacher_name}</span></span>
                </div>
                <div className="flex items-start gap-2">
                  <Users className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" /> 
                  <span className="min-w-0 flex-1 whitespace-normal break-words">Jumlah Santri: <span className="font-bold text-[#16A34A]">{cls.student_count || 0} santri</span></span>
                </div>
              </div>

              {/* Hover Actions */}
              <div className="absolute inset-0 bg-white/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center gap-2 pointer-events-none group-hover:pointer-events-auto">
                <button
                  onClick={() => openModal(cls)}
                  className="bg-[#F0EDF9] text-[#4B21A2] p-2.5 rounded-xl hover:bg-[#4B21A2] hover:text-white transition-colors"
                  aria-label="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                {cls.is_active && (
                  <button
                    onClick={() => setArchivingClass(cls)}
                    className="bg-red-50 text-red-600 p-2.5 rounded-xl hover:bg-red-600 hover:text-white transition-colors"
                    aria-label="Arsip"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {total > limit && (
        <Pagination totalItems={total} currentPage={page} limit={limit} totalPages={Math.ceil(total / limit)} />
      )}

      {/* Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="p-5 border-b border-gray-100 flex-shrink-0">
              <h3 className="font-bold text-gray-900">{editingClass ? 'Edit Kelas' : 'Tambah Kelas Baru'}</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nama Kelas <span className="text-red-500">*</span></label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#4B21A2]"
                  placeholder="Misal: Kelompok A"
                />
              </div>

              {!editingClass && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Program <span className="text-red-500">*</span></label>
                  <select
                    required
                    value={formData.program_id}
                    onChange={e => setFormData({ ...formData, program_id: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#4B21A2] bg-white"
                  >
                    <option value="" disabled>Pilih Program</option>
                    {programs.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Guru Pengampu <span className="text-red-500">*</span></label>
                <select
                  required
                  value={formData.teacher_id}
                  onChange={e => setFormData({ ...formData, teacher_id: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#4B21A2] bg-white"
                >
                  <option value="" disabled>Pilih Guru</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.full_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Level / Target <span className="text-gray-400 font-normal">(Opsional)</span></label>
                <input
                  type="text"
                  value={formData.level}
                  onChange={e => setFormData({ ...formData, level: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#4B21A2]"
                  placeholder="Misal: Juz 30"
                />
              </div>

              {editingClass && (
                <label className="flex items-center gap-2 cursor-pointer mt-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded text-[#4B21A2] focus:ring-[#4B21A2]"
                  />
                  <span className="text-sm font-medium text-gray-700">Status Aktif</span>
                </label>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-bold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200"
                  disabled={isSubmitting}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-bold text-white bg-[#4B21A2] rounded-xl hover:bg-[#3d1b84] disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Archive Confirmation */}
      <ConfirmDialog
        isOpen={!!archivingClass}
        title="Arsipkan Kelas"
        message={`Apakah Anda yakin ingin mengarsipkan ${archivingClass?.name}? Kelas tidak akan dihapus untuk menjaga history santri, namun statusnya menjadi tidak aktif.`}
        onConfirm={handleArchive}
        onCancel={() => setArchivingClass(null)}
      />
    </div>
  )
}
