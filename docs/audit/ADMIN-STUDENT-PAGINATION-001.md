# ADMIN-STUDENT-PAGINATION-001

## Root Cause
The `useEffect` hook in `app/admin/santri/StudentTableClient.tsx` that debounces the `search` input depends on `searchParams`. Whenever the URL changes (e.g., when the user clicks a pagination button and the `page` param updates), `searchParams` changes. This triggers the `useEffect` again, which pushes a new URL where `page` is reset to `1`. This causes any page navigation to revert to page 1 after 500ms.

## Old Behavior
- Any change to the URL triggered the search debounce `useEffect`, which forcibly appended `page=1` to the URL.
- No `page_size` option available.

## New URL Contract
- **page:** The current page number (integer, >= 1, default 1).
- **page_size:** The number of items per page (10, 30, 50, or 100).

## Page-Size Options
- 10 (proposed default)
- 30
- 50
- 100

## Validation
- The server will parse `page` and fallback to 1 if invalid or < 1.
- The server will parse `page_size` and fallback to the default (10) if not in the allowed list [10, 30, 50, 100].
- If `page` requests an out-of-range value (e.g., page 99 when there are only 5 pages), the UI will show 0 results safely without crashing. 

## Server Query & Sorting
- Current limit/offset: Uses `LIMIT ${limit} OFFSET ${offset}` properly in the database.
- Count Query Consistency: The `searchStudents` query uses `COUNT(*) OVER()` with the exact same predicates.
- Current Ordering: `ORDER BY s.full_name`
- Proposed Stable Ordering: `ORDER BY s.full_name ASC, s.id ASC`

## Tests & Migration
- Will create `scripts/test-admin-student-pagination-001.ts`.
- Migration: NONE
- Guardian Explorer: NO
