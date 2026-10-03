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

import { getStudentTasmiSummary } from '@/lib/tasmi/list'
import { hasPermission } from '@/lib/auth/rbac'

export async function getTasmiSummaryAction(studentId: number) {
  try {
    const auth = await requireAuth()

    // Check tasmi permission silently
    const canManageTasmi = await hasPermission(auth.session, 'academic.tasmi.manage')
    if (!canManageTasmi) {
      return { success: true, authorized: false, data: [] }
    }

    // Still need student access
    await requireStudentAccess(studentId)

    const summary = await getStudentTasmiSummary(studentId)
    return { success: true, authorized: true, data: summary }
  } catch (error: any) {
    return { success: false, authorized: false, error: 'Gagal mengambil ringkasan Tasmi' }
  }
}

import { getSmartTahfizInsights } from '@/lib/tahfiz/smart-service'
import { consumeRateLimit } from '@/lib/security/rate-limit'
import { generateTahfizAdvisory } from '@/lib/ai/tahfiz'

export async function getGuruSmartInsightsAction(studentId: number) {
  try {
    const auth = await requireAuth()
    await requireStudentAccess(studentId)

    const insights = await getSmartTahfizInsights(studentId)

    // Guru gets everything including stalled and nextFocus
    return { success: true, data: insights }
  } catch (error: any) {
    return { success: false, error: 'Gagal memuat insight' }
  }
}

export async function generateGuruTahfizAiSummaryAction(studentId: number) {
  try {
    const auth = await requireAuth()
    await requireStudentAccess(studentId)

    const subject = String(auth.session.userId)
    const rateLimit = await consumeRateLimit({
      namespace: 'AI_TAHFIZ',
      subject: subject,
      limit: 5,
      windowSeconds: 60
    })

    if (!rateLimit.allowed) {
      return {
        success: false,
        rateLimited: true,
        retryAfterSeconds: rateLimit.retryAfterSeconds,
        error: 'Terlalu banyak permintaan. Coba lagi dalam beberapa saat.'
      }
    }

    const insights = await getSmartTahfizInsights(studentId)
    const facts = { ...insights, stalled: insights.isStalled }
    const aiResult = await generateTahfizAdvisory(facts)

    return { success: true, data: aiResult }
  } catch (error: any) {
    if (error.message && error.message.includes('Terlalu banyak permintaan')) {
      return { success: false, error: error.message, rateLimited: true }
    }
    return { success: false, error: 'Gagal membuat ringkasan AI: ' + (error.message || 'Error internal') }
  }
}
