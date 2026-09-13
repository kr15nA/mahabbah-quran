'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Save, CheckCircle2, RefreshCw, Share2 } from 'lucide-react'
import type { StudentRow } from '@/lib/db/queries/students'
import type { ClassRow } from '@/lib/db/queries/classes'
import type { SurahRow } from '@/lib/db/queries/surahs'
import ShareReportModal from '@/components/ui/ShareReportModal'

export default function GuruLaporanClient({
  classes,
  initialStudents,
  surahs
}: {
  classes: ClassRow[]
  initialStudents: StudentRow[]
  surahs: SurahRow[]
}) {
  const [selectedClassId, setSelectedClassId] = useState<number>(classes[0]?.id || 0)
  const [selectedStudentId, setSelectedStudentId] = useState<number>(0)
  
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [reportId, setReportId] = useState<number | null>(null)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)

  const [formData, setFormData] = useState({
    surah_id: surahs[0]?.id || 1,
    ayah_start: 1,
    ayah_end: 5,
    hafalan_type: 'hafalan_baru' as 'hafalan_baru' | 'muraja_ah',
    hafalan_score: 80,
    makhraj_score: 4,
    tajwid_score: 4,
    kelancaran_score: 4,
    ghunnah_score: 4,
    adab_score: 80,
    attendance_status: 'hadir' as 'hadir' | 'izin' | 'sakit' | 'alfa',
    teacher_notes: '',
  })

  // AI State
  const [aiReportText, setAiReportText] = useState('')
  const [aiParentAdvice, setAiParentAdvice] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  const classStudents = initialStudents.filter(s => s.current_class_id === selectedClassId && s.status === 'active')

  useEffect(() => {
    setSelectedStudentId(0)
    setReportId(null)
    setSaved(false)
    setAiReportText('')
    setAiParentAdvice('')
  }, [selectedClassId])

  useEffect(() => {
    setReportId(null)
    setSaved(false)
    setAiReportText('')
    setAiParentAdvice('')
  }, [selectedStudentId])

  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStudentId) return

    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/learning-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: selectedStudentId,
          ...formData
        }),
      })

      if (res.ok) {
        const json = await res.json()
        if (json.data?.id) {
          setReportId(json.data.id)
          setSaved(true)
        }
      } else {
        alert('Gagal menyimpan laporan')
      }
    } catch (err) {
      console.error(err)
      alert('Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
  }

  const handleGenerateAI = async () => {
    if (!reportId) return
    setAiLoading(true)
    try {
      const res = await fetch(`/api/learning-reports/${reportId}/ai`, { method: 'POST' })
      if (res.ok) {
        const json = await res.json()
        if (json.data) {
          setAiReportText(json.data.reportText)
          setAiParentAdvice(json.data.parentAdvice)
        }
      } else {
        alert('Gagal generate AI')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
        <h3 className="font-bold text-gray-900 text-sm">Form Input Laporan Harian</h3>
        <p className="text-xs text-gray-500">Pilih santri, isi data hafalan & tahsin, lalu simpan laporan</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Form Inputs */}
        <form onSubmit={handleSaveDraft} className="lg:col-span-7 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4 text-xs h-fit">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Pilih Kelas</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 outline-none font-medium focus:border-[#FBBF24] focus:ring-1 focus:ring-[#FBBF24]"
              >
                <option value={0} disabled>Pilih Kelas</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Pilih Santri</label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(Number(e.target.value))}
                disabled={!selectedClassId || classStudents.length === 0}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 outline-none font-medium focus:border-[#FBBF24] focus:ring-1 focus:ring-[#FBBF24] disabled:bg-gray-50"
              >
                <option value={0} disabled>Pilih Santri</option>
                {classStudents.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Surah</label>
              <select
                value={formData.surah_id}
                onChange={(e) => setFormData(p => ({ ...p, surah_id: Number(e.target.value) }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-[#FBBF24] focus:ring-1 focus:ring-[#FBBF24]"
              >
                {surahs.map((s) => (
                  <option key={s.id} value={s.id}>QS. {s.name_latin}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Jenis Setoran</label>
              <select
                value={formData.hafalan_type}
                onChange={(e) => setFormData(p => ({ ...p, hafalan_type: e.target.value as any }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-[#FBBF24] focus:ring-1 focus:ring-[#FBBF24]"
              >
                <option value="hafalan_baru">Hafalan Baru</option>
                <option value="muraja_ah">Muraja'ah</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Ayat Mulai</label>
              <input
                type="number"
                min={1}
                value={formData.ayah_start}
                onChange={(e) => setFormData(p => ({ ...p, ayah_start: Number(e.target.value) }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-[#FBBF24] focus:ring-1 focus:ring-[#FBBF24]"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Ayat Selesai</label>
              <input
                type="number"
                min={1}
                value={formData.ayah_end}
                onChange={(e) => setFormData(p => ({ ...p, ayah_end: Number(e.target.value) }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-[#FBBF24] focus:ring-1 focus:ring-[#FBBF24]"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Nilai Hafalan</label>
              <input
                type="number"
                min={0}
                max={100}
                value={formData.hafalan_score}
                onChange={(e) => setFormData(p => ({ ...p, hafalan_score: Number(e.target.value) }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 outline-none font-bold text-emerald-700 focus:border-[#FBBF24] focus:ring-1 focus:ring-[#FBBF24]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Makhraj</label>
              <input
                type="number"
                min={1} max={5}
                value={formData.makhraj_score}
                onChange={(e) => setFormData(p => ({ ...p, makhraj_score: Number(e.target.value) }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-[#FBBF24]"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Tajwid</label>
              <input
                type="number"
                min={1} max={5}
                value={formData.tajwid_score}
                onChange={(e) => setFormData(p => ({ ...p, tajwid_score: Number(e.target.value) }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-[#FBBF24]"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Kelancaran</label>
              <input
                type="number"
                min={1} max={5}
                value={formData.kelancaran_score}
                onChange={(e) => setFormData(p => ({ ...p, kelancaran_score: Number(e.target.value) }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-[#FBBF24]"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Ghunnah</label>
              <input
                type="number"
                min={1} max={5}
                value={formData.ghunnah_score}
                onChange={(e) => setFormData(p => ({ ...p, ghunnah_score: Number(e.target.value) }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-[#FBBF24]"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="block font-semibold text-gray-700 mb-1">Catatan Singkat Guru</label>
            <textarea
              rows={2}
              value={formData.teacher_notes}
              onChange={(e) => setFormData(p => ({ ...p, teacher_notes: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl p-3 outline-none focus:border-[#FBBF24] focus:ring-1 focus:ring-[#FBBF24]"
              placeholder="Tambahkan catatan khusus untuk santri ini..."
            />
          </div>

          <button
            type="submit"
            disabled={saving || !selectedStudentId}
            className="w-full py-2.5 bg-[#4B21A2] text-white font-bold rounded-xl shadow-sm hover:bg-[#3a1880] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Menyimpan...' : 'Simpan Laporan'}
          </button>
          
          {saved && (
            <div className="space-y-2 mt-2">
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Laporan berhasil disimpan! (ID: {reportId})
              </div>
              <button
                type="button"
                onClick={() => setIsShareModalOpen(true)}
                className="w-full py-2.5 bg-gray-100 text-[#4B21A2] font-bold rounded-xl shadow-sm hover:bg-[#F0EDF9] transition-colors flex justify-center items-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Bagikan Laporan ke Orang Tua
              </button>
            </div>
          )}
        </form>

        {/* AI Panel & Finalizing */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col space-y-4 h-fit">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#FBBF24]" />
              <h4 className="font-bold text-gray-900 text-xs">Penulisan Laporan AI</h4>
            </div>

            <p className="text-[10px] text-gray-500">
              Opsional: Anda dapat menghasilkan deskripsi naratif untuk laporan ini menggunakan AI Mahabbah. 
              Simpan laporan terlebih dahulu sebelum menggunakan fitur ini.
            </p>

            <button
              onClick={handleGenerateAI}
              disabled={aiLoading || !reportId}
              className="w-full py-2.5 bg-gradient-to-r from-[#FBBF24] to-[#F59E0B] text-[#18085A] font-extrabold text-xs rounded-xl shadow-sm hover:shadow-md flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
            >
              {aiLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {aiLoading ? 'Membuat Laporan dengan AI...' : 'Buat Laporan dengan AI'}
            </button>

            {aiReportText && (
              <div className="space-y-3 pt-2 text-xs">
                <div className="p-3 bg-[#F0EDF9] rounded-xl space-y-1">
                  <span className="font-bold text-[#4B21A2] text-[10px]">Ringkasan Naratif:</span>
                  <p className="text-gray-700 leading-relaxed">{aiReportText}</p>
                </div>

                <div className="p-3 bg-amber-50 rounded-xl space-y-1">
                  <span className="font-bold text-amber-900 text-[10px]">Saran untuk Orang Tua:</span>
                  <p className="text-amber-800 leading-relaxed">{aiParentAdvice}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ShareReportModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
        reportId={reportId || 0} 
      />
    </div>
  )
}
