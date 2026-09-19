export function formatTasmiTarget(
  mode: 'SURAH' | 'JUZ_RANGE',
  surahNameLatin: string | null | undefined,
  startJuz: number | null | undefined,
  endJuz: number | null | undefined
): string {
  if (mode === 'SURAH') {
    return surahNameLatin || 'Unknown Surah'
  }
  
  if (mode === 'JUZ_RANGE' && startJuz && endJuz) {
    const qty = endJuz - startJuz + 1
    if (startJuz === endJuz) {
      return `${qty} Juz • Juz ${startJuz}`
    }
    return `${qty} Juz • Juz ${startJuz}–${endJuz}`
  }

  return 'Unknown Target'
}
