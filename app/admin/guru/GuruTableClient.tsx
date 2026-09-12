'use client'

import { useState, useCallback, useTransition, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, UserPlus, Mail, Phone, BookOpen, Users as UsersIcon, Edit2, Trash2, Eye } from 'lucide-react'
import { SafeGuruRow } from '@/lib/db/queries/users'
import Pagination from '@/components/ui/Pagination'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'

type Props = {
  data: SafeGuruRow[]
  total: number
  page: number
  limit: number
}

export default function GuruTableClient({ data, total, page, limit }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const { showToast } = useToast()
  
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [editingGuru, setEditingGuru] = useState<SafeGuruRow | null>(null)
  const [archivingGuru, setArchivingGuru] = useState<SafeGuruRow | null>(null)
  const [viewingGuru, setViewingGuru] = useState<SafeGuruRow | null>(null)

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
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

  const openModal = (guru?: SafeGuruRow) => {
    if (guru) {
      setEditingGuru(guru)
      setFormData({
        full_name: guru.full_name,
        email: guru.email || '',
        phone: guru.phone || '',
        password: '',
        is_active: guru.is_active
      })
    } else {
      setEditingGuru(null)
      setFormData({ full_name: '', email: '', phone: '', password: '', is_active: true })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingGuru(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const url = editingGuru ? `/api/guru/${editingGuru.id}` : '/api/guru'
      const method = editingGuru ? 'PATCH' : 'POST'
      
      const payload: any = { ...formData }
      if (editingGuru && !payload.password) {
        delete payload.password // Only send password if editing and entered
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Terjadi kesalahan')
      }

      showToast(editingGuru ? 'Guru berhasil diperbarui' : 'Guru berhasil ditambahkan', 'success')
      closeModal()
      router.refresh()
    } catch (err: any) {
      showToast(err.message, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleArchive = async () => {
    if (!archivingGuru) return
    setIsSubmitting(true)

    try {
      const res = await fetch(`/api/guru/${archivingGuru.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Terjadi kesalahan')
      }

      showToast('Guru berhasil diarsipkan', 'success')
      setArchivingGuru(null)
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
              placeholder="Cari guru..."
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
          <UserPlus className="w-4 h-4" /> Tambah Guru
        </button>
      </div>

      {/* Grid */}
      {data.length === 0 ? (
        <EmptyState
          title="Tidak ada data"
          description="Belum ada data guru yang sesuai dengan pencarian Anda."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" style={{ opacity: isPending ? 0.6 : 1 }}>
          {data.map((guru) => (
            <div key={guru.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3 relative group">
              {!guru.is_active && (
                <div className="absolute top-4 right-4 bg-gray-100 text-gray-500 px-2 py-1 rounded text-[10px] font-bold">
                  Arsip
                </div>
              )}
              
              <div className="flex items-center gap-3 pr-10">
                <div className="w-10 h-10 rounded-full bg-[#7B4BD6] text-white font-bold text-sm flex items-center justify-center flex-shrink-0">
                  {guru.full_name.split(' ').slice(-1)[0]?.[0]?.toUpperCase()}
                </div>
                <div className="truncate">
                  <h4 className="font-bold text-gray-900 text-sm truncate">{guru.full_name}</h4>
                  <p className="text-[10px] text-gray-400">Guru Tahfizh</p>
                </div>
              </div>

              <div className="space-y-1 text-xs text-gray-600">
                {guru.email && (
                  <div className="flex items-center gap-2 truncate">
                    <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" /> <span className="truncate">{guru.email}</span>
                  </div>
                )}
                {guru.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" /> {guru.phone}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-gray-100 grid grid-cols-2 gap-2 text-center">
                <div className="bg-[#F0EDF9] p-2 rounded-xl">
                  <div className="flex items-center justify-center gap-1 text-[#4B21A2] font-bold text-sm">
                    <BookOpen className="w-3.5 h-3.5" /> {guru.class_count || 0}
                  </div>
                  <div className="text-[10px] text-gray-500">Kelas</div>
                </div>
                <div className="bg-[#F0EDF9] p-2 rounded-xl">
                  <div className="flex items-center justify-center gap-1 text-[#16A34A] font-bold text-sm">
                    <UsersIcon className="w-3.5 h-3.5" /> {guru.student_count || 0}
                  </div>
                  <div className="text-[10px] text-gray-500">Santri</div>
                </div>
              </div>

              {/* Hover Actions */}
              <div className="absolute inset-0 bg-white/90 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center gap-2 pointer-events-none group-hover:pointer-events-auto">
                <button
                  onClick={() => setViewingGuru(guru)}
                  className="bg-[#F0EDF9] text-[#4B21A2] p-2.5 rounded-xl hover:bg-[#4B21A2] hover:text-white transition-colors"
                  aria-label="Detail"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => openModal(guru)}
                  className="bg-[#F0EDF9] text-[#4B21A2] p-2.5 rounded-xl hover:bg-[#4B21A2] hover:text-white transition-colors"
                  aria-label="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                {guru.is_active && (
                  <button
                    onClick={() => setArchivingGuru(guru)}
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
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">{editingGuru ? 'Edit Guru' : 'Tambah Guru Baru'}</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nama Lengkap</label>
                <input
                  required
                  type="text"
                  value={formData.full_name}
                  onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#4B21A2]"
                  placeholder="Misal: Ustadz Ahmad"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#4B21A2]"
                  placeholder="Opsional"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nomor HP</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#4B21A2]"
                  placeholder="Opsional (Misal: 0812...)"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Password {editingGuru && <span className="text-gray-400 font-normal">(Kosongkan jika tidak ingin mengubah)</span>}
                </label>
                <input
                  type="password"
                  required={!editingGuru}
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#4B21A2]"
                  placeholder="Password untuk login"
                />
              </div>

              {editingGuru && (
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

              <div className="flex justify-end gap-2 pt-4">
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

      {/* View Modal */}
      {viewingGuru && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-900">Detail Guru</h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Nama Lengkap</label>
                <div className="text-sm text-gray-900 font-medium">{viewingGuru.full_name}</div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Email</label>
                <div className="text-sm text-gray-900">{viewingGuru.email || '-'}</div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Nomor HP</label>
                <div className="text-sm text-gray-900">{viewingGuru.phone || '-'}</div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Status</label>
                <div className="text-sm text-gray-900">
                  {viewingGuru.is_active ? (
                    <span className="text-green-600 font-bold bg-green-50 px-2 py-1 rounded">Aktif</span>
                  ) : (
                    <span className="text-gray-500 font-bold bg-gray-100 px-2 py-1 rounded">Arsip</span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Jumlah Kelas</label>
                  <div className="text-sm text-gray-900 font-bold">{viewingGuru.class_count || 0}</div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Jumlah Santri</label>
                  <div className="text-sm text-gray-900 font-bold">{viewingGuru.student_count || 0}</div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Terakhir Login</label>
                <div className="text-sm text-gray-900">
                  {viewingGuru.last_login_at ? new Date(viewingGuru.last_login_at).toLocaleString('id-ID') : '-'}
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setViewingGuru(null)}
                  className="px-4 py-2 text-sm font-bold text-white bg-[#4B21A2] rounded-xl hover:bg-[#3d1b84]"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Archive Confirmation */}
      <ConfirmDialog
        isOpen={!!archivingGuru}
        title="Arsipkan Guru"
        message={`Apakah Anda yakin ingin mengarsipkan ${archivingGuru?.full_name}? Guru ini tidak akan dapat login lagi namun datanya pada kelas sebelumnya akan tetap aman.`}
        onConfirm={handleArchive}
        onCancel={() => setArchivingGuru(null)}
      />
    </div>
  )
}
