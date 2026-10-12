import { requireAuth } from '@/lib/auth/rbac'
import { getInstitutionSettings } from '@/lib/db/queries/settings'
import AdminPengaturanClient from './AdminPengaturanClient'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Pengaturan Sistem | Mahabbah Qur\'an',
}

export default async function AdminPengaturanPage() {
  const { session, role } = await requireAuth()

  if (role !== 'SUPER_ADMIN') {
    redirect('/admin/dashboard')
  }

  const settings = await getInstitutionSettings()

  return <AdminPengaturanClient settings={settings} />
}
