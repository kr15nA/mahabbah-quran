'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useState, useCallback, useTransition } from 'react'
import { Search, ChevronLeft, ChevronRight, Star } from 'lucide-react'
import type { SearchTahsinRow } from '@/lib/db/queries/tahsin'

function formatDate(dateStr: string | Date) {
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function TahsinClient({
  data,
  total,
  page,
  limit,
  search: initialSearch
}: {
  data: SearchTahsinRow[]
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
          <h3 className="font-bold text-gray-900 text-sm">Penilaian Tahsin & Tajwid</h3>
          <p className="text-xs text-gray-500">Evaluasi 4 dimensi kualitas bacaan santri (Read-only)</p>
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
          <table className="w-full text-left border-collapse text-xs whitespace-nowrap min-w-[800px]">
            <thead>
              <tr className="bg-[#F0EDF9] text-gray-500 font-bold border-b border-gray-200">
                <th className="p-3.5 px-4">Santri</th>
                <th className="p-3.5">Kelas</th>
                <th className="p-3.5 text-center">Makhraj</th>
                <th className="p-3.5 text-center">Tajwid</th>
                <th className="p-3.5 text-center">Kelancaran</th>
                <th className="p-3.5 text-center">Ghunnah</th>
                <th className="p-3.5">Guru</th>
                <th className="p-3.5 px-4">Tanggal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-800">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500">
                    Data tahsin tidak ditemukan.
                  </td>
                </tr>
              ) : (
                data.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors even:bg-gray-50/50 odd:bg-white">
                    <td className="p-3.5 px-4 font-bold text-gray-900">{r.student_name}</td>
                    <td className="p-3.5 text-gray-600">{r.class_name}</td>
                    
                    <td className="p-3.5 text-center">
                      <div className="inline-flex items-center gap-1 bg-[#F0EDF9] px-2 py-1 rounded-lg font-bold text-[#4B21A2]">
                        {r.makhraj_score ?? '-'} <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      </div>
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="inline-flex items-center gap-1 bg-[#F0EDF9] px-2 py-1 rounded-lg font-bold text-[#4B21A2]">
                        {r.tajwid_score ?? '-'} <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      </div>
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="inline-flex items-center gap-1 bg-[#F0EDF9] px-2 py-1 rounded-lg font-bold text-[#4B21A2]">
                        {r.kelancaran_score ?? '-'} <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      </div>
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="inline-flex items-center gap-1 bg-[#F0EDF9] px-2 py-1 rounded-lg font-bold text-[#4B21A2]">
                        {r.ghunnah_score ?? '-'} <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      </div>
                    </td>

                    <td className="p-3.5 text-gray-600">{r.teacher_name}</td>
                    <td className="p-3.5 px-4 text-gray-500">{formatDate(r.session_date)}</td>
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
