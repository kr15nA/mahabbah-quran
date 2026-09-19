'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { searchStudentsAction, assignStudentScholarshipAction, updateStudentScholarshipAction } from './actions'
import { Search } from 'lucide-react'

interface AwardFormProps {
  initialData?: any // for editing
  programs: any[]
  academicYears: any[]
  studentId?: number // for prefilling from student detail
}

export function AwardForm({ initialData, programs, academicYears, studentId }: AwardFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isEdit = !!initialData

  const [formData, setFormData] = useState({
    studentId: initialData?.studentId?.toString() || studentId?.toString() || '',
    studentName: initialData?.studentName || '',
    scholarshipProgramId: initialData?.programId?.toString() || '',
    academicYearId: initialData?.academicYearId?.toString() || '',
    startMonth: initialData?.startDate ? initialData.startDate.substring(0, 7) : '',
    endMonth: initialData?.endDate ? initialData.endDate.substring(0, 7) : '',
    notes: initialData?.notes || ''
  })

  // Bounded Student Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    if (searchQuery.length >= 3 && !isEdit) {
      setSearching(true)
      const timeoutId = setTimeout(async () => {
        try {
          const results = await searchStudentsAction(searchQuery)
          setSearchResults(results)
          setShowDropdown(true)
        } catch (err) {
          console.error(err)
        } finally {
          setSearching(false)
        }
      }, 300)
      return () => clearTimeout(timeoutId)
    } else {
      setSearchResults([])
      setShowDropdown(false)
    }
  }, [searchQuery, isEdit])

  const selectStudent = (student: any) => {
    setFormData(prev => ({
      ...prev,
      studentId: student.id.toString(),
      studentName: student.fullName
    }))
    setSearchQuery('')
    setShowDropdown(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = new FormData()
      data.append('studentId', formData.studentId)
      data.append('scholarshipProgramId', formData.scholarshipProgramId)
      data.append('academicYearId', formData.academicYearId)
      data.append('startMonth', formData.startMonth)
      if (formData.endMonth) data.append('endMonth', formData.endMonth)
      if (formData.notes) data.append('notes', formData.notes)

      if (isEdit) {
        await updateStudentScholarshipAction(initialData.id, data)
        router.back() // Go back to detail
      } else {
        await assignStudentScholarshipAction(data)
        router.push('/admin/keuangan/beasiswa?tab=recipients')
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md border border-red-100 text-sm">
          {error}
        </div>
      )}

      {!isEdit && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Cari Santri *</label>
            {!formData.studentId ? (
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ketik min 3 huruf nama/NISN..."
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white pr-10"
                />
                <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
                
                {showDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {searching ? (
                      <div className="p-3 text-sm text-gray-500">Mencari...</div>
                    ) : searchResults.length === 0 ? (
                      <div className="p-3 text-sm text-gray-500">Santri tidak ditemukan</div>
                    ) : (
                      searchResults.map(s => (
                        <div 
                          key={s.id} 
                          className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
                          onClick={() => selectStudent(s)}
                        >
                          <div className="font-medium text-sm text-gray-900">{s.fullName}</div>
                          <div className="text-xs text-gray-500">NISN: {s.nisn || '-'}</div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex justify-between items-center bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm">
                <span className="font-medium">{formData.studentName}</span>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, studentId: '', studentName: '' }))}
                  className="text-red-500 hover:text-red-700 text-xs font-medium"
                >
                  Ubah
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {isEdit && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Santri</label>
            <div className="bg-gray-100 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 cursor-not-allowed">
              {formData.studentName}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Program Beasiswa *</label>
          {isEdit ? (
            <div className="bg-gray-100 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 cursor-not-allowed">
              {initialData.programName}
            </div>
          ) : (
            <select
              value={formData.scholarshipProgramId}
              onChange={(e) => setFormData(prev => ({ ...prev, scholarshipProgramId: e.target.value }))}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
            >
              <option value="">Pilih Program (Aktif)</option>
              {programs.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tahun Ajaran *</label>
          {isEdit ? (
            <div className="bg-gray-100 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 cursor-not-allowed">
              {initialData.academicYearName}
            </div>
          ) : (
            <select
              value={formData.academicYearId}
              onChange={(e) => setFormData(prev => ({ ...prev, academicYearId: e.target.value }))}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
            >
              <option value="">Pilih Tahun Ajaran</option>
              {academicYears.map(ay => (
                <option key={ay.id} value={ay.id}>{ay.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
        <h4 className="text-sm font-bold text-yellow-800 mb-1">Catatan Periode (Format: YYYY-MM)</h4>
        <p className="text-xs text-yellow-700">
          Beasiswa dievaluasi pada tanggal 1 setiap bulan (mengikuti Periode Tagihan).
          Jika tidak ada bulan akhir, beasiswa berlaku seterusnya (open-ended).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bulan Mulai *</label>
          <input
            type="month"
            value={formData.startMonth}
            onChange={(e) => setFormData(prev => ({ ...prev, startMonth: e.target.value }))}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bulan Berakhir (Opsional)</label>
          <input
            type="month"
            value={formData.endMonth}
            onChange={(e) => setFormData(prev => ({ ...prev, endMonth: e.target.value }))}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white h-20 resize-none"
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
          disabled={loading}
        >
          Batal
        </Button>
        <Button
          type="submit"
          disabled={loading || !formData.studentId}
        >
          {loading ? 'Menyimpan...' : 'Simpan'}
        </Button>
      </div>
    </form>
  )
}
