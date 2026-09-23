'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import Pagination from '@/components/ui/Pagination'
import { voidAssignmentAction, assignFeeAction, bulkAssignAction, searchStudentsForAssignAction } from './actions'
import { Plus, Search, Layers, XCircle, Loader2, X } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'

export function AssignmentTab({ assignments, pagination, filters, options }: { assignments: any[], pagination: any, filters: any, options: any }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchTerm, setSearchTerm] = useState(filters.search || '')
  
  const [showSingleModal, setShowSingleModal] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)

  const handleSearch = () => {
    const params = new URLSearchParams(searchParams.toString())
    if (searchTerm) params.set('search', searchTerm)
    else params.delete('search')
    params.set('page', '1')
    router.push(`?${params.toString()}`)
  }

  const handleVoid = async (id: number) => {
    if (!confirm('Assignment yang dibatalkan tetap tersimpan sebagai riwayat. Lanjutkan?')) return
    const res = await voidAssignmentAction(id)
    if (res.success) {
      window.location.reload()
    } else {
      alert(res.error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama santri..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button variant="outline" onClick={handleSearch}>Cari</Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowBulkModal(true)}>
            <Layers className="w-4 h-4 mr-2" />
            Buat Massal
          </Button>
          <Button onClick={() => setShowSingleModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah Santri
          </Button>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 font-medium">Santri</th>
                <th className="px-6 py-4 font-medium">Tahun Ajaran</th>
                <th className="px-6 py-4 font-medium">Jenis Tagihan</th>
                <th className="px-6 py-4 font-medium">Mulai</th>
                <th className="px-6 py-4 font-medium">Selesai</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {assignments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    Belum ada assignment tagihan.
                  </td>
                </tr>
              ) : (
                assignments.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-medium text-[#18085A]">{row.studentName}</td>
                    <td className="px-6 py-4 text-gray-500">{row.academicYear}</td>
                    <td className="px-6 py-4">{row.feeTypeName}</td>
                    <td className="px-6 py-4">{row.startPeriod}</td>
                    <td className="px-6 py-4">{row.endPeriod || '-'}</td>
                    <td className="px-6 py-4">
                      <Badge variant={row.status === 'VALID' ? 'success' : 'neutral'}>
                        {row.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {row.status === 'VALID' && (
                        <Button variant="outline" size="sm" onClick={() => handleVoid(row.id)}>
                          <XCircle className="w-4 h-4 text-red-500" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination 
          currentPage={pagination.page} 
          totalPages={pagination.totalPages} 
          totalItems={pagination.total} 
          limit={20} 
        />
      </Card>

      {showSingleModal && (
        <SingleAssignModal 
          options={options} 
          onClose={() => setShowSingleModal(false)}
          onSuccess={() => { setShowSingleModal(false); window.location.reload() }}
        />
      )}

      {showBulkModal && (
        <BulkAssignModal
          options={options}
          onClose={() => setShowBulkModal(false)}
          onSuccess={() => { setShowBulkModal(false); window.location.reload() }}
        />
      )}
    </div>
  )
}

function SingleAssignModal({ options, onClose, onSuccess }: { options: any, onClose: () => void, onSuccess: () => void }) {
  const [search, setSearch] = useState('')
  const [students, setStudents] = useState<any[]>([])
  const [studentId, setStudentId] = useState<number | ''>('')
  const [academicYearId, setAcademicYearId] = useState<number | ''>('')
  const [feeTypeId, setFeeTypeId] = useState<number | ''>('')
  const [startPeriod, setStartPeriod] = useState('')
  const [endPeriod, setEndPeriod] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (search.trim().length >= 3) {
        setIsSearching(true)
        const res = await searchStudentsForAssignAction({ search })
        if (res.success) setStudents(res.data || [])
        setIsSearching(false)
      } else {
        setStudents([])
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [search])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!studentId || !academicYearId || !feeTypeId || !startPeriod) {
      setError('Harap lengkapi semua field wajib')
      return
    }
    setIsSubmitting(true)
    setError(null)
    const res = await assignFeeAction({
      studentId: Number(studentId),
      academicYearId: Number(academicYearId),
      feeTypeId: Number(feeTypeId),
      startPeriod,
      endPeriod: endPeriod || null
    })
    if (res.success) {
      onSuccess()
    } else {
      setError(res.error)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900">Tambah Assignment Santri</h3>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-200">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cari Santri (min. 3 huruf) *</label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ketik nama santri..."
                className="w-full border-gray-300 rounded-lg text-sm focus:ring-[#18085A] focus:border-[#18085A]"
              />
              {isSearching && <div className="text-xs text-gray-500 mt-1">Mencari...</div>}
              {students.length > 0 && (
                <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                  {students.map(s => (
                    <div 
                      key={s.id} 
                      className={`p-2 text-sm cursor-pointer hover:bg-gray-50 ${studentId === s.id ? 'bg-[#18085A]/10 border-l-2 border-[#18085A]' : ''}`}
                      onClick={() => setStudentId(s.id)}
                    >
                      <div className="font-medium text-gray-900">{s.full_name}</div>
                      <div className="text-xs text-gray-500">{s.class_name || 'Tanpa Kelas'}</div>
                    </div>
                  ))}
                </div>
              )}
              {studentId !== '' && !students.find(s => s.id === studentId) && search.length < 3 && (
                <div className="mt-2 p-2 bg-gray-50 rounded-lg border text-sm text-gray-700">
                  Santri terpilih: ID {studentId}
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tahun Ajaran *</label>
                <select
                  required
                  className="w-full border-gray-300 rounded-lg text-sm"
                  value={academicYearId}
                  onChange={(e) => setAcademicYearId(Number(e.target.value))}
                >
                  <option value="">-- Pilih --</option>
                  {options.academicYears.map((ay: any) => (
                    <option key={ay.id} value={ay.id}>{ay.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Tagihan *</label>
                <select
                  required
                  className="w-full border-gray-300 rounded-lg text-sm"
                  value={feeTypeId}
                  onChange={(e) => setFeeTypeId(Number(e.target.value))}
                >
                  <option value="">-- Pilih --</option>
                  {options.feeTypes.map((ft: any) => (
                    <option key={ft.id} value={ft.id}>{ft.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mulai Berlaku *</label>
                <input
                  required
                  type="text"
                  placeholder="2024-07"
                  className="w-full border-gray-300 rounded-lg text-sm"
                  value={startPeriod}
                  onChange={(e) => setStartPeriod(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Selesai (Opsional)</label>
                <input
                  type="text"
                  placeholder="2025-06"
                  className="w-full border-gray-300 rounded-lg text-sm"
                  value={endPeriod}
                  onChange={(e) => setEndPeriod(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit" disabled={isSubmitting || !studentId}>
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Simpan Assignment'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function BulkAssignModal({ options, onClose, onSuccess }: { options: any, onClose: () => void, onSuccess: () => void }) {
  const [filterType, setFilterType] = useState<'class' | 'program'>('class')
  const [filterId, setFilterId] = useState<number | ''>('')
  
  const [students, setStudents] = useState<any[]>([])
  const [isLoadingStudents, setIsLoadingStudents] = useState(false)
  
  const [academicYearId, setAcademicYearId] = useState<number | ''>('')
  const [feeTypeId, setFeeTypeId] = useState<number | ''>('')
  const [startPeriod, setStartPeriod] = useState('')
  const [endPeriod, setEndPeriod] = useState('')
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [results, setResults] = useState<any[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFetchStudents = async () => {
    if (!filterId) return
    setIsLoadingStudents(true)
    setError(null)
    const filters: any = {}
    if (filterType === 'class') filters.class_id = filterId
    if (filterType === 'program') filters.program_id = filterId
    
    const res = await searchStudentsForAssignAction(filters)
    if (res.success) {
      if ((res.data?.length || 0) > 50) {
        setError('Filter mengembalikan lebih dari 50 santri. Silakan gunakan filter kelas yang lebih spesifik (Maksimal 50 per proses massal).')
        setStudents([])
      } else {
        setStudents(res.data || [])
      }
    } else {
      setError(res.error)
    }
    setIsLoadingStudents(false)
  }

  const handleSubmit = async () => {
    if (students.length === 0 || !academicYearId || !feeTypeId || !startPeriod) {
      setError('Harap lengkapi param dan muat santri terlebih dahulu')
      return
    }
    setIsSubmitting(true)
    setError(null)
    
    const inputs = students.map(s => ({
      studentId: s.id,
      academicYearId: Number(academicYearId),
      feeTypeId: Number(feeTypeId),
      startPeriod,
      endPeriod: endPeriod || null
    }))

    const res = await bulkAssignAction(inputs)
    setIsSubmitting(false)
    if (res.success) {
      setResults(res.results || [])
    } else {
      setError(res.error)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center flex-shrink-0">
          <h3 className="text-lg font-bold text-gray-900">Assignment Massal (Maks 50)</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-200">
              {error}
            </div>
          )}

          {!results ? (
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
                <h4 className="font-medium text-sm text-gray-900">1. Parameter Kewajiban (Assignment)</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Tahun Ajaran *</label>
                    <select
                      className="w-full border-gray-300 rounded-lg text-sm"
                      value={academicYearId}
                      onChange={(e) => setAcademicYearId(Number(e.target.value))}
                    >
                      <option value="">-- Pilih --</option>
                      {options.academicYears.map((ay: any) => (
                        <option key={ay.id} value={ay.id}>{ay.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Jenis Tagihan *</label>
                    <select
                      className="w-full border-gray-300 rounded-lg text-sm"
                      value={feeTypeId}
                      onChange={(e) => setFeeTypeId(Number(e.target.value))}
                    >
                      <option value="">-- Pilih --</option>
                      {options.feeTypes.map((ft: any) => (
                        <option key={ft.id} value={ft.id}>{ft.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Mulai Berlaku *</label>
                    <input
                      type="text"
                      placeholder="2024-07"
                      className="w-full border-gray-300 rounded-lg text-sm"
                      value={startPeriod}
                      onChange={(e) => setStartPeriod(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Selesai (Ops)</label>
                    <input
                      type="text"
                      placeholder="2025-06"
                      className="w-full border-gray-300 rounded-lg text-sm"
                      value={endPeriod}
                      onChange={(e) => setEndPeriod(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
                <h4 className="font-medium text-sm text-gray-900">2. Pilih Santri</h4>
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Filter Berdasarkan</label>
                    <select
                      className="w-full border-gray-300 rounded-lg text-sm"
                      value={filterType}
                      onChange={(e) => { setFilterType(e.target.value as 'class'|'program'); setFilterId(''); setStudents([]) }}
                    >
                      <option value="class">Kelas</option>
                      <option value="program">Program</option>
                    </select>
                  </div>
                  <div className="flex-[2]">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Pilih {filterType === 'class' ? 'Kelas' : 'Program'}</label>
                    <select
                      className="w-full border-gray-300 rounded-lg text-sm"
                      value={filterId}
                      onChange={(e) => setFilterId(Number(e.target.value))}
                    >
                      <option value="">-- Pilih --</option>
                      {filterType === 'class' ? options.classes?.map((c:any) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      )) : options.programs?.map((p:any) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <Button variant="outline" onClick={handleFetchStudents} disabled={!filterId || isLoadingStudents}>
                    {isLoadingStudents ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Muat Santri'}
                  </Button>
                </div>

                {students.length > 0 && (
                  <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden bg-white">
                    <div className="bg-gray-100 p-2 text-xs font-medium text-gray-700 border-b">
                      Pratinjau Santri ({students.length})
                    </div>
                    <div className="max-h-60 overflow-y-auto p-2">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {students.map(s => (
                          <div key={s.id} className="text-xs p-2 bg-gray-50 rounded border">
                            <div className="font-medium truncate" title={s.full_name}>{s.full_name}</div>
                            <div className="text-gray-500 truncate">{s.class_name || 'Tanpa Kelas'}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Hasil Pemrosesan</h4>
              <div className="flex gap-4 mb-4">
                <Badge variant="success">{results.filter(r => r.status === 'CREATED').length} Berhasil</Badge>
                <Badge variant="warning">{results.filter(r => r.status === 'OVERLAP_CONFLICT').length} Bentrok</Badge>
                <Badge variant="danger">{results.filter(r => r.status === 'FAILED' || r.status === 'INVALID').length} Gagal/Tidak Valid</Badge>
              </div>
              <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                    <tr>
                      <th className="px-4 py-3">ID Santri</th>
                      <th className="px-4 py-3">Nama (Ref)</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {results.map((r, i) => (
                      <tr key={i}>
                        <td className="px-4 py-3 font-mono">{r.studentId}</td>
                        <td className="px-4 py-3">{students.find(s => s.id === r.studentId)?.full_name || '-'}</td>
                        <td className="px-4 py-3">
                          {r.status === 'CREATED' && <Badge variant="success">Berhasil</Badge>}
                          {r.status === 'OVERLAP_CONFLICT' && <Badge variant="warning">Bentrok</Badge>}
                          {r.status === 'INVALID' && <Badge variant="danger">Tidak Valid</Badge>}
                          {r.status === 'FAILED' && <Badge variant="danger">Gagal</Badge>}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {r.error || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 flex-shrink-0">
          {!results ? (
            <>
              <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
              <Button onClick={handleSubmit} disabled={isSubmitting || students.length === 0 || !academicYearId || !feeTypeId || !startPeriod}>
                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Proses Massal'}
              </Button>
            </>
          ) : (
            <Button onClick={onSuccess}>Tutup & Muat Ulang</Button>
          )}
        </div>
      </div>
    </div>
  )
}
