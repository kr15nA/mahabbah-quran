import { formatTasmiTarget } from '@/lib/tasmi/formatters'

export function TasmiTargetBadge({
  mode,
  surahNameLatin,
  startJuz,
  endJuz
}: {
  mode: 'SURAH' | 'JUZ_RANGE'
  surahNameLatin?: string | null
  startJuz?: number | null
  endJuz?: number | null
}) {
  const formatted = formatTasmiTarget(mode, surahNameLatin, startJuz, endJuz)
  
  if (mode === 'SURAH') {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 whitespace-nowrap">
        {formatted}
      </span>
    )
  }

  return (
    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-[#4B21A2] whitespace-nowrap">
      {formatted}
    </span>
  )
}
