'use client'

import { useState, useTransition, useMemo, useRef, useEffect } from 'react'
import { SurahRow } from '@/lib/db/queries/surahs'
import { QuranSurahDetail, QURAN_RECITERS } from '@/lib/quran/service'
import { getSurahDetailAction } from './actions'
import { 
  Search, 
  BookOpen, 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle, 
  Loader2, 
  Filter,
  Sparkles,
  Play,
  Pause,
  Square,
  Volume2
} from 'lucide-react'

interface SantriQuranClientProps {
  initialSurahs: SurahRow[]
}

export default function SantriQuranClient({ initialSurahs }: SantriQuranClientProps) {
  const [search, setSearch] = useState('')
  const [selectedJuz, setSelectedJuz] = useState<number | 'all'>('all')
  const [activeSurahNumber, setActiveSurahNumber] = useState<number | null>(null)
  const [surahDetail, setSurahDetail] = useState<QuranSurahDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [errorDetail, setErrorDetail] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Audio Playback State
  const [selectedReciter, setSelectedReciter] = useState<string>('05')
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [playingTarget, setPlayingTarget] = useState<
    { type: 'surah' } | { type: 'ayah'; ayahNumber: number } | null
  >(null)
  const [audioLoading, setAudioLoading] = useState(false)
  const [audioError, setAudioError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
    }
    setIsPlayingAudio(false)
    setPlayingTarget(null)
    setAudioLoading(false)
    setAudioError(null)
  }

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
      }
    }
  }, [])

  const playAudioUrl = (url: string, target: { type: 'surah' } | { type: 'ayah'; ayahNumber: number }) => {
    setAudioError(null)

    // Toggle pause if clicking current playing target
    if (
      isPlayingAudio &&
      audioRef.current &&
      ((target.type === 'surah' && playingTarget?.type === 'surah') ||
       (target.type === 'ayah' && playingTarget?.type === 'ayah' && playingTarget.ayahNumber === target.ayahNumber))
    ) {
      audioRef.current.pause()
      setIsPlayingAudio(false)
      return
    }

    // Resume if paused on same target
    if (
      !isPlayingAudio &&
      audioRef.current &&
      audioRef.current.src === url &&
      ((target.type === 'surah' && playingTarget?.type === 'surah') ||
       (target.type === 'ayah' && playingTarget?.type === 'ayah' && playingTarget.ayahNumber === target.ayahNumber))
    ) {
      audioRef.current
        .play()
        .then(() => setIsPlayingAudio(true))
        .catch((e) => {
          console.error('Audio play error:', e)
          setAudioError('Gagal memutar audio')
        })
      return
    }

    if (audioRef.current) {
      audioRef.current.pause()
    }

    try {
      const audio = new Audio(url)
      audioRef.current = audio
      setPlayingTarget(target)
      setAudioLoading(true)

      audio.oncanplay = () => {
        setAudioLoading(false)
      }

      audio.onplay = () => {
        setIsPlayingAudio(true)
        setAudioLoading(false)
      }

      audio.onpause = () => {
        setIsPlayingAudio(false)
      }

      audio.onended = () => {
        setIsPlayingAudio(false)
        setPlayingTarget(null)
      }

      audio.onerror = (e) => {
        console.error('Audio load error:', e)
        setIsPlayingAudio(false)
        setPlayingTarget(null)
        setAudioLoading(false)
        setAudioError('Audio tidak dapat diputar atau koneksi terputus')
      }

      audio.play().catch((err) => {
        console.error('Audio play exception:', err)
        setIsPlayingAudio(false)
        setPlayingTarget(null)
        setAudioLoading(false)
        setAudioError('Gagal memutar audio. Silakan coba lagi.')
      })
    } catch (err) {
      console.error('Audio creation error:', err)
      setAudioError('Browser tidak mendukung pemutaran format audio ini')
    }
  }

  // Filter surahs by search and juz
  const filteredSurahs = useMemo(() => {
    return initialSurahs.filter((s) => {
      const matchSearch = 
        s.name_latin.toLowerCase().includes(search.toLowerCase()) ||
        s.number.toString().includes(search) ||
        (s.name_translation && s.name_translation.toLowerCase().includes(search.toLowerCase()))
      
      const matchJuz = 
        selectedJuz === 'all' || 
        (selectedJuz >= s.juz_start && selectedJuz <= s.juz_end)

      return matchSearch && matchJuz
    })
  }, [initialSurahs, search, selectedJuz])

  const handleSelectSurah = async (surahNumber: number) => {
    stopAudio()
    setActiveSurahNumber(surahNumber)
    setLoadingDetail(true)
    setErrorDetail(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })

    const res = await getSurahDetailAction(surahNumber)
    if (res.success && res.data) {
      setSurahDetail(res.data)
    } else {
      setErrorDetail(res.error || 'Gagal memuat ayat Al-Qur\'an')
    }
    setLoadingDetail(false)
  }

  const handlePrevSurah = () => {
    if (activeSurahNumber && activeSurahNumber > 1) {
      handleSelectSurah(activeSurahNumber - 1)
    }
  }

  const handleNextSurah = () => {
    if (activeSurahNumber && activeSurahNumber < 114) {
      handleSelectSurah(activeSurahNumber + 1)
    }
  }

  return (
    <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-4 space-y-6">
      {/* If in Surah Detail View */}
      {activeSurahNumber !== null ? (
        <div className="space-y-6">
          {/* Top Detail Navigation Bar */}
          <div className="flex items-center justify-between gap-2 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
            <button
              onClick={() => {
                stopAudio()
                setActiveSurahNumber(null)
                setSurahDetail(null)
                setErrorDetail(null)
              }}
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#4B21A2] hover:bg-purple-50 rounded-xl transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Daftar Surah</span>
            </button>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrevSurah}
                disabled={activeSurahNumber <= 1 || loadingDetail}
                className="p-2 text-gray-600 hover:text-[#4B21A2] hover:bg-purple-50 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition"
                title="Surah Sebelumnya"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-xs font-bold text-gray-700 px-2">
                {activeSurahNumber} / 114
              </span>
              <button
                onClick={handleNextSurah}
                disabled={activeSurahNumber >= 114 || loadingDetail}
                className="p-2 text-gray-600 hover:text-[#4B21A2] hover:bg-purple-50 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition"
                title="Surah Berikutnya"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Loading State */}
          {loadingDetail && (
            <div className="space-y-4">
              <div className="animate-pulse bg-white p-8 rounded-2xl border border-gray-200 h-36"></div>
              <div className="animate-pulse bg-white p-6 rounded-2xl border border-gray-200 h-28"></div>
              <div className="animate-pulse bg-white p-6 rounded-2xl border border-gray-200 h-28"></div>
            </div>
          )}

          {/* Error State */}
          {errorDetail && (
            <div className="bg-red-50 p-6 rounded-2xl border border-red-200 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
              <h3 className="font-bold text-red-900 text-sm">{errorDetail}</h3>
              <button
                onClick={() => handleSelectSurah(activeSurahNumber)}
                className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 transition"
              >
                Coba Lagi
              </button>
            </div>
          )}

          {/* Detail Content */}
          {!loadingDetail && surahDetail && (
            <div className="space-y-6">
              {/* Surah Header Card */}
              <div className="bg-gradient-to-br from-[#4B21A2] to-[#2B0E68] text-white p-6 rounded-3xl shadow-md relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10 pointer-events-none">
                  <span className="text-9xl font-serif">{surahDetail.nama}</span>
                </div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2.5 py-0.5 bg-amber-400 text-amber-950 font-bold text-[10px] rounded-full uppercase tracking-wider">
                        Surah ke-{surahDetail.nomor}
                      </span>
                      <span className="text-xs text-purple-200 font-medium">
                        {surahDetail.tempatTurun} • {surahDetail.jumlahAyat} Ayat
                      </span>
                    </div>
                    <h1 className="text-2xl font-black tracking-tight">{surahDetail.namaLatin}</h1>
                    <p className="text-xs text-purple-200 mt-0.5">Arti: {surahDetail.arti}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-serif font-bold text-amber-200" dir="rtl">
                      {surahDetail.nama}
                    </span>
                  </div>
                </div>

                {/* Reciter Audio Control Bar */}
                <div className="relative z-10 mt-5 pt-4 border-t border-white/15 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-amber-300 shrink-0" />
                    <span className="text-purple-200 font-medium text-[11px]">Qari:</span>
                    <select
                      value={selectedReciter}
                      onChange={(e) => {
                        stopAudio()
                        setSelectedReciter(e.target.value)
                      }}
                      className="bg-white/15 hover:bg-white/20 text-white border border-white/25 rounded-xl px-2.5 py-1 text-xs outline-none focus:ring-2 focus:ring-amber-300 transition"
                    >
                      {QURAN_RECITERS.map((r) => (
                        <option key={r.id} value={r.id} className="text-gray-900 bg-white">
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    {surahDetail.audioFull && surahDetail.audioFull[selectedReciter] && (
                      <button
                        type="button"
                        onClick={() => {
                          const url = surahDetail.audioFull?.[selectedReciter]
                          if (url) playAudioUrl(url, { type: 'surah' })
                        }}
                        disabled={audioLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-amber-950 font-bold rounded-xl transition shadow-xs disabled:opacity-50"
                      >
                        {isPlayingAudio && playingTarget?.type === 'surah' ? (
                          <>
                            <Pause className="w-3.5 h-3.5" />
                            <span>Jeda Surah</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Putar Surah</span>
                          </>
                        )}
                      </button>
                    )}

                    {isPlayingAudio && (
                      <button
                        type="button"
                        onClick={stopAudio}
                        className="p-1.5 bg-white/15 hover:bg-white/25 text-white rounded-xl transition"
                        title="Hentikan Audio"
                      >
                        <Square className="w-3.5 h-3.5 fill-current" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Audio Error Alert */}
              {audioError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-xs text-red-700 font-semibold">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{audioError}</span>
                  </div>
                  <button onClick={() => setAudioError(null)} className="text-red-500 hover:text-red-700 text-xs font-bold">
                    Tutup
                  </button>
                </div>
              )}

              {/* Bismillah Banner for surahs other than Al-Fatihah (1) and At-Taubah (9) */}
              {surahDetail.nomor !== 1 && surahDetail.nomor !== 9 && (
                <div className="bg-amber-50/70 border border-amber-200/60 p-4 rounded-2xl text-center shadow-xs">
                  <p className="text-2xl font-serif text-amber-950 leading-relaxed" dir="rtl">
                    بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ
                  </p>
                  <p className="text-[11px] text-amber-800 font-medium mt-1">
                    Dengan nama Allah Yang Maha Pengasih, Maha Penyayang
                  </p>
                </div>
              )}

              {/* Ayah-by-Ayah Cards */}
              <div className="space-y-4">
                {surahDetail.ayat.map((ayah) => (
                  <div
                    key={ayah.nomorAyat}
                    id={`ayah-${ayah.nomorAyat}`}
                    className={`bg-white p-5 rounded-2xl border shadow-xs transition space-y-4 ${
                      isPlayingAudio && playingTarget?.type === 'ayah' && playingTarget.ayahNumber === ayah.nomorAyat
                        ? 'border-[#4B21A2] ring-2 ring-purple-100 bg-purple-50/20'
                        : 'border-gray-100 hover:border-purple-200'
                    }`}
                  >
                    {/* Header bar of Ayah card */}
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-xl bg-purple-50 text-[#4B21A2] font-black text-xs flex items-center justify-center border border-purple-100 shadow-xs">
                          {ayah.nomorAyat}
                        </span>
                        <span className="text-[11px] text-gray-500 font-semibold">
                          QS. {surahDetail.namaLatin}:{ayah.nomorAyat}
                        </span>
                      </div>

                      {ayah.audio && ayah.audio[selectedReciter] && (
                        <button
                          type="button"
                          onClick={() => {
                            const url = ayah.audio?.[selectedReciter]
                            if (url) playAudioUrl(url, { type: 'ayah', ayahNumber: ayah.nomorAyat })
                          }}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition ${
                            isPlayingAudio && playingTarget?.type === 'ayah' && playingTarget.ayahNumber === ayah.nomorAyat
                              ? 'bg-[#4B21A2] text-white shadow-xs'
                              : 'bg-purple-50 text-[#4B21A2] hover:bg-purple-100'
                          }`}
                          title={`Putar Ayat ${ayah.nomorAyat}`}
                        >
                          {isPlayingAudio && playingTarget?.type === 'ayah' && playingTarget.ayahNumber === ayah.nomorAyat ? (
                            <>
                              <Pause className="w-3 h-3" />
                              <span className="text-[11px]">Memutar</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3 fill-current" />
                              <span className="text-[11px]">Putar</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Arabic Text */}
                    <div className="text-right py-2" dir="rtl">
                      <p className="text-2xl sm:text-3xl font-serif text-gray-900 leading-[2.5] tracking-wide">
                        {ayah.teksArab}
                      </p>
                    </div>

                    {/* Transliteration */}
                    <div className="pt-1">
                      <p className="text-xs text-[#4B21A2] font-medium leading-relaxed italic">
                        {ayah.teksLatin}
                      </p>
                    </div>

                    {/* Indonesian Translation */}
                    <div className="pt-1 text-gray-700 text-xs sm:text-sm leading-relaxed border-t border-gray-50">
                      {ayah.teksIndonesia}
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Quick Navigation */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <button
                  onClick={handlePrevSurah}
                  disabled={activeSurahNumber <= 1}
                  className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-50 disabled:opacity-40 transition flex items-center gap-1.5"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Surah Sebelumnya</span>
                </button>
                <button
                  onClick={handleNextSurah}
                  disabled={activeSurahNumber >= 114}
                  className="px-4 py-2 bg-[#4B21A2] text-white text-xs font-bold rounded-xl hover:bg-[#3B1782] disabled:opacity-40 transition flex items-center gap-1.5"
                >
                  <span>Surah Berikutnya</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Surah List View */
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-br from-[#4B21A2] to-[#341378] text-white p-6 rounded-3xl shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-amber-300">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Mushaf Al-Qur'an Santri</h1>
                <p className="text-xs text-purple-200">Baca dan muraja'ah 114 surah dengan mudah</p>
              </div>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama surah atau nomor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-400 focus:border-transparent transition"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400 shrink-0" />
              <select
                value={selectedJuz}
                onChange={(e) => setSelectedJuz(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="w-full sm:w-auto px-3 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-400 transition font-medium"
              >
                <option value="all">Semua Juz (1-30)</option>
                {Array.from({ length: 30 }, (_, i) => i + 1).map((juz) => (
                  <option key={juz} value={juz}>
                    Juz {juz}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Surahs Grid */}
          {filteredSurahs.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-gray-100 text-center">
              <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-700">Surah tidak ditemukan</p>
              <p className="text-xs text-gray-400 mt-1">Coba sesuaikan kata kunci pencarian atau filter Juz Anda</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredSurahs.map((surah) => (
                <button
                  key={surah.id}
                  onClick={() => handleSelectSurah(surah.number)}
                  className="bg-white p-4 rounded-2xl border border-gray-100 hover:border-[#4B21A2]/40 hover:shadow-md transition text-left flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-10 h-10 rounded-xl bg-purple-50 text-[#4B21A2] font-black text-xs flex items-center justify-center shrink-0 group-hover:bg-[#4B21A2] group-hover:text-white transition">
                      {surah.number}
                    </span>
                    <div className="truncate">
                      <div className="font-bold text-gray-900 text-sm group-hover:text-[#4B21A2] transition truncate">
                        {surah.name_latin}
                      </div>
                      <div className="text-[11px] text-gray-500 font-medium truncate">
                        {surah.name_translation || 'Al-Qur\'an'} • {surah.total_ayahs} Ayat
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-lg font-serif font-bold text-gray-800" dir="rtl">
                      {surah.name_arabic}
                    </span>
                    <div className="text-[10px] text-gray-400 font-medium">
                      Juz {surah.juz_start}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
