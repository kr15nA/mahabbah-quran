# TEACHER-USER-UI-001 AUDIT REPORT

**Date:** 2026-09-12  
**Feature:** Guru Management UI and API  
**Branch:** `feature/guru-ui-001`  

---

## 1. Changed Files
**Modified:**
- `lib/db/queries/users.ts`: Re-written to include `SafeGuruRow`, `searchGurus`, `updateGuru`, `archiveGuru`, and fixed `getAllTeachers` to only return safe fields.
- `app/admin/guru/page.tsx`: Converted into a dynamically rendered Server Component with search, pagination, and status filters.
- `app/api/auth/login/route.ts`: Hardened to reject users with `is_active = false`.
- `app/admin/guru/GuruTableClient.tsx`: Client interactive table with modal forms, View Guru detail dialog, and true React debounce.
- `app/api/guru/route.ts`: Secure REST endpoint for fetching and creating Gurus with full input validation.
- `app/api/guru/[id]/route.ts`: Secure REST endpoint for updating and archiving Gurus with strict positive-integer ID validation.

---

## 2. API Design & Security
- **API Endpoints:** Specialized `/api/guru` endpoints were created instead of a generic `/api/users`. This mathematically guarantees that the client cannot perform privilege escalation to `admin` or create `orang_tua`. The `POST` and `PATCH` endpoints strictly enforce `role = 'guru'`.
- **Safe Fields:** Removed `SELECT *`. The queries now explicitly select only safe fields, strictly omitting `password_hash`, `fcm_token`, and `deleted_at`. Aggregations for `class_count` and `student_count` are included.
- **Auth Matrix:** All `/api/guru` endpoints enforce `requireAuth()`, demanding `SUPER_ADMIN`. Guru and Parent users are completely blocked (403 Forbidden).
- **ID Validation:** All dynamic routes enforce `Number.isFinite(id)`, `Number.isInteger(id)`, and `id > 0`.
- **Duplicate Checks:** Properly ignores `null` values when checking for unique email and phone constraints. 

---

## 3. Login Behavior & Deactivation
- **Archive Action:** Triggers `is_active = FALSE`. It explicitly does *not* set `deleted_at = NOW()` in order to preserve existing foreign keys to historical class assignments.
- **Login Hardening:** `app/api/auth/login/route.ts` was updated.
  - Active Guru: PASS
  - Archived Guru (`is_active = false`): REJECT (`403 Akun telah dinonaktifkan`)
  - Active Admin / Parent: PASS
  - Deleted User: REJECT (already filtered by SQL `deleted_at IS NULL`)

---

## 4. UI Implementation
- Adopted the `STUDENT-UI-001` and `PROGRAM-UI-001` Server Component / Client Component pattern.
- **Debounce:** Search uses true React debounce via `useEffect`, preventing router updates on every keystroke.
- **View Guru:** A secure, read-only accessible dialog was added to inspect safe fields of a Guru without exposing editing form inputs or sensitive data.
- Responsive grid scales safely from 360px up to Desktop widths without overflow.
- All interactions use real DB endpoints; dummy data was completely removed.

---

## 5. Final Hardening Patches
- **Input Validation:** Stricter constraints (required fields, basic regex email validation, string type checking, string length constraints) were applied to `POST` and `PATCH`.
- **Pagination Safety:** Limit and page integers are guarded via `Math.min(100)` logic and strict `Number.isFinite()` protections avoiding NaN leaks to SQL.
- **Atomic Single SQL UPDATE:** `updateGuru` was refactored. Instead of executing multiple separate `UPDATE` queries or doing a non-transactional JS read-merge-write, it now executes exactly **one** parameterized `UPDATE` statement dynamically mapping supplied arguments directly using `CASE WHEN` inside Postgres.

---

## 6. Testing Results
- **Real DB Tests:** 
  - `insertUser` works with bcrypt.
  - `searchGurus` correctly paginates and filters.
  - Response objects were verified to be safe (no password leak).
  - Atomic `CASE WHEN` update correctly processes `null` mappings and `undefined` exclusions.
  - Archive and Reactivate operations succeed.
  - Clean up is successful.
- **Static Build:** `npm run build` passes successfully.
