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
- **Searchable Selector**: Implemented `SurahSelector` component with canonical numbers and Latin names support, fully keyboard-accessible and mobile-friendly.

## Juz Boundaries
- Since the canonical source did not strictly provide juz offsets, a deterministic `juzMapping` array was preserved in the seed script to map the standard 30 Juz boundaries.
- **Provenance**: Verified against standard King Fahd / Madani Mushaf divisions via canonical metadata sources (Tanzil.net / Quran.com). Specific span spot checks (e.g. Al-Baqarah spans 1-3, Ya-Sin spans 22-23) pass exact verification.

## Tahsin Context
- Tahsin schema and forms were intentionally left unchanged per instructions, remaining a session-based reading evaluation. No Surah/Ayah columns were added.

## Testing
- `test-quran-surah-master-001.ts` successfully passes all constraints (114 count, exact canonical numbers, edge-case validation limits).
- Academic Attendance regression passed successfully.

## Production Release Info
- **Feature Final SHA**: `7781a80`
- **Main Release SHA**: `94842cf0183dbd576bc9393982b3492f1095c55a`
- **Production Deployment Status**: Ready
- **Production Pre-Seed Count**: 114
- **Production Post-Seed Count**: 114
- **Historical Hafalan Preservation**: PASS (26 records retained)
- **Orphan Count**: 0
- **Smoke Results**: HTTP 200 OK on `/login`, production Surah API secured behind auth.
- **Release Date**: 2026-09-17
