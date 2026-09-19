# ADMIN-STUDENT-PAGINATION-001

## Root Cause Fixed
The `useEffect` hook in `app/admin/santri/StudentTableClient.tsx` previously depended directly on `searchParams` to dispatch a new URL. This caused a feedback loop: whenever the page param changed, the effect fired and reset `page=1`. This was fixed by checking if the actual input `search` value differed from the URL parameter `search` before taking any action.

## URL Contract
- **page:** The current page number (integer, >= 1, default 1).
- **page_size:** The number of items per page (10, 30, 50, or 100). Defaults to 10.
- Changing `page_size` resets `page` to 1.
- Changing `page` preserves `page_size` and `search`.
- Changing `search` resets `page` to 1 but preserves `page_size`.

## Server Query & Architecture
- **Count/Data Query Architecture**: Refactored `searchStudents` in `lib/db/queries/students.ts` to execute two parallel queries (one for `COUNT`, one for data) using `Promise.all`. This safely calculates totals even if the offset is out of bounds, which fixes issues with `COUNT(*) OVER()`.
- **Shared Predicate**: The `WHERE` clause conditions are explicitly shared via a single SQL fragment string `conditions` to ensure exactly identical filters.
- **Stable Ordering**: Implemented `ORDER BY s.full_name ASC, s.id ASC` to prevent any non-deterministic jumping of records between pages.

## Out-of-Range Handling
- If the requested `page` exceeds the calculated `totalPages` (and total > 0), the server gracefully intercepts the request and issues a `redirect` back to the last valid page. It preserves all query parameters including filters, `search`, and `page_size`. 
- Zero-result searches (`total=0`) do not trigger a redirect loop.

## Test Validation & Preview
- Fully tested page size transitions, stable sorting, missing out-of-bounds offsets, and identical predicates in `scripts/test-admin-student-pagination-001.ts`.
- Validated on Vercel Preview across 375px, 768px, and 1280px without layout breakage.
- Migration: NONE.
- Production DB Mutated: NO.

## Production Release Info
- **Status:** RELEASED
- **Main Release SHA:** f8307b0
- **Production Deployed SHA:** f8307b0
- **Tag:** admin-student-pagination-v1.0.0
- **Production Smoke:** PASS
- **Page-size options:** 10, 30, 50, 100
- **Stable ordering:** ORDER BY full_name ASC, id ASC
- **Migration:** NONE
- **Production DB Mutated:** NO
- **Guardian B1 regression:** PASS
