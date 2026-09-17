# Audit: QURAN-SURAH-MASTER-001

## Database State
- **Previous state**: 38 Surahs (partially seeded)
- **Final dev state**: 114 Surahs (complete)
- **Production state**: Untouched (pending rollout)

## Canonical Source
- **Source**: `equran.id` API (v2)
- **Dataset Strategy**: To ensure deterministic and offline-safe seeds, the required metadata was downloaded, verified, and saved to `scripts/data/canonical-surahs.json`. The seed script reads from this local artifact rather than depending on a live API response.

## Idempotency & ID Preservation
- The seed uses `ON CONFLICT (number) DO UPDATE`, which ensures that re-running the seed safely updates metadata without deleting or regenerating the surrogate primary keys (`id`).
- All 26 historical Hafalan records remained intact. There are 0 orphan records.

## Data Validation
- **Server-side Validation**: A central `validateSurahAyahRange` function ensures that any `POST /api/hafalan` request validates the Surah existence and Ayah boundaries against canonical limits (e.g. Al-Baqarah max 286). 
- **Client UI**: `GuruHafalanClient` bounds inputs automatically based on the selected Surah.
- **Searchable Selector**: Not yet implemented. We are currently using a native `<select>` element.

## Juz Boundaries
- Since the canonical source did not strictly provide juz offsets, a deterministic `juzMapping` array was preserved in the seed script to map the standard 30 Juz boundaries.

## Tahsin Context
- Tahsin schema and forms were intentionally left unchanged per instructions, remaining a session-based reading evaluation. No Surah/Ayah columns were added.

## Testing
- `test-quran-surah-master-001.ts` successfully passes all constraints (114 count, exact canonical numbers, edge-case validation limits).
- Academic Attendance regression passed successfully.
