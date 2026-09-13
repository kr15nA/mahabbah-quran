'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  limit: number
}

export default function Pagination({ currentPage, totalPages, totalItems, limit }: PaginationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', page.toString())
    router.push(`${pathname}?${params.toString()}`)
  }

  const startIdx = Math.min((currentPage - 1) * limit + 1, totalItems)
  const endIdx = Math.min(currentPage * limit, totalItems)

  if (totalItems === 0) return null

  return (
    <div className="p-4 border-t border-gray-200 flex justify-between items-center text-xs text-gray-500">
      <span>
        Menampilkan {startIdx}–{endIdx} dari {totalItems} data
      </span>
      <div className="flex gap-1.5" aria-label="Pagination">
        <button
          disabled={currentPage <= 1}
          onClick={() => handlePageChange(currentPage - 1)}
          className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
          aria-label="Halaman Sebelumnya"
        >
          ← Prev
        </button>
        
        <div className="hidden md:flex gap-1.5">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => handlePageChange(p)}
              className={`w-8 h-8 rounded-lg font-bold transition-colors ${
                p === currentPage
                  ? 'bg-[#4B21A2] text-white'
                  : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
              aria-current={p === currentPage ? 'page' : undefined}
            >
              {p}
            </button>
          ))}
        </div>

        <button
          disabled={currentPage >= totalPages}
          onClick={() => handlePageChange(currentPage + 1)}
          className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition-colors"
          aria-label="Halaman Berikutnya"
        >
          Next →
        </button>
      </div>
    </div>
  )
}
