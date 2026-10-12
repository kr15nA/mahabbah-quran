import { requireAuth } from '@/lib/auth/rbac'
import { getAuditLogs, countAuditLogs, GetAuditLogsFilters } from '@/lib/db/queries/audit-logs'
import AdminAuditLogsClient from './AdminAuditLogsClient'
import { ShieldAlert, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Jejak Audit Sistem | Mahabbah Qur\'an',
}

interface PageProps {
  searchParams: Promise<{
    page?: string
    limit?: string
    action?: string
    entityType?: string
    actorUserId?: string
    entityId?: string
  }>
}

export default async function AdminAuditLogsPage({ searchParams }: PageProps) {
  const { session, role } = await requireAuth()

  // Authoritative server-side authorization check per existing policy
  if (role !== 'SUPER_ADMIN') {
    return (
      <div className="max-w-2xl mx-auto p-6 mt-12 bg-white rounded-2xl border border-rose-200 text-center shadow-sm space-y-4">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Akses Dibatasi</h2>
        <p className="text-xs text-gray-600 max-w-md mx-auto">
          Halaman Jejak Audit (Audit Trail) berisi rekaman mutasi sensitif tingkat sistem dan hanya dapat diakses secara resmi oleh peran <strong>SUPER_ADMIN</strong>.
        </p>
        <div>
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Dashboard Admin
          </Link>
        </div>
      </div>
    )
  }

  const resolvedParams = await searchParams
  const page = Math.max(1, parseInt(resolvedParams.page || '1', 10) || 1)
  const limit = Math.min(100, Math.max(10, parseInt(resolvedParams.limit || '25', 10) || 25))
  const offset = (page - 1) * limit

  const filters: GetAuditLogsFilters = {
    limit,
    offset,
  }

  if (resolvedParams.action) filters.action = resolvedParams.action
  if (resolvedParams.entityType) filters.entityType = resolvedParams.entityType
  if (resolvedParams.actorUserId) {
    const parsed = parseInt(resolvedParams.actorUserId, 10)
    if (!isNaN(parsed)) filters.actorUserId = parsed
  }
  if (resolvedParams.entityId) {
    const parsed = parseInt(resolvedParams.entityId, 10)
    if (!isNaN(parsed)) filters.entityId = parsed
  }

  const [logs, total] = await Promise.all([
    getAuditLogs(filters),
    countAuditLogs(filters),
  ])

  return (
    <AdminAuditLogsClient
      logs={logs}
      total={total}
      page={page}
      limit={limit}
      currentFilters={{
        action: resolvedParams.action,
        entityType: resolvedParams.entityType,
        actorUserId: resolvedParams.actorUserId,
        entityId: resolvedParams.entityId,
      }}
    />
  )
}
