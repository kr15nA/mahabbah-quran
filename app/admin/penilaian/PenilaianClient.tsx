'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useState, useCallback, useTransition } from 'react'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import type { SearchPenilaianRow } from '@/lib/db/queries/learning-reports'

export default function PenilaianClient({
  data,
  total,
  page,
  limit,
  search: initialSearch
}: {
  data: SearchPenilaianRow[]
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
          <h3 className="font-bold text-gray-900 text-sm">Penilaian Kumulatif</h3>
          <p className="text-xs text-gray-500">Nilai gabungan hafalan, tahsin, dan adab santri (Read-only)</p>
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
                <th className="p-3.5">Kelas</th>
                <th className="p-3.5">Hafalan</th>
                <th className="p-3.5">Tahsin</th>
                <th className="p-3.5">Adab</th>
                <th className="p-3.5 px-4">Rata-rata Akhir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-800">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    Data penilaian tidak ditemukan.
                  </td>
                </tr>
              ) : (
                data.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="p-3.5 px-4 font-bold text-gray-900">{r.student_name}</td>
                    <td className="p-3.5 text-gray-600">{r.class_name}</td>
                    <td className="p-3.5 font-semibold text-[#4B21A2]">{r.hafalan_score ?? '-'}/100</td>
                    <td className="p-3.5 font-semibold text-[#7B4BD6]">{r.tahsin_score ?? '-'}/100</td>
                    <td className="p-3.5 font-semibold text-emerald-600">{r.adab_score ?? '-'}/100</td>
                    <td className="p-3.5 px-4">
                      {r.avg_score != null ? (
                        <span className="px-3 py-1 bg-amber-100 text-amber-900 font-extrabold rounded-lg text-xs">
                          {r.avg_score} / 100
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
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
            <span>Menampilkan {data.length} dari {total} data</span>
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
