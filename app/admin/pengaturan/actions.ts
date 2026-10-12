'use server'

import { revalidatePath } from 'next/cache'
import { requireAuth } from '@/lib/auth/rbac'
import { updateInstitutionSettings } from '@/lib/db/queries/settings'

export async function saveInstitutionSettingsAction(formData: FormData) {
  try {
    const auth = await requireAuth()
    if (auth.role !== 'SUPER_ADMIN') {
      return { success: false, error: 'Akses ditolak: Hanya administrator yang dapat mengubah pengaturan yayasan' }
    }

    const institutionName = (formData.get('institutionName') as string)?.trim()
    const shortName = (formData.get('shortName') as string)?.trim() || undefined
    const address = (formData.get('address') as string)?.trim() || undefined
    const phone = (formData.get('phone') as string)?.trim() || undefined
    const email = (formData.get('email') as string)?.trim() || undefined
    const minAttendancePctRaw = formData.get('minAttendancePct') as string
    const dailyReportSchedule = (formData.get('dailyReportSchedule') as string)?.trim() || '16:30'

    if (!institutionName) {
      return { success: false, error: 'Nama yayasan / lembaga wajib diisi' }
    }

    const minAttendancePct = parseInt(minAttendancePctRaw, 10)
    if (isNaN(minAttendancePct) || minAttendancePct < 1 || minAttendancePct > 100) {
      return { success: false, error: 'Ambang batas kehadiran harus berupa angka 1 - 100%' }
    }

    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(dailyReportSchedule)) {
      return { success: false, error: 'Format jadwal laporan harian harus HH:MM valid 24 jam (contoh: 16:30)' }
    }

    await updateInstitutionSettings(
      {
        institutionName,
        shortName,
        address,
        phone,
        email,
        minAttendancePct,
        dailyReportSchedule,
      },
      auth.session.userId
    )

    revalidatePath('/admin/pengaturan')
    return { success: true }
  } catch (error: any) {
    console.error('saveInstitutionSettingsAction error:', error)
    return { success: false, error: error.message || 'Gagal menyimpan pengaturan' }
  }
}
