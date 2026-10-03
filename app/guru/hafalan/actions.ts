'use server'

import { requireAuth, requireStudentAccess } from '@/lib/auth/rbac'
import { getStudentTahfizCoverageQuery, getActiveTahfizTargetQuery } from '@/lib/db/queries/tahfiz'
import { createTahfizTarget, reviseTahfizTarget, completeTahfizTarget, cancelTahfizTarget } from '@/lib/tahfiz/service'
import { getActiveAcademicYear } from '@/lib/db/queries/academic-years'

export async function getTahfizDataAction(studentId: number) {
  try {
    const auth = await requireAuth()
    await requireStudentAccess(studentId)

    const [coverage, activeTarget] = await Promise.all([
      getStudentTahfizCoverageQuery(studentId),
      getActiveTahfizTargetQuery(studentId)
    ])

    return { success: true, data: { coverage, activeTarget } }
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal mengambil data tahfizh' }
  }
}

export async function createTahfizTargetAction(data: {
  studentId: number
  startSurahId: number
  startAyah: number
  endSurahId: number
  endAyah: number
}) {
  try {
    const auth = await requireAuth()
    await requireStudentAccess(data.studentId)

    const activeYear = await getActiveAcademicYear()
    if (!activeYear) throw new Error('No active academic year found')

    await createTahfizTarget({
      studentId: data.studentId,
      academicYearId: activeYear.id,
      startSurahId: data.startSurahId,
      startAyah: data.startAyah,
      endSurahId: data.endSurahId,
      endAyah: data.endAyah,
    }, auth)

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal membuat target' }
  }
}

export async function reviseTahfizTargetAction(targetId: number, data: {
  studentId: number
  startSurahId: number
  startAyah: number
  endSurahId: number
  endAyah: number
}) {
  try {
    const auth = await requireAuth()
    await requireStudentAccess(data.studentId)

    await reviseTahfizTarget(targetId, data, auth)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal merevisi target' }
  }
}

export async function completeTahfizTargetAction(targetId: number, studentId: number) {
  try {
    const auth = await requireAuth()
    await requireStudentAccess(studentId)

    await completeTahfizTarget(targetId, auth)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal menyelesaikan target' }
  }
}

export async function cancelTahfizTargetAction(targetId: number, studentId: number) {
  try {
    const auth = await requireAuth()
    await requireStudentAccess(studentId)

    await cancelTahfizTarget(targetId, auth)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal membatalkan target' }
  }
}
