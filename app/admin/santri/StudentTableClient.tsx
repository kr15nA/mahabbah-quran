'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Search, Plus, Eye, Edit, Trash2, X } from 'lucide-react'
import ProgressRing from '@/components/ui/ProgressRing'
import Pagination from '@/components/ui/Pagination'
import EmptyState from '@/components/ui/EmptyState'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import type { StudentRow } from '@/lib/db/queries/students'

type Props = {
  data: StudentRow[]
  total: number
  page: number
  limit: number
}

export default function StudentTableClient({ data, total, page, limit }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { showToast } = useToast()

  const [search, setSearch] = useState(searchParams.get('search') || searchParams.get('q') || '')
  
  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (search) {
        params.set('search', search)
      } else {
        params.delete('search')
        params.delete('q') // remove legacy q
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
  
  const [selectedStudent, setSelectedStudent] = useState<StudentRow | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form State
  const [fullName, setFullName] = useState('')
  const [nickname, setNickname] = useState('')
  const [classId, setClassId] = useState('1')
  const [gender, setGender] = useState<'male' | 'female'>('male')

  const resetForm = () => {
    setFullName('')
    setNickname('')
    setClassId('1')
    setGender('male')
    setIsSubmitting(false)
  }

  const openView = (student: StudentRow) => {
    setSelectedStudent(student)
    setShowViewModal(true)
  }

  const openEdit = (student: StudentRow) => {
    setSelectedStudent(student)
    setFullName(student.full_name)
    setNickname(student.nickname || '')
    setClassId(String(student.current_class_id))
    setGender(student.gender || 'male')
    setShowEditModal(true)
  }

  const openDelete = (student: StudentRow) => {
    setSelectedStudent(student)
    setShowDeleteConfirm(true)
  }

  const handleSave = async (e: React.FormEvent, isEdit = false) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const url = isEdit && selectedStudent ? `/api/students/${selectedStudent.id}` : '/api/students'
      const method = isEdit ? 'PATCH' : 'POST'
      
      const payload: any = {
        class_id: Number(classId),
        full_name: fullName,
        nickname: nickname || undefined,
        gender
      }
      
      if (!isEdit) {
        payload.enrollment_date = new Date().toISOString().split('T')[0]
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        showToast(`Data santri berhasil ${isEdit ? 'diperbarui' : 'ditambahkan'}`, 'success')
        setShowAddModal(false)
        setShowEditModal(false)
        resetForm()
        router.refresh()
      } else {
        showToast('Gagal menyimpan data santri', 'error')
      }
    } catch (err) {
      showToast('Terjadi kesalahan jaringan', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedStudent) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/students/${selectedStudent.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        showToast('Santri berhasil diarsipkan', 'success')
        setShowDeleteConfirm(false)
        router.refresh()
      } else {
        showToast('Gagal mengarsipkan santri', 'error')
      }
    } catch (err) {
      showToast('Terjadi kesalahan jaringan', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStatus = (status: string) => {
    const isAct = status === 'active'
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${isAct ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>
        {isAct ? 'Aktif' : 'Non-aktif'}
      </span>
    )
  }

  const renderStudentAvatar = (name: string) => (
    <div className="w-8 h-8 rounded-full bg-[#4B21A2] text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
      {name.split(' ').map(n => n[0]).slice(0, 2).join('')}
    </div>
  )

  const renderActions = (s: StudentRow) => (
    <div className="flex gap-1.5">
      <button onClick={() => openView(s)} className="w-7 h-7 rounded-lg bg-[#EDE9FE] text-[#4B21A2] flex items-center justify-center hover:bg-[#7B4BD6]/20" aria-label="Lihat Detail">
        <Eye className="w-3.5 h-3.5" />
      </button>
      <button onClick={() => openEdit(s)} className="w-7 h-7 rounded-lg bg-[#EDE9FE] text-[#4B21A2] flex items-center justify-center hover:bg-[#7B4BD6]/20" aria-label="Edit Data">
        <Edit className="w-3.5 h-3.5" />
      </button>
      <button onClick={() => openDelete(s)} className="w-7 h-7 rounded-lg bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200" aria-label="Arsip Data">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )

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
              placeholder="Cari nama santri..."
              className="bg-transparent text-xs outline-none text-gray-900 w-full placeholder-gray-400"
            />
          </div>

          <select
            value={searchParams.get('program_id') || 'all'}
            onChange={(e) => handleFilter('program_id', e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white text-gray-700 outline-none"
            aria-label="Filter Program"
          >
            <option value="all">Semua Program</option>
            <option value="1">Tahfizh Juz 30</option>
            <option value="2">Tahfizh Juz 29</option>
            <option value="3">Tahsin Dasar</option>
          </select>

          <select
            value={searchParams.get('class_id') || 'all'}
            onChange={(e) => handleFilter('class_id', e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white text-gray-700 outline-none"
            aria-label="Filter Kelas"
          >
            <option value="all">Semua Kelas</option>
            <option value="1">Kelompok A</option>
            <option value="2">Kelompok B</option>
            <option value="3">Kelompok C</option>
          </select>

          <select
            value={searchParams.get('status') || 'all'}
            onChange={(e) => handleFilter('status', e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-xs bg-white text-gray-700 outline-none"
            aria-label="Filter Status"
          >
            <option value="all">Semua Status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Non-aktif</option>
          </select>
        </div>

        <button
          onClick={() => { resetForm(); setShowAddModal(true); }}
          className="flex items-center gap-2 bg-[#4B21A2] hover:bg-[#3a1880] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" /> Tambah Santri
        </button>
      </div>

      {/* Main Content Area (Table & Mobile List) */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {data.length === 0 ? (
          <EmptyState title="Santri Tidak Ditemukan" description="Ubah filter atau kata kunci pencarian Anda." />
        ) : (
          <>
            {/* Desktop Table (hidden on mobile) */}
            <div className="hidden md:block w-full overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-[#F0EDF9] border-b border-gray-200 text-xs font-bold text-gray-400">
                    <th className="p-3.5 px-4" scope="col">Santri</th>
                    <th className="p-3.5" scope="col">Program</th>
                    <th className="p-3.5" scope="col">Kelas</th>
                    <th className="p-3.5" scope="col">Guru</th>
                    <th className="p-3.5" scope="col">Progress</th>
                    <th className="p-3.5" scope="col">Kehadiran</th>
                    <th className="p-3.5" scope="col">Status</th>
                    <th className="p-3.5 px-4" scope="col">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs text-gray-800">
                  {data.map((s, idx) => (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors even:bg-gray-50/50 odd:bg-white">
                      <td className="p-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {renderStudentAvatar(s.full_name)}
                          <div>
                            <div className="font-semibold text-gray-900">{s.full_name}</div>
                            <div className="text-[10px] text-gray-400">ID: {String(s.id).padStart(4, '0')}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 text-gray-600">{s.program_name || '-'}</td>
                      <td className="p-3.5 text-gray-600">{s.class_name || '-'}</td>
                      <td className="p-3.5 text-gray-600">{s.teacher_name || '-'}</td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <ProgressRing pct={s.last_score || 0} size={32} />
                        </div>
                      </td>
                      <td className="p-3.5 font-bold text-emerald-600">{s.attendance_pct ?? 0}%</td>
                      <td className="p-3.5">{renderStatus(s.status)}</td>
                      <td className="p-3.5 px-4">{renderActions(s)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Data List (hidden on md and up) */}
            <div className="md:hidden divide-y divide-gray-100">
              {data.map((s) => (
                <div key={s.id} className="p-3">
                  <div className="flex items-start gap-3">
                    {renderStudentAvatar(s.full_name)}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <div className="font-bold text-gray-900 text-sm truncate">{s.full_name}</div>
                        {renderStatus(s.status)}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5 truncate">
                        ID: {String(s.id).padStart(4, '0')} • {s.class_name || '-'}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                         <div className="text-[11px] font-bold text-emerald-600">
                           Hadir: {s.attendance_pct ?? 0}%
                         </div>
                         <div className="flex gap-1.5">{renderActions(s)}</div>
                      </div>
                    </div>
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
      {showViewModal && selectedStudent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-gray-900 text-base">Detail Santri</h3>
              <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex items-center gap-4 mb-4">
              {renderStudentAvatar(selectedStudent.full_name)}
              <div>
                <h4 className="font-bold text-gray-900">{selectedStudent.full_name}</h4>
                <p className="text-xs text-gray-500">Panggilan: {selectedStudent.nickname || '-'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-y-4 gap-x-4 text-xs">
              <div>
                <p className="text-gray-400 text-[10px]">ID Santri</p>
                <p className="font-medium text-gray-900">{String(selectedStudent.id).padStart(4, '0')}</p>
              </div>
              <div>
                <p className="text-gray-400 text-[10px]">Status</p>
                <div>{renderStatus(selectedStudent.status)}</div>
              </div>
              <div>
                <p className="text-gray-400 text-[10px]">Program</p>
                <p className="font-medium text-gray-900">{selectedStudent.program_name || '-'}</p>
              </div>
              <div>
                <p className="text-gray-400 text-[10px]">Kelas</p>
                <p className="font-medium text-gray-900">{selectedStudent.class_name || '-'}</p>
              </div>
              <div>
                <p className="text-gray-400 text-[10px]">Guru Pengampu</p>
                <p className="font-medium text-gray-900">{selectedStudent.teacher_name || '-'}</p>
              </div>
              <div>
                <p className="text-gray-400 text-[10px]">Tanggal Bergabung</p>
                <p className="font-medium text-gray-900">
                  {selectedStudent.enrollment_date 
                    ? new Date(selectedStudent.enrollment_date).toLocaleDateString('id-ID') 
                    : '-'}
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setShowViewModal(false)}
              className="w-full mt-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200 transition-colors"
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
                {showEditModal ? 'Edit Santri' : 'Tambah Santri Baru'}
              </h3>
              <button 
                onClick={() => { setShowAddModal(false); setShowEditModal(false); }} 
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => handleSave(e, showEditModal)} className="space-y-3">
              <div>
                <label htmlFor="fullName" className="block text-xs font-semibold text-gray-700 mb-1">Nama Lengkap</label>
                <input
                  id="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ahmad Zaki Ramadhan"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#4B21A2]"
                />
              </div>

              <div>
                <label htmlFor="nickname" className="block text-xs font-semibold text-gray-700 mb-1">Nama Panggilan</label>
                <input
                  id="nickname"
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Ahmad"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#4B21A2]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="gender" className="block text-xs font-semibold text-gray-700 mb-1">Jenis Kelamin</label>
                  <select
                    id="gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value as 'male' | 'female')}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none"
                  >
                    <option value="male">Laki-laki</option>
                    <option value="female">Perempuan</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="classId" className="block text-xs font-semibold text-gray-700 mb-1">Kelas</label>
                  <select
                    id="classId"
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
                  disabled={isSubmitting}
                  onClick={() => { setShowAddModal(false); setShowEditModal(false); }}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold disabled:opacity-50 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-[#4B21A2] text-white rounded-xl text-xs font-bold disabled:opacity-50 hover:bg-[#3a1880]"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Santri'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete / Archive Confirm */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Arsip Data Santri"
        message={`Apakah Anda yakin ingin mengarsipkan data ${selectedStudent?.full_name}? Data historis seperti kehadiran dan hafalan akan tetap dipertahankan.`}
        confirmText={isSubmitting ? 'Mengarsipkan...' : 'Ya, Arsipkan'}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        isDanger={true}
      />
    </div>
  )
}
