'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Plus, Edit, CheckCircle, X, AlertTriangle } from 'lucide-react'
import EmptyState from '@/components/ui/EmptyState'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import type { AcademicYear } from '@/lib/db/queries/academic-years'

type Props = {
  data: AcademicYear[]
}

export default function AcademicYearClient({ data }: Props) {
  const router = useRouter()
  const { showToast } = useToast()

  // UI State
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showActivateConfirm, setShowActivateConfirm] = useState(false)
  
  const [selectedYear, setSelectedYear] = useState<AcademicYear | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form State
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const resetForm = () => {
    setName('')
    setStartDate('')
    setEndDate('')
    setIsSubmitting(false)
  }

  const openEdit = (y: AcademicYear) => {
    setSelectedYear(y)
    setName(y.name)
    setStartDate(y.startDate)
    setEndDate(y.endDate)
    setShowEditModal(true)
  }

  const openActivate = (y: AcademicYear) => {
    setSelectedYear(y)
    setShowActivateConfirm(true)
  }

  const handleSave = async (e: React.FormEvent, isEdit = false) => {
    e.preventDefault()
    
    // Client side validation
    if (new Date(startDate) >= new Date(endDate)) {
      showToast('Tanggal selesai harus setelah tanggal mulai', 'error')
      return
    }

    setIsSubmitting(true)
    try {
      const url = isEdit && selectedYear ? `/api/academic-years/${selectedYear.id}` : '/api/academic-years'
      const method = isEdit ? 'PATCH' : 'POST'
      
      const payload = { name, startDate, endDate }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        showToast(`Tahun ajaran berhasil ${isEdit ? 'diperbarui' : 'ditambahkan'}`, 'success')
        setShowAddModal(false)
        setShowEditModal(false)
        resetForm()
        router.refresh()
      } else {
        const errorData = await res.json()
        showToast(errorData.error || 'Gagal menyimpan tahun ajaran', 'error')
      }
    } catch (err) {
      showToast('Terjadi kesalahan jaringan', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleActivate = async () => {
    if (!selectedYear) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/academic-years/${selectedYear.id}/activate`, {
        method: 'PATCH',
      })
      if (res.ok) {
        showToast('Tahun ajaran berhasil diaktifkan', 'success')
        setShowActivateConfirm(false)
        router.refresh()
      } else {
        showToast('Gagal mengaktifkan tahun ajaran', 'error')
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
        {isActive ? 'Aktif' : 'Non-aktif'}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap gap-3 items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Manajemen Tahun Ajaran</h2>
        <button
          onClick={() => { resetForm(); setShowAddModal(true); }}
          className="flex items-center justify-center gap-2 bg-[#4B21A2] hover:bg-[#3a1880] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm whitespace-nowrap"
        >
          <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Tambah Tahun Ajaran</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden min-h-[300px] flex flex-col">
        {data.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState title="Tahun Ajaran Kosong" description="Belum ada tahun ajaran yang ditambahkan." />
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
            {data.map((y) => (
              <div key={y.id} className={`p-4 rounded-2xl border border-gray-100 flex flex-col gap-3 transition-colors hover:border-[#4B21A2]/30 ${y.isActive ? 'bg-emerald-50/50 shadow-sm border-emerald-200' : 'bg-gray-50/50'}`}>
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${y.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-[#EDE9FE] text-[#4B21A2]'}`}>
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="font-bold text-gray-900 text-sm break-words line-clamp-2">{y.name}</h4>
                      {renderStatus(y.isActive)}
                    </div>
                    <div className="mt-2 text-xs text-gray-600 space-y-1">
                      <p><span className="text-gray-400">Mulai:</span> {formatDate(y.startDate)}</p>
                      <p><span className="text-gray-400">Selesai:</span> {formatDate(y.endDate)}</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-auto pt-3 flex justify-end gap-2 border-t border-gray-100">
                  <button onClick={() => openEdit(y)} className="px-3 py-1.5 rounded-lg bg-[#EDE9FE] text-[#4B21A2] flex items-center gap-1.5 text-xs font-semibold hover:bg-[#7B4BD6]/20 transition-colors">
                    <Edit className="w-3.5 h-3.5" /> Edit
                  </button>
                  {!y.isActive && (
                    <button onClick={() => openActivate(y)} className="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 flex items-center gap-1.5 text-xs font-semibold hover:bg-emerald-200 transition-colors">
                      <CheckCircle className="w-3.5 h-3.5" /> Aktifkan
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit / Add Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-gray-900 text-base">
                {showEditModal ? 'Edit Tahun Ajaran' : 'Tambah Tahun Ajaran Baru'}
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
                <label htmlFor="name" className="block text-xs font-semibold text-gray-700 mb-1">Nama Tahun Ajaran</label>
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Mis. 2026/2027"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#4B21A2]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="startDate" className="block text-xs font-semibold text-gray-700 mb-1">Tanggal Mulai</label>
                  <input
                    id="startDate"
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#4B21A2]"
                  />
                </div>
                <div>
                  <label htmlFor="endDate" className="block text-xs font-semibold text-gray-700 mb-1">Tanggal Selesai</label>
                  <input
                    id="endDate"
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#4B21A2]"
                  />
                </div>
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
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Tahun Ajaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Activate Confirm */}
      <ConfirmDialog
        isOpen={showActivateConfirm}
        title="Aktifkan Tahun Ajaran"
        message={`Apakah Anda yakin ingin mengaktifkan tahun ajaran "${selectedYear?.name}"? Tahun ajaran yang aktif saat ini akan dinonaktifkan secara otomatis.`}
        confirmText={isSubmitting ? 'Mengaktifkan...' : 'Ya, Aktifkan'}
        onConfirm={handleActivate}
        onCancel={() => setShowActivateConfirm(false)}
        isDanger={false}
      />
    </div>
  )
}
