export const dynamic = 'force-dynamic'

import { requireAuth } from '@/lib/auth/rbac'
import { getMyHafalanHistory } from '@/lib/student-portal/hafalan'
import { Bookmark, User } from 'lucide-react'
import Link from 'next/link'

export default async function HafalanPage(props: {
  searchParams: Promise<{ page?: string }>
}) {
  const searchParams = await props.searchParams
  const { session } = await requireAuth()

  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1
  const limit = 20

  const history = await getMyHafalanHistory(session.userId, page, limit)

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <Bookmark className="w-6 h-6 text-emerald-600" /> Riwayat Hafalan
        </h1>
        <p className="text-sm text-gray-500 mt-1">Catatan hafalan formal Anda</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {history.items.length === 0 ? (
          <div className="p-8 text-center text-gray-500 italic">
            Belum ada catatan hafalan.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {history.items.map((row) => (
              <div key={row.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-gray-900">{row.surah_name_latin}</h3>
                    <span className="text-sm font-medium text-gray-500">Ayat {row.ayah_start}-{row.ayah_end}</span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(row.session_date))}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                    <User className="w-3 h-3" />
                    <span>{row.teacher_name || 'Pengajar tidak tersedia'}</span>
                  </div>
                </div>
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2">
                  <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                    row.type === 'hafalan_baru' 
                      ? 'bg-blue-50 text-blue-700 ring-blue-600/20' 
                      : 'bg-purple-50 text-purple-700 ring-purple-600/20'
                  }`}>
                    {row.type === 'hafalan_baru' ? 'Hafalan Baru' : 'Muraja\'ah'}
                  </span>
                  {row.score !== null && (
                    <div className="text-center">
                      <span className="text-2xl font-bold text-emerald-600">{row.score}</span>
                      <span className="text-xs text-gray-500 ml-1">/100</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {history.total > limit && (
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">
            Menampilkan {history.items.length} dari {history.total} data
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={`/santri/hafalan?page=${page - 1}`} className="px-3 py-1 text-sm bg-gray-50 border border-gray-200 rounded hover:bg-gray-100">
                Sebelumnya
              </Link>
            )}
            {page * limit < history.total && (
              <Link href={`/santri/hafalan?page=${page + 1}`} className="px-3 py-1 text-sm bg-gray-50 border border-gray-200 rounded hover:bg-gray-100">
                Selanjutnya
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
