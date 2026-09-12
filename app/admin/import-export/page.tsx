import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/rbac'
import ImportExportClient from './ImportExportClient'

export const dynamic = 'force-dynamic'

export default async function ImportExportPage() {
  const { role } = await requireAuth()
  if (role !== 'SUPER_ADMIN') {
    redirect('/login')
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Import & Export Data</h1>
        <p className="text-sm text-gray-500 mt-1">Kelola data master sistem melalui file Excel.</p>
      </div>

      <ImportExportClient />
    </div>
  )
}
