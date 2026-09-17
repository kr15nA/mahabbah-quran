import { SurahRow } from '@/lib/db/queries/surahs'

/**
 * Validates a Hafalan Ayah range against the canonical Surah metadata.
 * Returns an error string if invalid, or null if valid.
 */
export function validateSurahAyahRange(surah: SurahRow | null, ayahStart: number, ayahEnd: number): string | null {
  if (!surah) {
    return 'Surah not found in canonical master data.'
  }
  if (ayahStart < 1) {
    return 'Ayah start must be at least 1.'
  }
  if (ayahEnd < ayahStart) {
    return 'Ayah end cannot be less than ayah start.'
  }
  if (ayahEnd > surah.total_ayahs) {
    return `Ayah end (${ayahEnd}) exceeds the total ayahs for ${surah.name_latin} (${surah.total_ayahs}).`
  }
  return null // Valid
}
