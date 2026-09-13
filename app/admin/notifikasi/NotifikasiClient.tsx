'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useState, useCallback, useTransition } from 'react'
import { Bell, Check, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import type { NotificationRow } from '@/lib/db/queries/notifications'

function formatDateTime(dateStr: string | Date) {
  const d = new Date(dateStr)
  const time = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  const date = d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })
  return { time, date }
}

export default function NotifikasiClient({
  data,
  total,
  page,
  limit,
  search: initialSearch,
  status: initialStatus
}: {
  data: NotificationRow[]
  total: number
  page: number
  limit: number
  search: string
  status: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  
  const [searchTerm, setSearchTerm] = useState(initialSearch)
  const [markingAll, setMarkingAll] = useState(false)

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
      params.set('page', '1')
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    startTransition(() => {
      let params = new URLSearchParams(searchParams.toString())
      if (val === 'all') {
        params.delete('status')
      } else {
        params.set('status', val)
      }
      params.set('page', '1')
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  const markAllRead = async () => {
    if (markingAll) return
    setMarkingAll(true)
    try {
      const res = await fetch('/api/notifications', { method: 'PATCH' })
      if (res.ok) {
        router.refresh()
      }
    } catch (err) {
      console.error(err)
    } finally {
      setMarkingAll(false)
    }
  }

  const markSingleRead = async (id: number) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
      if (res.ok) {
        router.refresh()
      }
    } catch (err) {
      console.error(err)
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-4 pb-10">
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h3 className="font-bold text-gray-900 text-sm">Pusat Notifikasi</h3>
          <p className="text-xs text-gray-500">Pemberitahuan sistem & pengingat aktivitas</p>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
          <form onSubmit={handleSearch} className="relative w-full md:w-56">
            <input
              type="text"
              placeholder="Cari notifikasi..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#4B21A2]/20 focus:border-[#4B21A2] transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </form>

          <select 
            value={initialStatus}
            onChange={handleStatusChange}
            className="w-full md:w-auto bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 outline-none focus:border-[#4B21A2]"
          >
            <option value="all">Semua Status</option>
            <option value="unread">Belum Dibaca</option>
            <option value="read">Sudah Dibaca</option>
          </select>

          <button 
            onClick={markAllRead}
            disabled={markingAll}
            className="w-full md:w-auto text-xs text-[#4B21A2] bg-purple-50 px-3 py-2 rounded-xl font-semibold hover:bg-purple-100 transition flex items-center justify-center gap-1 whitespace-nowrap disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5" /> 
            {markingAll ? 'Menandai...' : 'Tandai Semua Dibaca'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100 relative">
        {isPending && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-start justify-center pt-20 z-10 rounded-2xl">
            <div className="w-6 h-6 border-2 border-[#4B21A2] border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {data.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-xs">
            Tidak ada notifikasi yang ditemukan.
          </div>
        ) : (
          data.map((n) => {
            const { time, date } = formatDateTime(n.created_at)
            return (
              <div 
                key={n.id} 
                onClick={() => { if (!n.is_read) markSingleRead(n.id) }}
                className={`p-4 flex gap-3.5 items-start transition-colors ${
                  n.is_read ? 'opacity-70 bg-white hover:bg-gray-50 cursor-default' : 'bg-blue-50/30 hover:bg-blue-50/50 cursor-pointer'
                }`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  n.is_read ? 'bg-gray-100 text-gray-400' : 'bg-[#F0EDF9] text-[#4B21A2]'
                }`}>
                  <Bell className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-1 md:gap-0">
                    <h4 className={`text-xs ${n.is_read ? 'font-semibold text-gray-700' : 'font-bold text-gray-900'}`}>
                      {n.title}
                    </h4>
                    <span className="text-[10px] text-gray-400 whitespace-nowrap">
                      {time} · {date}
                    </span>
                  </div>
                  <p className={`text-xs mt-0.5 ${n.is_read ? 'text-gray-500' : 'text-gray-700 font-medium'}`}>
                    {n.body}
                  </p>
                </div>
                {!n.is_read && (
                  <div className="w-2 h-2 rounded-full bg-[#4B21A2] mt-1.5 flex-shrink-0"></div>
                )}
              </div>
            )
          })
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-3 flex items-center justify-between text-xs text-gray-500 bg-gray-50 rounded-b-2xl">
            <span>Menampilkan {data.length} dari {total} notifikasi</span>
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
