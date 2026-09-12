# Audit Report: SYSTEM-FOUNDATION-003 (Hardened)

## Overview
This document records the implementation and hardening of the `SYSTEM-FOUNDATION-003` task,
establishing the Academic-Year Teacher Assignment Foundation.

Hardening patch applied per independent review findings F-001 through F-007.

## Requirements Traceability
- **BRANCH:** `feature/system-foundation-003`
- **COMMIT:** 5fe70a4 (original) — hardening commit to follow
- **TYPECHECK:** PASS
- **BUILD:** PASS
- **DB MIGRATION:** PASS (`0003_natural_silhouette.sql` applied; no schema change in hardening)
- **DB TEST:** PASS — hardened test suite covers F-001/F-002/F-003/F-005 invariants
- **SECURITY:** PASS — RBAC and role validation verified
- **DATA MIGRATION:** PASS — backfill idempotency corrected (F-003)
- **GURU COMPATIBILITY:** PASS — classes.teacher_id preserved correctly
- **RESPONSIVE CODE:** PASS — Tailwind CSS table with overflow-x-auto wrapper
- **VISUAL QA:** NOT VERIFIED in this task (browser inspection deferred)
- **REGRESSION:** PASS — existing Guru/Attendance/Hafalan scope unaffected
- **STATUS:** HARDENED

---

## Architecture Decisions

### Assignment Schema
The `teacher_assignments` table maps an `academic_year_id` to a `class_id` and a `teacher_id`.
Fields: `id`, `academic_year_id`, `class_id`, `teacher_id`, `status`, `created_at`, `updated_at`.
All three FK references use `ON DELETE NO ACTION`, protecting historical rows from orphan deletion.

### Uniqueness Rule
`UNIQUE(academic_year_id, class_id)` guarantees that exactly one primary teacher is assigned
to a specific class per academic year. The unique index is enforced at the database level.
This constraint does NOT prevent a teacher from being assigned to multiple classes in the same year.

### Historical Model (corrected — F-001)
As years progress, new assignments are created in this table. Historical assignments (belonging
to inactive academic years) **are retained** and **may be corrected by Admin** if a data entry
error occurred. They are not automatically immutable.

Historical corrections have two explicit constraints:
1. Corrections to inactive-year assignments NEVER update `classes.teacher_id`.
   This is enforced at the database level inside the upsert CTE.
2. Actor attribution for historical corrections will be captured by the future Audit Log task.
   There is no `created_by`/`updated_by` column yet.

### Active-Year Synchronization Invariant (F-002)
For the currently active academic year, `teacher_assignments.teacher_id` and `classes.teacher_id`
**must always be consistent**. This is enforced by performing both writes in a single atomic SQL
statement via CTE:

```sql
WITH upserted AS (
  INSERT INTO teacher_assignments (academic_year_id, class_id, teacher_id)
  VALUES ($yearId, $classId, $teacherId)
  ON CONFLICT (academic_year_id, class_id) DO UPDATE
    SET teacher_id = EXCLUDED.teacher_id, updated_at = NOW()
  RETURNING id, (xmax = 0) AS is_insert
),
sync_classes AS (
  UPDATE classes SET teacher_id = $teacherId, updated_at = NOW()
   WHERE id = $classId
     AND EXISTS (SELECT 1 FROM academic_years WHERE id = $yearId AND is_active = TRUE)
)
SELECT is_insert FROM upserted
```

The conditional `UPDATE classes` is executed inside the same PostgreSQL statement.
If the year is inactive, the subquery `EXISTS (... WHERE is_active = TRUE)` evaluates to false
and the `UPDATE classes` affects 0 rows — preventing any mutation of `classes.teacher_id`
for historical years. Both operations are atomic; there is no window for partial state.

### `classes.teacher_id` Compatibility (Phase 1)
Phase 1 sync rule (enforced at DB level in the CTE):
- Assignment for the **active** academic year → `classes.teacher_id` is synchronized atomically.
- Assignment for an **inactive** academic year → `classes.teacher_id` is NOT touched.

### Migration Mapping (corrected — F-003)
The backfill script `scripts/migrate-teacher-assignments.ts` idempotency check was corrected to
scope to `(class_id, academic_year_id)` — not just `class_id`. A historical assignment for a
class in a different year no longer prevents creating the active-year assignment.

### Future Phase 2 Plan
In Phase 2, queries such as `getClassesByTeacher` (currently relying on `classes.teacher_id`)
will be refactored to join against `teacher_assignments` using the active academic year,
fully deprecating the legacy `teacher_id` column on `classes`.

### Known Remaining Risks
- No `created_by`/`updated_by` actor column: historical corrections are anonymous pending Audit Log.
- No index on `teacher_id` alone: "classes by teacher" queries in Phase 2 will need this index.
- `neon.transaction()` batch mode was investigated but the single-CTE approach is simpler and more correct.
