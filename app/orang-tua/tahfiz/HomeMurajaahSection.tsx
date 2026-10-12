'use client'

import { useState, useEffect } from 'react'
import { HomeMurajaahWithDetails } from '@/lib/db/queries/home-murajaah'
import { recordHomeMurajaahAction, getHomeMurajaahListAction } from './actions'
import { 
  Home, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  X, 
  Loader2, 
  Calendar,
  BookOpen,
  MessageSquare
} from 'lucide-react'

interface HomeMurajaahSectionProps {
  childId?: string
  studentId?: number
  surahs: Array<{ id: number; number: number; nameLatin: string; totalAyahs: number }>
}

export default function HomeMurajaahSection({ childId, studentId, surahs }: HomeMurajaahSectionProps) {
  const [records, setRecords] = useState<HomeMurajaahWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Form states
  const [selectedSurahId, setSelectedSurahId] = useState<number>(surahs[0]?.id || 1)
  const [sessionDate, setSessionDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [ayahStart, setAyahStart] = useState<number>(1)
  const [ayahEnd, setAyahEnd] = useState<number>(7)
  const [notes, setNotes] = useState<string>('')

  const activeSurah = surahs.find((s) => s.id === selectedSurahId)

  const loadRecords = async () => {
    setLoading(true)
    const res = await getHomeMurajaahListAction(childId, studentId)
    if (res.success && res.data) {
      setRecords(res.data)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadRecords()
  }, [childId, studentId])

  const handleSurahChange = (id: number) => {
    setSelectedSurahId(id)
    const s = surahs.find((item) => item.id === id)
    if (s) {
      setAyahStart(1)
      setAyahEnd(Math.min(7, s.totalAyahs))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (ayahStart < 1) {
      setFormError('Ayat awal minimal 1')
      return
    }
    if (ayahEnd < ayahStart) {
      setFormError('Ayat akhir tidak boleh lebih kecil dari ayat awal')
      return
    }
    if (activeSurah && ayahEnd > activeSurah.totalAyahs) {
      setFormError(`Ayat akhir melebihi total ayat ${activeSurah.nameLatin} (${activeSurah.totalAyahs})`)
      return
    }

    setSubmitting(true)
    const res = await recordHomeMurajaahAction({
      childId,
      studentId,
      surahId: selectedSurahId,
      sessionDate,
      ayahStart,
      ayahEnd,
      notes,
    })

    if (res.success) {
      setShowModal(false)
      setNotes('')
      await loadRecords()
    } else {
      setFormError(res.error || 'Gagal menyimpan catatan muroja\'ah')
    }
    setSubmitting(false)
  }

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <Home className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-base">Muroja'ah di Rumah</h3>
            <p className="text-xs text-gray-500 font-medium">
              Catatan tilawah mandiri santri bersama orang tua yang diverifikasi oleh guru
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setFormError(null)
            setShowModal(true)
          }}
          className="px-4 py-2.5 bg-[#4B21A2] text-white text-xs font-bold rounded-xl hover:bg-[#3B1782] transition flex items-center justify-center gap-2 shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Catat Muroja'ah</span>
        </button>
      </div>

      {/* History List */}
      {loading ? (
        <div className="space-y-3">
          <div className="animate-pulse bg-gray-50 h-16 rounded-2xl"></div>
          <div className="animate-pulse bg-gray-50 h-16 rounded-2xl"></div>
        </div>
      ) : records.length === 0 ? (
        <div className="bg-gray-50/60 border border-dashed border-gray-200 rounded-2xl p-8 text-center">
          <BookOpen className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-xs font-semibold text-gray-700">Belum ada catatan muroja'ah di rumah</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Klik tombol di atas untuk mendampingi santri mencatat hafalan yang diulang di rumah
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((rec) => (
            <div
              key={rec.id}
              className="p-4 rounded-2xl border border-gray-100 bg-gray-50/40 hover:bg-white hover:shadow-xs transition space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-gray-900">
                    QS. {rec.surah_name_latin}
                  </span>
                  <span className="text-xs text-[#4B21A2] font-semibold bg-purple-50 px-2 py-0.5 rounded-md">
                    Ayat {rec.ayah_start} - {rec.ayah_end}
                  </span>
                </div>

                {/* Status Badge */}
                {rec.status === 'VERIFIED' && (
                  <span className="flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 text-[10px] font-bold rounded-full border border-green-100">
                    <CheckCircle2 className="w-3 h-3" />
                    Diverifikasi Guru
                  </span>
                )}
                {rec.status === 'PENDING' && (
                  <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-full border border-amber-100">
                    <Clock className="w-3 h-3" />
                    Menunggu Verifikasi
                  </span>
                )}
                {rec.status === 'REJECTED' && (
                  <span className="flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 text-[10px] font-bold rounded-full border border-red-100">
                    <AlertCircle className="w-3 h-3" />
                    Perlu Diulang
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  {rec.session_date}
                </span>

                {rec.teacher_name && (
                  <span className="text-[11px] text-gray-600 font-medium">
                    Guru: {rec.teacher_name}
                  </span>
                )}
              </div>

              {rec.notes && (
                <p className="text-xs text-gray-600 italic bg-white p-2.5 rounded-xl border border-gray-100">
                  "{rec.notes}"
                </p>
              )}

              {rec.verification_notes && (
                <div className="text-[11px] bg-purple-50/60 p-2.5 rounded-xl border border-purple-100 text-purple-900 font-medium">
                  Catatan Guru: {rec.verification_notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Form Catat Muroja'ah */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-gray-100 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-base">Catat Muroja'ah di Rumah</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Tanggal Muroja'ah
                </label>
                <input
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Pilih Surah
                </label>
                <select
                  value={selectedSurahId}
                  onChange={(e) => handleSurahChange(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-400 font-medium"
                >
                  {surahs.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.number}. {s.nameLatin} ({s.totalAyahs} ayat)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Ayat Awal
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={activeSurah?.totalAyahs || 286}
                    value={ayahStart}
                    onChange={(e) => setAyahStart(Number(e.target.value))}
                    required
                    className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-400 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Ayat Akhir
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={activeSurah?.totalAyahs || 286}
                    value={ayahEnd}
                    onChange={(e) => setAyahEnd(Number(e.target.value))}
                    required
                    className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-400 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Catatan Pendampingan (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Misal: Sudah lancar, ada sedikit tersendat di ayat 5"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-[#4B21A2] text-white text-xs font-bold rounded-xl hover:bg-[#3B1782] disabled:opacity-50 transition flex items-center gap-1.5 shadow-xs"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Simpan Catatan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
