/**
 * Service for canonical Al-Qur'an text retrieval.
 * Data source assumption: Open canonical dataset via equran.id API v2 (vetted in QURAN-SURAH-MASTER-001 audit).
 * Fallback and revalidation: HTTP caching with 30-day revalidation for immutable scripture text.
 */

export const QURAN_RECITERS = [
  { id: '05', name: 'Misyari Rasyid Al-Afasi' },
  { id: '01', name: 'Abdullah Al-Juhany' },
  { id: '02', name: 'Abdul Muhsin Al-Qasim' },
  { id: '03', name: 'Abdurrahman as-Sudais' },
  { id: '04', name: 'Ibrahim Al-Dossari' },
  { id: '06', name: 'Yasser Al-Dosari' },
] as const

export type ReciterId = (typeof QURAN_RECITERS)[number]['id']

export interface QuranAyah {
  nomorAyat: number
  teksArab: string
  teksLatin: string
  teksIndonesia: string
  audio?: Record<string, string>
}

export interface QuranSurahDetail {
  nomor: number
  nama: string
  namaLatin: string
  jumlahAyat: number
  tempatTurun: string
  arti: string
  deskripsi: string
  audioFull?: Record<string, string>
  ayat: QuranAyah[]
}

function sanitizeAudioMap(raw: unknown): Record<string, string> | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const result: Record<string, string> = {}
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof val === 'string' && val.startsWith('https://')) {
      result[key] = val
    }
  }
  return Object.keys(result).length > 0 ? result : undefined
}

export async function getCanonicalSurahDetail(surahNumber: number): Promise<QuranSurahDetail | null> {
  const num = Number(surahNumber)
  if (!Number.isInteger(num) || num < 1 || num > 114) {
    return null
  }

  try {
    const res = await fetch(`https://equran.id/api/v2/surat/${num}`, {
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 86400 * 30 }, // 30-day cache
    })

    if (!res.ok) {
      return null
    }

    const json = await res.json()
    if (json.code !== 200 || !json.data || !Array.isArray(json.data.ayat)) {
      return null
    }

    const sanitizedAudioFull = sanitizeAudioMap(json.data.audioFull)
    const sanitizedAyat: QuranAyah[] = json.data.ayat.map((a: any) => ({
      nomorAyat: Number(a.nomorAyat),
      teksArab: String(a.teksArab || ''),
      teksLatin: String(a.teksLatin || ''),
      teksIndonesia: String(a.teksIndonesia || ''),
      audio: sanitizeAudioMap(a.audio),
    }))

    return {
      nomor: Number(json.data.nomor),
      nama: String(json.data.nama || ''),
      namaLatin: String(json.data.namaLatin || ''),
      jumlahAyat: Number(json.data.jumlahAyat || 0),
      tempatTurun: String(json.data.tempatTurun || ''),
      arti: String(json.data.arti || ''),
      deskripsi: String(json.data.deskripsi || ''),
      audioFull: sanitizedAudioFull,
      ayat: sanitizedAyat,
    }
  } catch (error) {
    console.error(`[getCanonicalSurahDetail] Network or parsing error for surah #${num}:`, error)
    return null
  }
}
