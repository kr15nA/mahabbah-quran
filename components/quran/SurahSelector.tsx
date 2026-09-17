'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, ChevronDown, Check } from 'lucide-react'
import type { SurahRow } from '@/lib/db/queries/surahs'

interface SurahSelectorProps {
  surahs: SurahRow[]
  value: number
  onChange: (surahId: number) => void
  disabled?: boolean
  className?: string
}

export default function SurahSelector({
  surahs,
  value,
  onChange,
  disabled = false,
  className = ''
}: SurahSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedSurah = surahs.find((s) => s.id === value)

  const filteredSurahs = surahs.filter((s) => {
    if (!search) return true
    const term = search.toLowerCase()
    return (
      s.number.toString() === term ||
      s.name_latin.toLowerCase().includes(term)
    )
  })

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:border-[#FBBF24] focus:ring-1 focus:ring-[#FBBF24] disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
      >
        <span className="truncate">
          {selectedSurah
            ? `${selectedSurah.number} — ${selectedSurah.name_latin} (${selectedSurah.name_arabic})`
            : 'Pilih Surah'}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 flex flex-col overflow-hidden">
          <div className="p-2 border-b border-gray-100 flex-shrink-0 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              placeholder="Cari (misal: 1 atau Fatihah)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 border border-transparent rounded-lg focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#FBBF24] focus:border-[#FBBF24]"
            />
          </div>
          
          <div className="overflow-y-auto flex-1 p-1">
            {filteredSurahs.length === 0 ? (
              <div className="p-3 text-sm text-center text-gray-500">
                Surah tidak ditemukan
              </div>
            ) : (
              filteredSurahs.map((surah) => (
                <button
                  key={surah.id}
                  type="button"
                  onClick={() => {
                    onChange(surah.id)
                    setIsOpen(false)
                    setSearch('')
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left rounded-lg transition-colors ${
                    surah.id === value
                      ? 'bg-purple-50 text-[#4B21A2] font-semibold'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="truncate">
                    {surah.number} — {surah.name_latin} ({surah.name_arabic})
                  </span>
                  {surah.id === value && <Check className="w-4 h-4 flex-shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
