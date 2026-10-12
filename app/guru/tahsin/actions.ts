'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth, requireStudentAccess } from '@/lib/auth/rbac'
import {
  insertTahsinRecord,
  getTahsinByStudent,
  getTahsinAverageByStudent,
} from '@/lib/db/queries/tahsin'

export type CreateTahsinInput = {
  studentId: number
  sessionDate: string
  makhrajScore: number
  tajwidScore: number
  kelancaranScore: number
  ghunnahScore: number
}

function isValidScore(val: number): boolean {
  return Number.isInteger(val) && val >= 1 && val <= 5
}

export async function createTahsinAction(input: CreateTahsinInput) {
  try {
    const auth = await requireAuth()
    if (auth.role !== 'GURU' && auth.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Akses ditolak: Hanya guru yang dapat mencatat tahsin' }
    }

    const studentId = Number(input.studentId)
    if (!studentId || isNaN(studentId)) {
      return { success: false, error: 'Santri wajib dipilih' }
    }

    // Authoritative server-side check: verify student belongs to teacher's assigned classes
    await requireStudentAccess(studentId)

    if (!input.sessionDate || !/^\d{4}-\d{2}-\d{2}$/.test(input.sessionDate)) {
      return { success: false, error: 'Tanggal evaluasi tidak valid (format YYYY-MM-DD)' }
    }

    const parsedDate = new Date(input.sessionDate)
    if (isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== input.sessionDate) {
      return { success: false, error: 'Tanggal evaluasi tidak valid' }
    }

    const makhraj = Number(input.makhrajScore)
    const tajwid = Number(input.tajwidScore)
    const kelancaran = Number(input.kelancaranScore)
    const ghunnah = Number(input.ghunnahScore)

    if (!isValidScore(makhraj) || !isValidScore(tajwid) || !isValidScore(kelancaran) || !isValidScore(ghunnah)) {
      return { success: false, error: 'Semua nilai (Makhraj, Tajwid, Kelancaran, Ghunnah) harus berupa angka 1-5' }
    }

    const newId = await insertTahsinRecord({
      student_id: studentId,
      teacher_id: auth.session.userId, // Authoritative: strictly from session, never client payload
      session_date: input.sessionDate,
      makhraj_score: makhraj,
      tajwid_score: tajwid,
      kelancaran_score: kelancaran,
      ghunnah_score: ghunnah,
    })

    revalidatePath('/guru/tahsin')
    return { success: true, id: newId }
  } catch (error: any) {
    console.error('createTahsinAction error:', error)
    return { success: false, error: error.message || 'Gagal menyimpan penilaian tahsin' }
  }
}

export async function getStudentTahsinHistoryAction(studentId: number) {
  try {
    await requireAuth()
    await requireStudentAccess(studentId)

    const [history, averages] = await Promise.all([
      getTahsinByStudent(studentId, 10),
      getTahsinAverageByStudent(studentId),
    ])

    return { success: true, history, averages }
  } catch (error: any) {
    console.error('getStudentTahsinHistoryAction error:', error)
    return { success: false, error: error.message || 'Gagal memuat riwayat tahsin santri' }
  }
}
