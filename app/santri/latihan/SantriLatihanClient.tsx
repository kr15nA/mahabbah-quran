'use client'

import { useState, useEffect, useMemo } from 'react'
import { SurahRow } from '@/lib/db/queries/surahs'
import { QuranSurahDetail, QuranAyah } from '@/lib/quran/service'
import { getSurahDetailAction } from '../quran/actions'
import { 
  Brain, 
  Eye, 
  EyeOff, 
  HelpCircle, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Loader2, 
  Flame,
  ArrowRight,
  ShieldAlert
} from 'lucide-react'

interface SantriLatihanClientProps {
  initialSurahs: SurahRow[]
}

type PracticeMode = 'read' | 'mask' | 'hint'

export default function SantriLatihanClient({ initialSurahs }: SantriLatihanClientProps) {
  const [selectedSurahNumber, setSelectedSurahNumber] = useState<number>(1)
  const [surahDetail, setSurahDetail] = useState<QuranSurahDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Range state
  const [ayahStart, setAyahStart] = useState<number>(1)
  const [ayahEnd, setAyahEnd] = useState<number>(7)

  // Practice Mode state
  const [mode, setMode] = useState<PracticeMode>('mask')

  // Per-ayah revealed overrides (set of ayah numbers)
  const [revealedAyahs, setRevealedAyahs] = useState<Record<number, boolean>>({})

  // Repetition (Tikrar) counter state
  const [repeatCount, setRepeatCount] = useState<number>(0)
  const [targetRepeats, setTargetRepeats] = useState<number>(10)

  // Self check state
  const [isSelfVerified, setIsSelfVerified] = useState<boolean>(false)

  const activeSurahMeta = initialSurahs.find((s) => s.number === selectedSurahNumber)

  // Load surah detail
  useEffect(() => {
    async function loadSurah() {
      setLoading(true)
      setError(null)
      setRevealedAyahs({})
      setIsSelfVerified(false)
      setRepeatCount(0)

      const res = await getSurahDetailAction(selectedSurahNumber)
      if (res.success && res.data) {
        setSurahDetail(res.data)
        setAyahStart(1)
        setAyahEnd(Math.min(7, res.data.jumlahAyat))
      } else {
        setError(res.error || 'Gagal memuat surah untuk latihan')
      }
      setLoading(false)
    }
    loadSurah()
  }, [selectedSurahNumber])

  // Filter ayahs by selected range
  const practicedAyahs = useMemo(() => {
    if (!surahDetail) return []
    return surahDetail.ayat.filter(
      (a) => a.nomorAyat >= ayahStart && a.nomorAyat <= ayahEnd
    )
  }, [surahDetail, ayahStart, ayahEnd])

  const handleToggleAyahReveal = (ayahNum: number) => {
    setRevealedAyahs((prev) => ({
      ...prev,
      [ayahNum]: !prev[ayahNum],
    }))
  }

  const handleRevealAll = () => {
    const allRevealed: Record<number, boolean> = {}
    practicedAyahs.forEach((a) => {
      allRevealed[a.nomorAyat] = true
    })
    setRevealedAyahs(allRevealed)
  }

  const handleMaskAll = () => {
    setRevealedAyahs({})
  }

  const handleIncrementRepeat = () => {
    setRepeatCount((prev) => prev + 1)
  }

  const handleResetRepeat = () => {
    setRepeatCount(0)
    setIsSelfVerified(false)
  }

  // Get progressive hint (first 2 words of Arabic text)
  const getAyahHint = (textArab: string) => {
    const words = textArab.trim().split(/\s+/)
    if (words.length <= 2) return textArab
    return words.slice(0, 2).join(' ') + ' ...'
  }

  return (
    <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-4 space-y-6">
      {/* Official Assessment Distinction Banner */}
      <div className="bg-amber-50/80 border border-amber-200/80 p-4 rounded-3xl flex items-start gap-3 shadow-xs">
        <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="text-xs">
          <span className="font-bold text-amber-950 uppercase tracking-wider block">
            Mode Latihan Mandiri (Self-Practice)
          </span>
          <p className="text-amber-800 mt-0.5 leading-relaxed">
            Halaman ini adalah sarana belajar dan tikrar mandiri pribadi. Aktivitas di sini{' '}
            <strong className="underline">TIDAK menghasilkan nilai resmi</strong> dan tidak mengubah
            catatan hafalan kelas guru maupun capaian tasmi'.
          </p>
        </div>
      </div>

      {/* Control Panel: Surah & Range Selector */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-[#4B21A2] flex items-center justify-center shrink-0">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 text-base">Pilih Materi Latihan</h2>
              <p className="text-xs text-gray-500 font-medium">
                Tentukan surah dan rentang ayat yang ingin dilancarkan
              </p>
            </div>
          </div>

          <div className="w-full sm:w-64">
            <select
              value={selectedSurahNumber}
              onChange={(e) => setSelectedSurahNumber(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-400 font-medium"
            >
              {initialSurahs.map((s) => (
                <option key={s.number} value={s.number}>
                  {s.number}. {s.name_latin} ({s.total_ayahs} Ayat)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Range Selection */}
        {surahDetail && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-gray-100 items-end">
            <div>
              <label className="block text-[11px] font-bold text-gray-600 mb-1">
                Ayat Mulai
              </label>
              <input
                type="number"
                min={1}
                max={surahDetail.jumlahAyat}
                value={ayahStart}
                onChange={(e) => setAyahStart(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-400 font-bold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-600 mb-1">
                Ayat Selesai
              </label>
              <input
                type="number"
                min={ayahStart}
                max={surahDetail.jumlahAyat}
                value={ayahEnd}
                onChange={(e) => setAyahEnd(Math.min(surahDetail.jumlahAyat, Number(e.target.value)))}
                className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-400 font-bold"
              />
            </div>

            <div className="col-span-2 flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">
                Total latihan:{' '}
                <strong className="text-[#4B21A2]">{practicedAyahs.length} ayat</strong>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Mode & Tikrar Counter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Mode Selector (7 cols) */}
        <div className="md:col-span-7 bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700">Mode Tampilan Ayat:</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleRevealAll}
                className="text-[11px] text-[#4B21A2] font-semibold hover:underline"
              >
                Buka Semua
              </button>
              <span className="text-gray-300">•</span>
              <button
                onClick={handleMaskAll}
                className="text-[11px] text-gray-500 font-semibold hover:underline"
              >
                Tutup Semua
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => {
                setMode('read')
                handleRevealAll()
              }}
              className={`p-3 rounded-2xl border text-center transition flex flex-col items-center gap-1.5 ${
                mode === 'read'
                  ? 'border-[#4B21A2] bg-purple-50/60 text-[#4B21A2] font-bold'
                  : 'border-gray-100 bg-gray-50/50 text-gray-600 hover:bg-gray-50 font-medium'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span className="text-xs">Mode Baca</span>
            </button>

            <button
              onClick={() => {
                setMode('mask')
                handleMaskAll()
              }}
              className={`p-3 rounded-2xl border text-center transition flex flex-col items-center gap-1.5 ${
                mode === 'mask'
                  ? 'border-[#4B21A2] bg-purple-50/60 text-[#4B21A2] font-bold'
                  : 'border-gray-100 bg-gray-50/50 text-gray-600 hover:bg-gray-50 font-medium'
              }`}
            >
              <EyeOff className="w-4 h-4" />
              <span className="text-xs">Uji Hafalan</span>
            </button>

            <button
              onClick={() => {
                setMode('hint')
                handleMaskAll()
              }}
              className={`p-3 rounded-2xl border text-center transition flex flex-col items-center gap-1.5 ${
                mode === 'hint'
                  ? 'border-[#4B21A2] bg-purple-50/60 text-[#4B21A2] font-bold'
                  : 'border-gray-100 bg-gray-50/50 text-gray-600 hover:bg-gray-50 font-medium'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span className="text-xs">Beri Petunjuk</span>
            </button>
          </div>
        </div>

        {/* Tikrar Counter (5 cols) */}
        <div className="md:col-span-5 bg-gradient-to-br from-[#4B21A2] to-[#341378] text-white p-5 rounded-3xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-300" />
              <span className="text-xs font-bold uppercase tracking-wider text-purple-200">
                Penghitung Tikrar
              </span>
            </div>
            <button
              onClick={handleResetRepeat}
              className="p-1 text-purple-200 hover:text-white rounded-lg transition"
              title="Reset hitungan"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-between my-2">
            <div>
              <div className="text-3xl font-black">
                {repeatCount}{' '}
                <span className="text-xs font-normal text-purple-200">/ {targetRepeats}x</span>
              </div>
              <p className="text-[11px] text-purple-200 mt-0.5">
                {repeatCount >= targetRepeats ? 'Target tercapai! 🎉' : 'Pengulangan hafalan'}
              </p>
            </div>

            <button
              onClick={handleIncrementRepeat}
              className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-amber-950 text-xs font-black rounded-xl transition shadow-sm active:scale-95"
            >
              +1 Ulangi
            </button>
          </div>

          {/* Quick Target Selector */}
          <div className="flex items-center gap-1.5 pt-2 border-t border-white/10">
            <span className="text-[10px] text-purple-200">Target:</span>
            {[5, 10, 20, 40].map((t) => (
              <button
                key={t}
                onClick={() => setTargetRepeats(t)}
                className={`px-2 py-0.5 text-[10px] rounded-md transition font-bold ${
                  targetRepeats === t
                    ? 'bg-white text-[#4B21A2]'
                    : 'text-purple-200 hover:bg-white/10'
                }`}
              >
                {t}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          <div className="animate-pulse bg-white p-8 rounded-3xl border border-gray-100 h-32"></div>
          <div className="animate-pulse bg-white p-8 rounded-3xl border border-gray-100 h-32"></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 p-6 rounded-3xl border border-red-200 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
          <h3 className="font-bold text-red-900 text-sm">{error}</h3>
        </div>
      )}

      {/* Practiced Ayahs Cards */}
      {!loading && surahDetail && practicedAyahs.length > 0 && (
        <div className="space-y-4">
          {practicedAyahs.map((ayah) => {
            const isRevealed = revealedAyahs[ayah.nomorAyat] || mode === 'read'

            return (
              <div
                key={ayah.nomorAyat}
                className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs hover:border-purple-200 transition space-y-4"
              >
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-xl bg-purple-50 text-[#4B21A2] font-black text-xs flex items-center justify-center">
                      {ayah.nomorAyat}
                    </span>
                    <span className="text-[11px] text-gray-500 font-semibold">
                      QS. {surahDetail.namaLatin}:{ayah.nomorAyat}
                    </span>
                  </div>

                  <button
                    onClick={() => handleToggleAyahReveal(ayah.nomorAyat)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#4B21A2] hover:bg-purple-50 transition"
                  >
                    {isRevealed ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Sembunyikan</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>Buka Ayat</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Arabic Text Display */}
                <div className="text-right py-2" dir="rtl">
                  {isRevealed ? (
                    <p className="text-2xl sm:text-3xl font-serif text-gray-900 leading-[2.5] tracking-wide animate-in fade-in duration-200">
                      {ayah.teksArab}
                    </p>
                  ) : mode === 'hint' ? (
                    <div className="space-y-2">
                      <p className="text-2xl font-serif text-[#4B21A2] leading-[2.5]">
                        {getAyahHint(ayah.teksArab)}
                      </p>
                      <p className="text-[11px] text-gray-400 font-sans" dir="ltr">
                        (Dua kata pertama ditampilkan sebagai pemancing ingatan)
                      </p>
                    </div>
                  ) : (
                    <div className="py-6 px-4 bg-gray-50/80 rounded-2xl border border-dashed border-gray-200 text-center flex flex-col items-center justify-center gap-2">
                      <EyeOff className="w-5 h-5 text-gray-400" />
                      <span className="text-xs text-gray-500 font-medium" dir="ltr">
                        Teks disembunyikan. Bacalah dari hafalan lalu klik &ldquo;Buka Ayat&rdquo; untuk memeriksa.
                      </span>
                    </div>
                  )}
                </div>

                {/* Transliteration and Translation shown only when revealed or in read mode */}
                {isRevealed && (
                  <div className="pt-2 border-t border-gray-100 space-y-1">
                    <p className="text-xs text-[#4B21A2] italic font-medium">
                      {ayah.teksLatin}
                    </p>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {ayah.teksIndonesia}
                    </p>
                  </div>
                )}
              </div>
            )
          })}

          {/* Self-Check & Completion Banner */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm text-center space-y-4">
            <h3 className="font-bold text-gray-900 text-sm">Bagaimana Latihan Anda?</h3>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setIsSelfVerified(false)}
                className="px-4 py-2 border border-gray-200 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-50 transition"
              >
                Perlu Diulang
              </button>
              <button
                onClick={() => setIsSelfVerified(true)}
                className="px-5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition flex items-center gap-1.5 shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Alhamdulillah Lancar</span>
              </button>
            </div>

            {isSelfVerified && (
              <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl text-xs font-semibold animate-in fade-in">
                Maa syaa Allah! Pertahankan hafalan ini dengan rutin muroja'ah.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
