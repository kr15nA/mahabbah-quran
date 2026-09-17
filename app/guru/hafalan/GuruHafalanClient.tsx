'use client'

import { useState, useEffect } from 'react'
import { BookMarked, Save, Plus, RefreshCw, X } from 'lucide-react'
import type { StudentRow } from '@/lib/db/queries/students'
import type { ClassRow } from '@/lib/db/queries/classes'
import type { SurahRow } from '@/lib/db/queries/surahs'
import type { HafalanRow } from '@/lib/db/queries/hafalan'
import SurahSelector from '@/components/quran/SurahSelector'

export default function GuruHafalanClient({
  classes,
  initialStudents,
  surahs,
  teacherName
}: {
  classes: ClassRow[]
  initialStudents: StudentRow[]
  surahs: SurahRow[]
  teacherName: string
}) {
  const [selectedClassId, setSelectedClassId] = useState<number>(classes[0]?.id || 0)
  const [selectedStudentId, setSelectedStudentId] = useState<number>(0)
  
  const [records, setRecords] = useState<HafalanRow[]>([])
  const [loading, setLoading] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    surah_id: surahs[0]?.id || 1,
    ayah_start: 1,
    ayah_end: 5,
    type: 'hafalan_baru' as 'hafalan_baru' | 'muraja_ah',
    score: 80,
  })

  const classStudents = initialStudents.filter(s => s.current_class_id === selectedClassId && s.status === 'active')

  useEffect(() => {
    // When class changes, reset selected student
    setSelectedStudentId(0)
    setRecords([])
  }, [selectedClassId])

  useEffect(() => {
    if (!selectedStudentId) {
      setRecords([])
      return
    }

    const loadRecords = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/hafalan?student_id=${selectedStudentId}`)
        if (res.ok) {
          const { data } = await res.json()
          setRecords(data || [])
        }
      } catch (err) {
        console.error('Failed to load hafalan', err)
      } finally {
        setLoading(false)
      }
    }
    loadRecords()
  }, [selectedStudentId])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStudentId) return

    setSaving(true)
    try {
      const res = await fetch('/api/hafalan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: selectedStudentId,
          ...formData
        })
      })
      if (res.ok) {
        // Reload records
        const fetchRes = await fetch(`/api/hafalan?student_id=${selectedStudentId}`)
        if (fetchRes.ok) {
          const { data } = await fetchRes.json()
          setRecords(data || [])
        }
        setIsFormOpen(false)
      } else {
        alert('Gagal menyimpan record hafalan')
      }
    } catch (err) {
      console.error(err)
      alert('Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
  }

  const selectedStudent = classStudents.find(s => s.id === selectedStudentId)

  const selectedSurah = surahs.find(s => s.id === formData.surah_id)
  const maxAyahs = selectedSurah ? selectedSurah.total_ayahs : 1

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div>
          <h3 className="font-bold text-gray-900 text-sm">Pilih Kelas & Santri</h3>
          <p className="text-xs text-gray-500">Pilih santri untuk melihat atau menambah riwayat hafalan</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Kelas</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#FBBF24] focus:ring-1 focus:ring-[#FBBF24]"
            >
              <option value={0} disabled>Pilih Kelas</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Santri</label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(Number(e.target.value))}
              disabled={!selectedClassId || classStudents.length === 0}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#FBBF24] focus:ring-1 focus:ring-[#FBBF24] disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value={0} disabled>Pilih Santri</option>
              {classStudents.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {selectedStudentId > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-[#FAFAFA]">
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Riwayat Hafalan</h3>
              <p className="text-xs text-gray-500">{selectedStudent?.full_name}</p>
            </div>
            <button
              onClick={() => setIsFormOpen(true)}
              className="flex items-center gap-2 bg-[#4B21A2] text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-[#3a1880] transition-colors"
            >
              <Plus className="w-4 h-4" /> Tambah Hafalan
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <RefreshCw className="w-6 h-6 text-[#4B21A2] animate-spin" />
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-12 text-sm text-gray-500">
              Belum ada riwayat hafalan untuk santri ini.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F0EDF9] text-gray-600 font-bold border-b border-gray-200 whitespace-nowrap">
                    <th className="p-3 px-4">Surah & Ayat</th>
                    <th className="p-3">Jenis Setoran</th>
                    <th className="p-3">Nilai</th>
                    <th className="p-3 px-4">Tanggal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-800">
                  {records.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="p-3 px-4 font-semibold text-[#4B21A2] whitespace-nowrap">
                        QS. {r.surah_name_latin} : {r.ayah_start}-{r.ayah_end}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-[#4B21A2]">
                          {r.type === 'hafalan_baru' ? 'Hafalan Baru' : "Muraja'ah"}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-emerald-600">{r.score ? `${r.score}/100` : '-'}</td>
                      <td className="p-3 px-4 text-gray-500 whitespace-nowrap">
                        {new Date(r.session_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal / Dialog for New Record */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-[#FAFAFA] flex-shrink-0">
              <h3 className="font-bold text-gray-900">Tambah Hafalan Santri</h3>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto">
              <form id="hafalan-form" onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Surah</label>
                  <SurahSelector
                    surahs={surahs}
                    value={formData.surah_id}
                    onChange={(newSurahId) => {
                      const newSurah = surahs.find(s => s.id === newSurahId)
                      const newMax = newSurah ? newSurah.total_ayahs : 1
                      setFormData(p => ({ 
                        ...p, 
                        surah_id: newSurahId,
                        ayah_start: p.ayah_start > newMax ? newMax : p.ayah_start,
                        ayah_end: p.ayah_end > newMax ? newMax : p.ayah_end
                      }))
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Ayat Mulai</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={maxAyahs}
                      value={formData.ayah_start}
                      onChange={e => setFormData(p => ({ ...p, ayah_start: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#FBBF24] focus:ring-1 focus:ring-[#FBBF24]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Ayat Selesai</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={maxAyahs}
                      value={formData.ayah_end}
                      onChange={e => setFormData(p => ({ ...p, ayah_end: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#FBBF24] focus:ring-1 focus:ring-[#FBBF24]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Jenis Setoran</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input 
                        type="radio" 
                        name="type" 
                        value="hafalan_baru" 
                        checked={formData.type === 'hafalan_baru'}
                        onChange={() => setFormData(p => ({ ...p, type: 'hafalan_baru' }))}
                        className="text-[#4B21A2] focus:ring-[#4B21A2]"
                      />
                      Hafalan Baru
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input 
                        type="radio" 
                        name="type" 
                        value="muraja_ah" 
                        checked={formData.type === 'muraja_ah'}
                        onChange={() => setFormData(p => ({ ...p, type: 'muraja_ah' }))}
                        className="text-[#4B21A2] focus:ring-[#4B21A2]"
                      />
                      Muraja'ah
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Nilai (0-100)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={100}
                    value={formData.score}
                    onChange={e => setFormData(p => ({ ...p, score: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#FBBF24] focus:ring-1 focus:ring-[#FBBF24]"
                  />
                </div>
              </form>
            </div>
            
            <div className="p-4 border-t border-gray-100 bg-[#FAFAFA] flex justify-end gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                form="hafalan-form"
                disabled={saving}
                className="bg-[#FBBF24] hover:bg-[#F59E0B] text-[#18085A] px-6 py-2 rounded-xl text-sm font-bold shadow-sm transition-colors flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
