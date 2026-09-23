export const dynamic = 'force-dynamic'

import { requireAuth } from '@/lib/auth/rbac'
import { getMyTahsinHistory } from '@/lib/student-portal/tahsin'
import { Star, User } from 'lucide-react'
import Link from 'next/link'

export default async function TahsinPage(props: {
  searchParams: Promise<{ page?: string }>
}) {
  const searchParams = await props.searchParams
  const { session } = await requireAuth()

  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1
  const limit = 20

  const history = await getMyTahsinHistory(session.userId, page, limit)

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <Star className="w-6 h-6 text-amber-500" /> Riwayat Tahsin
        </h1>
        <p className="text-sm text-gray-500 mt-1">Catatan evaluasi tahsin formal Anda</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {history.items.length === 0 ? (
          <div className="p-8 text-center text-gray-500 italic">
            Belum ada catatan tahsin.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {history.items.map((row) => (
              <div key={row.id} className="p-4 sm:p-6 flex flex-col sm:flex-row justify-between gap-6">
                <div className="space-y-2">
                  <p className="font-semibold text-gray-900">
                    {new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(row.session_date))}
                  </p>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <User className="w-4 h-4" />
                    <span>{row.teacher_name || 'Pengajar tidak tersedia'}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-grow sm:max-w-xl">
                  <div className="bg-amber-50 rounded-lg p-3 text-center border border-amber-100/50">
                    <p className="text-xs font-medium text-amber-800 uppercase tracking-wide">Makhraj</p>
                    <p className="text-xl font-bold text-amber-600 mt-1">{row.makhraj_score ?? '-'}</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3 text-center border border-amber-100/50">
                    <p className="text-xs font-medium text-amber-800 uppercase tracking-wide">Tajwid</p>
                    <p className="text-xl font-bold text-amber-600 mt-1">{row.tajwid_score ?? '-'}</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3 text-center border border-amber-100/50">
                    <p className="text-xs font-medium text-amber-800 uppercase tracking-wide">Lancar</p>
                    <p className="text-xl font-bold text-amber-600 mt-1">{row.kelancaran_score ?? '-'}</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3 text-center border border-amber-100/50">
                    <p className="text-xs font-medium text-amber-800 uppercase tracking-wide">Ghunnah</p>
                    <p className="text-xl font-bold text-amber-600 mt-1">{row.ghunnah_score ?? '-'}</p>
                  </div>
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
              <Link href={`/santri/tahsin?page=${page - 1}`} className="px-3 py-1 text-sm bg-gray-50 border border-gray-200 rounded hover:bg-gray-100">
                Sebelumnya
              </Link>
            )}
            {page * limit < history.total && (
              <Link href={`/santri/tahsin?page=${page + 1}`} className="px-3 py-1 text-sm bg-gray-50 border border-gray-200 rounded hover:bg-gray-100">
                Selanjutnya
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
