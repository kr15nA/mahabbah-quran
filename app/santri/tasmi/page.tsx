export const dynamic = 'force-dynamic'

import { requireAuth } from '@/lib/auth/rbac'
import { getMyTasmiHistory } from '@/lib/student-portal/tasmi'
import { Mic, User } from 'lucide-react'
import Link from 'next/link'

export default async function TasmiPage(props: {
  searchParams: Promise<{ page?: string }>
}) {
  const searchParams = await props.searchParams
  const { session } = await requireAuth()

  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1
  const limit = 20

  const history = await getMyTasmiHistory(session.userId, page, limit)

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <Mic className="w-6 h-6 text-rose-500" /> Riwayat Tasmi
        </h1>
        <p className="text-sm text-gray-500 mt-1">Catatan ujian tasmi formal Anda</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {history.items.length === 0 ? (
          <div className="p-8 text-center text-gray-500 italic">
            Belum ada riwayat Tasmi.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {history.items.map((row) => (
              <div key={row.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-gray-900">
                      {row.mode === 'SURAH' ? row.surahNameLatin : `Juz ${row.startJuz} - ${row.endJuz}`}
                    </h3>
                    <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10 uppercase">
                      {row.mode === 'SURAH' ? 'Surah' : 'Rentang Juz'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(row.sessionDate))}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                    <User className="w-3 h-3" />
                    <span>Penguji: {row.examinerName || '-'}</span>
                  </div>
                </div>
                
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 mt-2 sm:mt-0">
                  <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
                    row.status === 'PASSED' 
                      ? 'bg-green-50 text-green-700 ring-green-600/20' 
                      : 'bg-orange-50 text-orange-700 ring-orange-600/20'
                  }`}>
                    {row.status === 'PASSED' ? 'Lulus' : 'Perlu Ditinjau'}
                  </span>
                  
                  {row.score !== null && (
                    <div className="text-center sm:text-right mt-1">
                      <span className="text-xl font-bold text-gray-900">{row.score}</span>
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
              <Link href={`/santri/tasmi?page=${page - 1}`} className="px-3 py-1 text-sm bg-gray-50 border border-gray-200 rounded hover:bg-gray-100">
                Sebelumnya
              </Link>
            )}
            {page * limit < history.total && (
              <Link href={`/santri/tasmi?page=${page + 1}`} className="px-3 py-1 text-sm bg-gray-50 border border-gray-200 rounded hover:bg-gray-100">
                Selanjutnya
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
