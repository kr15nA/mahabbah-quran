/**
 * Service for canonical Al-Qur'an text retrieval.
 * Data source assumption: Open canonical dataset via equran.id API v2 (vetted in QURAN-SURAH-MASTER-001 audit).
 * Fallback and revalidation: HTTP caching with 30-day revalidation for immutable scripture text.
 */

export interface QuranAyah {
  nomorAyat: number
  teksArab: string
  teksLatin: string
  teksIndonesia: string
}

export interface QuranSurahDetail {
  nomor: number
  nama: string
  namaLatin: string
  jumlahAyat: number
  tempatTurun: string
  arti: string
  deskripsi: string
  ayat: QuranAyah[]
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

    return json.data as QuranSurahDetail
  } catch (error) {
    console.error(`[getCanonicalSurahDetail] Network or parsing error for surah #${num}:`, error)
    return null
  }
}
