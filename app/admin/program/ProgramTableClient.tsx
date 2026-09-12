'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { BookOpen, Search, Plus, Eye, Edit, Trash2, X } from 'lucide-react'
import Pagination from '@/components/ui/Pagination'
import EmptyState from '@/components/ui/EmptyState'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import type { ProgramRow } from '@/lib/db/queries/programs'

type Props = {
  data: ProgramRow[]
  total: number
  page: number
  limit: number
}

export default function ProgramTableClient({ data, total, page, limit }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { showToast } = useToast()

  const [search, setSearch] = useState(searchParams.get('search') || '')
  
  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (search) {
        params.set('search', search)
      } else {
        params.delete('search')
      }
      params.set('page', '1') // reset page on search
      router.push(`${pathname}?${params.toString()}`)
    }, 500)
    return () => clearTimeout(handler)
  }, [search, router, pathname, searchParams])

  const handleFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'all') {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.set('page', '1')
    router.push(`${pathname}?${params.toString()}`)
  }

  // UI State
  const [showAddModal, setShowAddModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
  const [selectedProgram, setSelectedProgram] = useState<ProgramRow | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form State
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const resetForm = () => {
    setName('')
    setDescription('')
    setIsSubmitting(false)
  }

  const openView = (p: ProgramRow) => {
    setSelectedProgram(p)
    setShowViewModal(true)
  }

  const openEdit = (p: ProgramRow) => {
    setSelectedProgram(p)
    setName(p.name)
    setDescription(p.description || '')
    setShowEditModal(true)
  }

  const openDelete = (p: ProgramRow) => {
    setSelectedProgram(p)
    setShowDeleteConfirm(true)
  }

  const handleSave = async (e: React.FormEvent, isEdit = false) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const url = isEdit && selectedProgram ? `/api/programs/${selectedProgram.id}` : '/api/programs'
      const method = isEdit ? 'PATCH' : 'POST'
      
      const payload = {
        name,
        description: description || undefined
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        showToast(`Program berhasil ${isEdit ? 'diperbarui' : 'ditambahkan'}`, 'success')
        setShowAddModal(false)
        setShowEditModal(false)
        resetForm()
        router.refresh()
      } else {
        const errorData = await res.json()
        showToast(errorData.error || 'Gagal menyimpan program', 'error')
      }
    } catch (err) {
      showToast('Terjadi kesalahan jaringan', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedProgram) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/programs/${selectedProgram.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        showToast('Program berhasil diarsipkan', 'success')
        setShowDeleteConfirm(false)
        router.refresh()
      } else {
        showToast('Gagal mengarsipkan program', 'error')
      }
    } catch (err) {
      showToast('Terjadi kesalahan jaringan', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStatus = (isActive: boolean) => {
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>
        {isActive ? 'Aktif' : 'Non-aktif (Diarsipkan)'}
      </span>
    )
  }

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2.5 flex-1 min-w-[280px]">
          <div className="flex items-center gap-2 bg-[#F0EDF9] px-3 py-2 rounded-xl flex-1 max-w-xs">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari program..."
              className="bg-transparent text-xs outline-none text-gray-900 w-full placeholder-gray-400"
            />
          </div>

          <select
            value={searchParams.get('status') || 'all'}
            onChange={(e) => handleFilter('status', e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white text-gray-700 outline-none"
            aria-label="Filter Status"
          >
            <option value="all">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="archived">Diarsipkan</option>
          </select>
        </div>

        <button
          onClick={() => { resetForm(); setShowAddModal(true); }}
          className="flex items-center justify-center gap-2 bg-[#4B21A2] hover:bg-[#3a1880] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm whitespace-nowrap"
        >
          <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Tambah Program</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden min-h-[300px] flex flex-col">
        {data.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState title="Program Tidak Ditemukan" description="Ubah filter atau kata kunci pencarian Anda." />
          </div>
        ) : (
          <>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
              {data.map((p) => (
                <div key={p.id} className={`p-4 rounded-2xl border border-gray-100 flex flex-col gap-3 transition-colors hover:border-[#4B21A2]/30 ${p.is_active ? 'bg-white shadow-sm' : 'bg-gray-50/50'}`}>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#EDE9FE] text-[#4B21A2] flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-bold text-gray-900 text-sm break-words line-clamp-2">{p.name}</h4>
                        {renderStatus(p.is_active)}
                      </div>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2 min-h-[2.5rem]">
                        {p.description || '-'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-auto pt-3 flex justify-end gap-2 border-t border-gray-100">
                    <button onClick={() => openView(p)} className="px-3 py-1.5 rounded-lg bg-[#EDE9FE] text-[#4B21A2] flex items-center gap-1.5 text-xs font-semibold hover:bg-[#7B4BD6]/20 transition-colors">
                      <Eye className="w-3.5 h-3.5" /> Lihat
                    </button>
                    {p.is_active && (
                      <button onClick={() => openEdit(p)} className="px-3 py-1.5 rounded-lg bg-[#EDE9FE] text-[#4B21A2] flex items-center gap-1.5 text-xs font-semibold hover:bg-[#7B4BD6]/20 transition-colors">
                        <Edit className="w-3.5 h-3.5" /> Edit
                      </button>
                    )}
                    {p.is_active && (
                      <button onClick={() => openDelete(p)} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 flex items-center gap-1.5 text-xs font-semibold hover:bg-red-100 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" /> Arsip
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <Pagination
              currentPage={page}
              limit={limit}
              totalItems={total}
              totalPages={Math.ceil(total / limit)}
            />
          </>
        )}
      </div>

      {/* View Modal */}
      {showViewModal && selectedProgram && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-gray-900 text-base">Detail Program</h3>
              <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-[#EDE9FE] text-[#4B21A2] flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-lg leading-tight">{selectedProgram.name}</h4>
                <div className="mt-1">{renderStatus(selectedProgram.is_active)}</div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-gray-400 text-[10px] uppercase font-semibold">Deskripsi</p>
                <p className="text-xs text-gray-700 leading-relaxed mt-1">
                  {selectedProgram.description || 'Tidak ada deskripsi'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-[10px] uppercase font-semibold">Dibuat Pada</p>
                  <p className="font-medium text-gray-900 text-xs mt-0.5">
                    {new Date(selectedProgram.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-[10px] uppercase font-semibold">Terakhir Diperbarui</p>
                  <p className="font-medium text-gray-900 text-xs mt-0.5">
                    {new Date(selectedProgram.updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setShowViewModal(false)}
              className="w-full mt-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200 transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Edit / Add Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-gray-900 text-base">
                {showEditModal ? 'Edit Program' : 'Tambah Program Baru'}
              </h3>
              <button 
                onClick={() => { setShowAddModal(false); setShowEditModal(false); }} 
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => handleSave(e, showEditModal)} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-xs font-semibold text-gray-700 mb-1">Nama Program</label>
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Mis. Tahfizh Juz 30"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#4B21A2]"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-xs font-semibold text-gray-700 mb-1">Deskripsi</label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Deskripsi singkat tentang program ini..."
                  rows={4}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#4B21A2] resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => { setShowAddModal(false); setShowEditModal(false); }}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold disabled:opacity-50 hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-[#4B21A2] text-white rounded-xl text-xs font-bold disabled:opacity-50 hover:bg-[#3a1880] transition-colors"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Program'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete / Archive Confirm */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Arsip Program"
        message={`Apakah Anda yakin ingin mengarsipkan program "${selectedProgram?.name}"? Program tidak akan dihapus permanen dan kelas yang terkait akan tetap ada, tetapi program ini tidak akan aktif untuk kelas baru.`}
        confirmText={isSubmitting ? 'Mengarsipkan...' : 'Ya, Arsipkan'}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        isDanger={true}
      />
    </div>
  )
}
