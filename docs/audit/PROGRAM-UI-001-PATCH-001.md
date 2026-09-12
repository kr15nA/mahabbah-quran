# PROGRAM-UI-001 PATCH 001

## 1. Context
- **Base Branch:** `feature/program-ui-001`
- **Issue ID:** `AUDIT-PROG-001`
- **Problem:** The default `/admin/program` state failed to filter for active-only programs, yielding archived programs by default on the UI because the query parser explicitly passed `undefined` instead of `'active'` for missing status.

## 2. Changed Files
1. **`app/admin/program/page.tsx`**: Modified the URL `searchParams.status` parser. 
    - If `status === 'all'`, it returns `undefined` (which tells `searchPrograms` to return everything).
    - If `status === 'archived'`, it returns `'archived'`.
    - Otherwise (default), it strictly returns `'active'`.
2. **`app/admin/program/ProgramTableClient.tsx`**: Updated the uncontrolled default `<select>` value from `all` to `active`.

## 3. Verifications
- `test_program_crud.ts` passes (tested `searchPrograms`).
- `npm run build` static and SSR checks pass.
- `/admin/program` now implicitly passes `'active'` state down to Drizzle.
- `?status=all` handles the display of historical/archived combinations properly.

## 4. Limitations
- None identified in this patch. Code perfectly maintains previously audited security paths.
