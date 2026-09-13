# LEGACY-WRITE-CLEANUP-001

## Objective
Normalize academic write paths to strictly enforce `enrollments` and `teacher_assignments` as the absolute authoritative source of truth. The fields `students.class_id` and `classes.teacher_id` are restricted to function exclusively as downstream compatibility mirrors, successfully stopping direct unauthorized mutations that bypassed the normalized schema.

## Execution Summary

### 1. Database Query Hardening
- **`students.ts`**:
  - `insertStudent`: Re-architected as a PostgreSQL Common Table Expression (CTE). It now intrinsically creates the `students` row and simultaneously seeds an authoritative `enrollments` row in a single atomic SQL round-trip. Crucially, it fetches the active academic year automatically inside the SQL query; if no active year exists, it throws a strict rejection.
  - `updateStudent`: Removed `class_id` from both the TypeScript type definition (`UpdateStudentData = Omit<Partial<StudentRow>, 'class_id'>`) and the SQL update logic. Direct generic modifications to a student's class are completely disabled.
- **`classes.ts`**:
  - `insertClass`: Similarly re-architected with an atomic CTE to insert the class and securely seed the `teacher_assignments` row for the active year.
  - `updateClass`: Removed `teacher_id` from the TypeScript type (`UpdateClassData = Omit<..., 'teacher_id'>`) and the SQL update logic.

### 2. API Contract Updates
- **`POST /api/students` & `POST /api/classes`**:
  - Propagate explicit `400` errors downstream when attempting to initialize placement/assignment without a currently active academic year.
- **`PATCH /api/students/[id]`**:
  - Explicitly intercepts `class_id` from payloads. Routes this strictly to `upsertEnrollment()`, ensuring the legacy mirror is safely updated alongside the new normalized enrollment, tracking it properly in the audit log. The remaining standard profile data is safely routed to `updateStudent()`.
- **`PATCH /api/classes/[id]`**:
  - Intercepts `teacher_id` and strictly routes it to `upsertTeacherAssignment()`, keeping generic class edits strictly separate.

### 3. Import Flow Normalization
- **`lib/import-export/index.ts`**:
  - The bulk *Santri* import operation now fetches the `activeAcademicYear`.
  - The bulk process immediately provisions `enrollments` records linked to the active year for each successfully imported student, natively supporting atomic all-or-nothing array inserts alongside the `students` table.
  - If no active year exists, the import intentionally crashes early and cleanly via transaction boundaries.

## Invariants Formally Ensured
1. **Creation Atomicity**: A student can no longer exist with a legacy `class_id` without an accompanying valid `enrollment`. A class cannot exist with a `teacher_id` without an accompanying `teacher_assignment`.
2. **Edit Protection**: Generic endpoints physically cannot directly update legacy fields.
3. **Strict Temporality**: Any placement updates enforce existence of the `active_academic_year`. Historical records can be modified manually via historical APIs, but never leak back to active state randomly.

## Test Validation
Integration test suite `scripts/test-legacy-write-cleanup-001.ts` evaluated the exact failure mechanisms and success paths, verifying 10 deep integration scenarios (including atomicity testing, compilation rejection on un-allowed typing, API interception routing, and bulk-import invariants). All executed cleanly via Node/TSX.

## Typecheck and Build
- **TypeScript**: `npx tsc --noEmit` -> PASS
- **Build**: `npm run build` -> PASS

## Schema Changes
- **Migration Required**: **NO**. The `NOT NULL` constraints on `students.class_id` and `classes.teacher_id` naturally align with these strictly seeded initialization patterns.
- No DB structure modifications were applied.

## Next Steps
The normalized write ecosystem is hardened. The application reads and writes solely from `enrollments` and `teacher_assignments`. `LEGACY-DEPRECATION-001` (to actually drop the mirrored columns) is formally unlocked.
