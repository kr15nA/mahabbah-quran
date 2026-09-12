'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useState, useCallback, useTransition } from 'react'
import { Search, ChevronLeft, ChevronRight, CheckCircle, Clock } from 'lucide-react'
import type { SearchLaporanRow } from '@/lib/db/queries/learning-reports'

function formatDate(dateStr: string | Date) {
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function LaporanClient({
  data,
  total,
  page,
  limit,
  search: initialSearch
}: {
  data: SearchLaporanRow[]
  total: number
  page: number
  limit: number
  search: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  
  const [searchTerm, setSearchTerm] = useState(initialSearch)

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set(name, value)
      return params.toString()
    },
    [searchParams]
  )

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(() => {
      let params = new URLSearchParams(searchParams.toString())
      if (searchTerm) {
        params.set('search', searchTerm)
      } else {
        params.delete('search')
      }
      params.set('page', '1') // reset page on new search
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-4 pb-10">
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h3 className="font-bold text-gray-900 text-sm">Laporan Pembelajaran Santri</h3>
          <p className="text-xs text-gray-500">Daftar laporan harian (Read-only)</p>
        </div>
        <form onSubmit={handleSearch} className="relative w-full md:w-64">
          <input
            type="text"
            placeholder="Cari nama santri..."
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#4B21A2]/20 focus:border-[#4B21A2] transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </form>
      </div>

      {/* Summary section */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
          <p className="text-xs text-gray-500 font-medium">Total Laporan Sesuai Filter</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{total}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden relative">
        {isPending && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-10">
            <div className="w-6 h-6 border-2 border-[#4B21A2] border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs whitespace-nowrap min-w-[700px]">
            <thead>
              <tr className="bg-[#F0EDF9] text-gray-500 font-bold border-b border-gray-200">
                <th className="p-3.5 px-4">Santri</th>
                <th className="p-3.5">Guru</th>
                <th className="p-3.5">Tanggal</th>
                <th className="p-3.5">Hafalan</th>
                <th className="p-3.5">Nilai Hafalan</th>
                <th className="p-3.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-800">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    Data laporan tidak ditemukan.
                  </td>
                </tr>
              ) : (
                data.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="p-3.5 px-4 font-semibold text-gray-900">{r.student_name}</td>
                    <td className="p-3.5 text-gray-600">{r.teacher_name}</td>
                    <td className="p-3.5 text-gray-600">{formatDate(r.report_date)}</td>
                    <td className="p-3.5 font-medium text-[#4B21A2]">{r.surah_name_latin || '-'}</td>
                    <td className="p-3.5 font-bold text-emerald-600">{r.hafalan_score ?? '-'}/100</td>
                    <td className="p-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          r.status === 'sent' ? 'bg-purple-100 text-[#4B21A2]' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {r.status === 'sent' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {r.status === 'sent' ? 'Terkirim' : 'Draft'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 bg-gray-50">
            <span>Menampilkan {data.length} dari {total} laporan</span>
            <div className="flex gap-1">
              <button
                disabled={page <= 1 || isPending}
                onClick={() => {
                  startTransition(() => {
                    router.push(pathname + '?' + createQueryString('page', String(page - 1)))
                  })
                }}
                className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages || isPending}
                onClick={() => {
                  startTransition(() => {
                    router.push(pathname + '?' + createQueryString('page', String(page + 1)))
                  })
                }}
                className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
