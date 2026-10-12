'use server'

import { getSession } from '@/lib/auth/session'
import { verifyUserContext } from '@/lib/identity/contexts'
import { getCanonicalSurahDetail, QuranSurahDetail } from '@/lib/quran/service'

export interface GetSurahDetailResult {
  success: boolean
  data?: QuranSurahDetail
  error?: string
}

export async function getSurahDetailAction(surahNumber: number): Promise<GetSurahDetailResult> {
  const session = await getSession()
  if (!session) {
    return { success: false, error: 'Unauthorized' }
  }

  const isLearner = await verifyUserContext(session, 'learner')
  if (!isLearner) {
    return { success: false, error: 'Akses ditolak: Hanya santri yang dapat mengakses mushaf portal ini.' }
  }

  const num = Number(surahNumber)
  if (!Number.isInteger(num) || num < 1 || num > 114) {
    return { success: false, error: 'Nomor surah harus berupa angka bulat antara 1 dan 114.' }
  }

  const surahDetail = await getCanonicalSurahDetail(num)
  if (!surahDetail) {
    return { success: false, error: 'Gagal memuat ayat Al-Qur\'an. Silakan periksa koneksi internet dan coba lagi.' }
  }

  return { success: true, data: surahDetail }
}
