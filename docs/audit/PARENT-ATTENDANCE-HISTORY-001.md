# PARENT-ATTENDANCE-HISTORY-001

## Hotfix: Parent Attendance Month Navigation

### Root Cause
`child_id` query parameters were being cast to a `Number` in the UI route, but were compared via strict equality (`===`) against `student_id` fields sourced from the Neon database. Neon's `bigint` types are returned as strings in this environment, causing `activeChild` to evaluate to `undefined` during month navigation. This resulted in a false positive "Akses Ditolak" error when parents navigated their child's attendance history.

### Fix
In `app/orang-tua/absensi/page.tsx`, `student_id` database values and the `child_id` query parameter were strictly cast to `Number` during identification and comparison. This ensures the correct child identity is preserved across URL state changes regardless of string/number disparities.

### Release Evidence
- **Hotfix Branch**: `hotfix/parent-attendance-month-nav-001`
- **Main Release SHA**: `b367baa`
- **Production Deployed SHA**: `b367baa`
- **Tag**: `parent-attendance-month-nav-v1.0.1`

### Status
- Migration: NONE
- DB Mutated: NO
- Runtime Smoke: PASS (Child authorization remains stable across month bounds)
- Security: Unauthorized/unrelated child access correctly denied via `requireStudentAccess` (unchanged).
