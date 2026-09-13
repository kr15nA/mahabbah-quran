# LEGACY-DEPRECATION-001

## Objective
Evaluate whether `students.class_id` and `classes.teacher_id` can be safely removed from the system.

## Atomicity Verification (`LEGACY-WRITE-CLEANUP-001`)
The CTE implementations in `lib/db/queries/students.ts` and `classes.ts` were physically audited. The structure:
```sql
INSERT INTO students (...)
SELECT ... FROM active_year
```
This correctly guarantees that **zero** rows are inserted into `students` if the `active_year` sub-select returns zero rows. The application then correctly catches the 0-row insertion and throws a rejection. The atomicity constraint is fully secured.

## Normalized Database Completeness
Verified directly against the active Neon database for the current Active Year:
- Students with `status='active'` missing an active enrollment: **0**
- Active classes missing a primary teacher assignment: **0**
- Duplicate anomalies: **0**

The normalized data model successfully covers the entire domain.

## Repository-Wide Dependency Audit
Extensive grep checks revealed the following matrix:

| Dependency Type | Status | Finding |
| --- | --- | --- |
| CURRENT READ (DB) | Safe | DB queries use `enrollments e` and `teacher_assignments ta`. |
| CURRENT WRITE (DB) | Safe | Fully decoupled; enforced strictly via CTE and `upsertEnrollment`. |
| AUTHORIZATION | Safe | RBAC relies entirely on normalized active context. |
| API / UI CONTRACT | **BLOCKING** | UI Client Components (e.g., `AdminAbsensiClient`, `GuruHafalanClient`, `KelasTableClient`) actively filter state using `student.class_id === selectedClassId` or `cls.teacher_id`. The API payloads (`SELECT s.*`) directly serialize these legacy columns. |

## Chosen Deprecation Strategy
**OPTION C — KEEP TEMPORARILY**

### Rationale
Although the core database read/write logic is fully migrated to the normalized state, the **Client/UI layer still strongly depends on `class_id` and `teacher_id` being exposed in the JSON API responses**. 

If we drop the columns from the database today:
1. `SELECT s.*` will no longer fetch `class_id`.
2. React components expecting `student.class_id` will receive `undefined`.
3. Client-side filtering arrays (e.g. `students.filter(s => s.class_id === selectedClassId)`) will silently fail, breaking critical Guru and Admin flows.

## Action Plan
Before a formal DB migration can drop the columns:
1. **API Modernization**: The API queries must be explicitly aliased (e.g. exposing `e.class_id AS current_class_id`).
2. **UI Refactoring**: Client components must be refactored to consume the new decoupled API contract.
3. **Formal Deprecation**: Only then can the legacy synchronization writes and `NOT NULL` constraints be safely dropped.

## Test Validation
- `scripts/test-legacy-deprecation-001.ts` evaluated atomic creation flows explicitly, proving that even without legacy constraints, normalized models hold intact.
- The entire regression suite (6+ specialized test scripts) passed without any regressions.
- `tsc --noEmit` and `npm run build` executed and passed cleanly.
