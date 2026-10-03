export interface AyahRange {
  ayahStart: number;
  ayahEnd: number;
}

export function normalizeCoverageRanges(ranges: AyahRange[]): AyahRange[] {
  if (ranges.length === 0) return [];

  // Filter out invalid ranges just in case, though DB check enforces this
  const validRanges = ranges.filter(r => r.ayahStart >= 1 && r.ayahEnd >= r.ayahStart);
  if (validRanges.length === 0) return [];

  // Sort by start, then by end (ascending)
  validRanges.sort((a, b) => {
    if (a.ayahStart !== b.ayahStart) return a.ayahStart - b.ayahStart;
    return a.ayahEnd - b.ayahEnd;
  });

  const merged: AyahRange[] = [];
  let current = { ...validRanges[0] };

  for (let i = 1; i < validRanges.length; i++) {
    const next = validRanges[i];

    // If next range overlaps or is adjacent
    if (next.ayahStart <= current.ayahEnd + 1) {
      if (next.ayahEnd > current.ayahEnd) {
        current.ayahEnd = next.ayahEnd;
      }
    } else {
      merged.push(current);
      current = { ...next };
    }
  }
  
  merged.push(current);

  return merged;
}
