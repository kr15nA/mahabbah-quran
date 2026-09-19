/**
 * Test-only export of the date overlap logic.
 * This module exists purely for unit testing the overlap algorithm
 * without going through the full database transaction layer.
 *
 * The actual overlap logic lives in awards.ts (datesOverlap function).
 * Keeping it in sync is the responsibility of the test author.
 */

/**
 * Checks whether two date intervals [aStart, aEnd] and [bStart, bEnd] overlap.
 * endDate is INCLUSIVE. A null end means "open-ended" (no end).
 *
 * Two intervals are non-overlapping if one ends strictly before the other starts.
 * Otherwise they overlap.
 */
export function datesOverlapTest(
  aStart: string,
  aEnd: string | null | undefined,
  bStart: string,
  bEnd: string | null | undefined
): boolean {
  // aEnd < bStart => no overlap
  if (aEnd && aEnd < bStart) return false
  // bEnd < aStart => no overlap
  if (bEnd && bEnd < aStart) return false
  // All other cases: overlap
  return true
}
