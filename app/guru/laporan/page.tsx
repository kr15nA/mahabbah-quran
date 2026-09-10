'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Send, CheckCircle2, BookOpen } from 'lucide-react'

type Surah = { id: number; name_latin: string; total_ayahs: number }

export default function GuruLaporanPage() {
  const [studentId, setStudentId] = useState('1')
  const [surahs, setSurahs] = useState<Surah[]>([])
  const [surahId, setSurahId] = useState('78')
  const [ayahStart, setAyahStart] = useState('1')
  const [ayahEnd, setAyahEnd] = useState('10')
  const [hafalanType, setHafalanType] = useState('hafalan_baru')
  const [hafalanScore, setHafalanScore] = useState('88')
  const [makhrajScore, setMakhrajScore] = useState('4')
  const [tajwidScore, setTajwidScore] = useState('5')
  const [kelancaranScore, setKelancaranScore] = useState('4')
  const [ghunnahScore, setGhunnahScore] = useState('3')
  const [teacherNotes, setTeacherNotes] = useState('Masih perlu latihan ghunnah.')

  // AI State
  const [reportId, setReportId] = useState<number | null>(1)
  const [aiReportText, setAiReportText] = useState('')
  const [aiParentAdvice, setAiParentAdvice] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [sentSuccess, setSentSuccess] = useState(false)

  useEffect(() => {
    fetch('/api/surahs')
      .then((res) => res.json())
      .then((json) => {
        if (json.data) setSurahs(json.data)
      })
  }, [])

  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/learning-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: Number(studentId),
          surah_id: Number(surahId),
          ayah_start: Number(ayahStart),
          ayah_end: Number(ayahEnd),
          hafalan_type: hafalanType,
          hafalan_score: Number(hafalanScore),
          makhraj_score: Number(makhrajScore),
          tajwid_score: Number(tajwidScore),
          kelancaran_score: Number(kelancaranScore),
          ghunnah_score: Number(ghunnahScore),
          teacher_notes: teacherNotes,
        }),
      })

      const json = await res.json()
      if (json.data?.id) {
        setReportId(json.data.id)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleGenerateAI = async () => {
    if (!reportId) return
    setAiLoading(true)
    try {
      const res = await fetch(`/api/learning-reports/${reportId}/ai`, { method: 'POST' })
      const json = await res.json()
      if (json.data) {
        setAiReportText(json.data.reportText)
        setAiParentAdvice(json.data.parentAdvice)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
        <h3 className="font-bold text-gray-900 text-sm">Form Input Laporan Harian</h3>
        <p className="text-xs text-gray-500">Isi data hafalan & tahsin santri lalu hasilkan narasi AI untuk orang tua</p>
      </div>

      <div className="grid grid-cols-12 gap-5">
        {/* Form Inputs */}
        <form onSubmit={handleSaveDraft} className="col-span-7 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Pilih Santri</label>
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 outline-none font-medium"
            >
              <option value="1">Ahmad Zaki Ramadhan (Kelompok A)</option>
              <option value="2">Fatimah Az-Zahra (Kelompok A)</option>
              <option value="3">Yusuf Al-Amin (Kelompok A)</option>
              <option value="4">Aisyah Nur Hidayah (Kelompok A)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Surah</label>
              <select
                value={surahId}
                onChange={(e) => setSurahId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 outline-none"
              >
                {surahs.map((s) => (
                  <option key={s.id} value={s.id}>
                    QS. {s.name_latin}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Jenis Setoran</label>
              <select
                value={hafalanType}
                onChange={(e) => setHafalanType(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 outline-none"
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
                value={ayahStart}
                onChange={(e) => setAyahStart(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Ayat Selesai</label>
              <input
                type="number"
                value={ayahEnd}
                onChange={(e) => setAyahEnd(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Nilai Hafalan (0-100)</label>
              <input
                type="number"
                value={hafalanScore}
                onChange={(e) => setHafalanScore(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 outline-none font-bold text-emerald-700"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Catatan Singkat Guru</label>
            <textarea
              rows={2}
              value={teacherNotes}
              onChange={(e) => setTeacherNotes(e.target.value)}
              className="w-full border border-gray-200 rounded-xl p-3 outline-none"
              placeholder="Tambahkan catatan khusus untuk santri ini..."
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-[#4B21A2] text-white font-bold rounded-xl shadow-sm hover:bg-[#3a1880]"
          >
            Simpan Draft Laporan
          </button>
        </form>

        {/* AI Panel & Finalizing */}
        <div className="col-span-5 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#FBBF24]" />
              <h4 className="font-bold text-gray-900 text-xs">Penulisan Laporan AI</h4>
            </div>

            <button
              onClick={handleGenerateAI}
              disabled={aiLoading}
              className="w-full py-2.5 bg-gradient-to-r from-[#FBBF24] to-[#F59E0B] text-[#18085A] font-extrabold text-xs rounded-xl shadow-sm hover:shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
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

          {aiReportText && (
            <button
              onClick={() => setSentSuccess(true)}
              className="w-full py-2.5 bg-[#16A34A] text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" /> Setujui & Kirim ke Orang Tua
            </button>
          )}

          {sentSuccess && (
            <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Laporan berhasil dikirim ke WhatsApp / App Orang Tua!
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
