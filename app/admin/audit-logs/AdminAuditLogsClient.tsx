'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import {
  History,
  Shield,
  Search,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  X,
  FileCode,
  Tag,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react'
import type { AuditLogWithActor } from '@/lib/db/queries/audit-logs'

function formatDate(date: Date | string) {
  return new Date(date).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function getActionBadge(action: string) {
  const norm = action.toUpperCase()
  if (norm === 'CREATE') {
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">CREATE</span>
  }
  if (norm === 'UPDATE') {
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">UPDATE</span>
  }
  if (norm === 'DELETE' || norm === 'ARCHIVE') {
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">{norm}</span>
  }
  if (norm === 'ACTIVATE') {
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800">ACTIVATE</span>
  }
  if (norm === 'DEACTIVATE') {
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">DEACTIVATE</span>
  }
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-800">{norm}</span>
}

export default function AdminAuditLogsClient({
  logs,
  total,
  page,
  limit,
  currentFilters,
}: {
  logs: AuditLogWithActor[]
  total: number
  page: number
  limit: number
  currentFilters: {
    action?: string
    entityType?: string
    actorUserId?: string
    entityId?: string
  }
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [selectedLog, setSelectedLog] = useState<AuditLogWithActor | null>(null)

  const [actionFilter, setActionFilter] = useState(currentFilters.action || '')
  const [entityTypeFilter, setEntityTypeFilter] = useState(currentFilters.entityType || '')
  const [actorUserIdFilter, setActorUserIdFilter] = useState(currentFilters.actorUserId || '')
  const [entityIdFilter, setEntityIdFilter] = useState(currentFilters.entityId || '')

  const totalPages = Math.ceil(total / limit) || 1

  const applyFilters = (newPage = 1) => {
    const params = new URLSearchParams()
    if (actionFilter) params.set('action', actionFilter)
    if (entityTypeFilter) params.set('entityType', entityTypeFilter)
    if (actorUserIdFilter) params.set('actorUserId', actorUserIdFilter)
    if (entityIdFilter) params.set('entityId', entityIdFilter)
    if (newPage > 1) params.set('page', String(newPage))

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  const resetFilters = () => {
    setActionFilter('')
    setEntityTypeFilter('')
    setActorUserIdFilter('')
    setEntityIdFilter('')
    startTransition(() => {
      router.push(pathname)
    })
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full w-fit mb-1.5">
            <Shield className="w-3.5 h-3.5" />
            <span>Audit Trail & Tata Kelola Sistem</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Jejak Audit Administratif</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Log mutasi data sensitif, perubahan tahun ajaran, hak akses guru, dan penugasan kelas
          </p>
        </div>
        <div className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400" />
          <span>Total Tercatat: <strong className="text-gray-800">{total}</strong> mutasi</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
          <Filter className="w-3.5 h-3.5 text-purple-600" />
          <span>Filter Penelusuran</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Aksi (Action)</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-2.5 py-2 outline-none focus:ring-2 focus:ring-purple-600 bg-white"
            >
              <option value="">Semua Aksi</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="ACTIVATE">ACTIVATE</option>
              <option value="DEACTIVATE">DEACTIVATE</option>
              <option value="ARCHIVE">ARCHIVE</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Tipe Entitas</label>
            <select
              value={entityTypeFilter}
              onChange={(e) => setEntityTypeFilter(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-2.5 py-2 outline-none focus:ring-2 focus:ring-purple-600 bg-white"
            >
              <option value="">Semua Entitas</option>
              <option value="USER">USER</option>
              <option value="ACADEMIC_YEAR">ACADEMIC_YEAR</option>
              <option value="TEACHER_ASSIGNMENT">TEACHER_ASSIGNMENT</option>
              <option value="ENROLLMENT">ENROLLMENT</option>
              <option value="CLASS">CLASS</option>
              <option value="STUDENT">STUDENT</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">ID Pelaku (Actor ID)</label>
            <input
              type="number"
              placeholder="Contoh: 1"
              value={actorUserIdFilter}
              onChange={(e) => setActorUserIdFilter(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-2.5 py-2 outline-none focus:ring-2 focus:ring-purple-600"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">ID Entitas</label>
            <input
              type="number"
              placeholder="Contoh: 42"
              value={entityIdFilter}
              onChange={(e) => setEntityIdFilter(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-2.5 py-2 outline-none focus:ring-2 focus:ring-purple-600"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={resetFilters}
            className="px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition-colors"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => applyFilters(1)}
            disabled={isPending}
            className="px-4 py-1.5 rounded-xl bg-[#4B21A2] text-white text-xs font-bold hover:bg-[#3d1a84] transition-colors disabled:opacity-50"
          >
            {isPending ? 'Memuat...' : 'Terapkan Filter'}
          </button>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 uppercase tracking-wider text-[10px] font-bold">
              <tr>
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4">Pelaku (Actor)</th>
                <th className="py-3 px-4">Aksi</th>
                <th className="py-3 px-4">Entitas</th>
                <th className="py-3 px-4">ID Entitas</th>
                <th className="py-3 px-4 text-center">Detail Nilai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">
                    <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <span>Tidak ada catatan audit yang cocok dengan filter</span>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-purple-50/30 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-gray-600 font-mono text-[11px]">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-semibold text-gray-900">{log.actorName || 'Sistem / Anonim'}</div>
                      <div className="text-[10px] text-gray-400 font-mono">User ID: #{log.actorUserId ?? '-'}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-semibold text-gray-800">{log.entityType}</span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-gray-600">
                      #{log.entityId ?? '-'}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSelectedLog(log)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 font-semibold text-[11px] transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspeksi</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <div>
            Menampilkan halaman <strong className="text-gray-800">{page}</strong> dari <strong className="text-gray-800">{totalPages}</strong> (Total {total} baris)
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => applyFilters(page - 1)}
              disabled={page <= 1 || isPending}
              className="px-3 py-1.5 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Sebelumnya</span>
            </button>
            <button
              type="button"
              onClick={() => applyFilters(page + 1)}
              disabled={page >= totalPages || isPending}
              className="px-3 py-1.5 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <span>Selanjutnya</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Detail Inspection Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 px-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-purple-600" />
                <h3 className="font-bold text-sm text-gray-900">
                  Inspeksi Log Audit #{selectedLog.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-purple-50/50 p-3.5 rounded-xl border border-purple-100">
                <div>
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">Aksi</span>
                  <div className="mt-0.5">{getActionBadge(selectedLog.action)}</div>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">Entitas</span>
                  <span className="font-bold text-gray-900">{selectedLog.entityType} #{selectedLog.entityId ?? '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">Pelaku (Actor)</span>
                  <span className="font-bold text-gray-900">{selectedLog.actorName || 'User #' + selectedLog.actorUserId}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 uppercase font-bold block">Waktu</span>
                  <span className="font-mono text-gray-700">{formatDate(selectedLog.createdAt)}</span>
                </div>
              </div>

              {/* Old Values */}
              <div>
                <div className="font-bold text-gray-800 mb-1.5 flex items-center gap-1.5 text-xs">
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                  Nilai Sebelumnya (oldValues)
                </div>
                <div className="bg-gray-900 text-gray-100 p-3 rounded-xl font-mono text-[11px] overflow-x-auto max-h-48 border border-gray-800">
                  {selectedLog.oldValues && Object.keys(selectedLog.oldValues).length > 0 ? (
                    <pre>{JSON.stringify(selectedLog.oldValues, null, 2)}</pre>
                  ) : (
                    <span className="text-gray-500 italic">null (Entitas baru dibuat)</span>
                  )}
                </div>
              </div>

              {/* New Values */}
              <div>
                <div className="font-bold text-gray-800 mb-1.5 flex items-center gap-1.5 text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                  Nilai Sesudahnya (newValues)
                </div>
                <div className="bg-gray-900 text-gray-100 p-3 rounded-xl font-mono text-[11px] overflow-x-auto max-h-48 border border-gray-800">
                  {selectedLog.newValues && Object.keys(selectedLog.newValues).length > 0 ? (
                    <pre>{JSON.stringify(selectedLog.newValues, null, 2)}</pre>
                  ) : (
                    <span className="text-gray-500 italic">null (Entitas dihapus)</span>
                  )}
                </div>
              </div>

              {/* Metadata */}
              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <div className="font-bold text-gray-800 mb-1.5 flex items-center gap-1.5 text-xs">
                    <span className="w-2 h-2 rounded-full bg-purple-500 inline-block"></span>
                    Metadata Tambahan
                  </div>
                  <div className="bg-gray-900 text-gray-100 p-3 rounded-xl font-mono text-[11px] overflow-x-auto max-h-36 border border-gray-800">
                    <pre>{JSON.stringify(selectedLog.metadata, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 px-6 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 rounded-xl bg-gray-200 text-gray-700 font-semibold text-xs hover:bg-gray-300 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
