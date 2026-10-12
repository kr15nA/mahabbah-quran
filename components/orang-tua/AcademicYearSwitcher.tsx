'use client'

import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { Calendar } from 'lucide-react'

export type AcademicYearOption = {
  id: number
  name: string
  isActive: boolean
}

type AcademicYearSwitcherProps = {
  academicYears: AcademicYearOption[]
  selectedYearId: number
}

export default function AcademicYearSwitcher({
  academicYears,
  selectedYearId,
}: AcademicYearSwitcherProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  if (academicYears.length <= 1) {
    return null
  }

  const handleYearChange = (yearIdStr: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('academic_year_id', yearIdStr)
    // Clear specific month filter when switching academic years so it resets to the new year's context
    params.delete('month')
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-2xl border border-gray-200 shadow-xs">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 shrink-0">
        <Calendar className="w-3.5 h-3.5 text-purple-700" />
        <span className="hidden sm:inline">Tahun Ajaran:</span>
      </div>
      <select
        value={selectedYearId}
        onChange={(e) => handleYearChange(e.target.value)}
        className="text-xs font-bold text-gray-900 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-600 cursor-pointer flex-1"
        aria-label="Pilih Tahun Ajaran"
      >
        {academicYears.map((ay) => (
          <option key={ay.id} value={ay.id}>
            {ay.name} {ay.isActive ? '(Aktif)' : '(Arsip)'}
          </option>
        ))}
      </select>
    </div>
  )
}
