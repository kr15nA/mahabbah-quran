# ACADEMIC-CONTEXT-001: Active Academic Context Read Migration

## Objective
Migrate primary read paths (RBAC and core queries) away from the legacy direct relationships (`students.class_id` and `classes.teacher_id`) to the active academic-year foundation (`enrollments` and `teacher_assignments`), while retaining legacy columns for Phase 1 compatibility.

## Implementation Details

### 1. Authorization (RBAC) Migration
- **`requireClassAccess`**: Now enforces an `INNER JOIN` against the active `academic_years` via `teacher_assignments`. A teacher only has access to a class if they are explicitly assigned to it for the *currently active* academic year. Stale `classes.teacher_id` no longer grants access.
- **`requireStudentAccess`**: Now validates that the teacher is assigned to the class that the student is actively enrolled in, using a multi-table join (`students` → `enrollments` → `academic_years` (active) → `classes` → `teacher_assignments`). A stale `students.class_id` no longer grants membership.
- **Historical Report Ownership**: Unchanged. `requireReportAccess` strictly respects the creator of the report (`teacher_id` on the `learning_reports` table), ensuring teachers retain access to past reports they authored regardless of current enrollment.
- **Parent Access**: Unchanged. Parents access students and reports via the permanent `student_parents` table link, independent of the academic year.

### 2. Core Query Migration
The following queries were updated to resolve lists and statuses via the new active context instead of legacy columns:
- **`lib/db/queries/students.ts`**:
  - `getStudentsByTeacher`
  - `getStudentsByClass`
  - `searchStudents`
  - `getAtRiskStudents`
- **`lib/db/queries/classes.ts`**:
  - `getClassesByTeacher`
  - `searchClasses`
  - `getClassesByParent`
  - `getClassById`
  - `getAllClasses`

### 3. Shared Query Helpers
Introduced `lib/db/queries/academic-context.ts` containing:
- `getActiveAcademicContext()`
- `getActiveEnrollment(studentId)`
- `getActiveTeacherAssignment(classId)`
These centralize the active academic-year retrieval to prevent fragmentation and assure consistency across queries.

### 4. Remaining Legacy References
The following query files currently still rely on legacy context relationships and have not been fully migrated yet:
- `lib/db/queries/student-parents.ts`: still joins via `s.class_id` and `c.teacher_id`
- `lib/db/queries/users.ts`: still joins via `s.class_id` and `c.teacher_id`
- `lib/db/queries/attendance.ts`: still joins via `s.class_id` and `c.teacher_id`
- `lib/db/queries/learning-reports.ts`: still joins via `s.class_id`

### 5. Pre-existing Schema Defect
During testing, an existing defect was identified in the `attendance` table: the `ON CONFLICT` behavior for `upsertAttendance` required a unique index that was manually applied in `seed.ts` but never formalized into Drizzle's migration history. As part of this branch, `unique('attendance_unique_per_day').on(table.studentId, table.attendanceDate)` has been added to `drizzle/schema.ts`, introducing a schema drift compared to `drizzle/migrations/`. A formal migration must be generated separately via an `ATTENDANCE-SCHEMA-HOTFIX-001` to safely resolve this without conflating scope.

## Testing & Validation
A dedicated integration test suite (`scripts/test-academic-context.ts`) was created to programmatically verify access controls:
1. **Active Assignment Access**: `GET /api/attendance?class_id=X` succeeds for an assigned teacher.
2. **Stale Assignment Denial**: `GET /api/attendance?class_id=X` correctly returns 403 when the active assignment moves to another teacher, even if `classes.teacher_id` still reflects the old teacher.
3. **Active Enrollment Access**: `GET /api/students/Y` succeeds for a student actively enrolled in the teacher's assigned class.
4. **Stale Enrollment Denial**: `GET /api/students/Y` correctly returns 403 when the active enrollment moves to another class, even if `students.class_id` still reflects the old class.
5. **Inactive Year Denial**: Access is securely denied if the assignment/enrollment belongs to an inactive year, or if no active year exists globally.
6. **Report Creation Continuity**: Confirmed `POST /api/attendance` and `POST /api/hafalan` still work properly for active teachers.

## Next Steps
- The system is now successfully utilizing the Phase 2 academic-year foundation for core RBAC authorization and primary student/class listing reads.
- `ATTENDANCE-SCHEMA-HOTFIX-001` should be scheduled to formalize the missing attendance unique constraint migration.
- The remaining non-migrated query files (`student-parents.ts`, `users.ts`, `attendance.ts`, `learning-reports.ts`) must be updated in a follow-up Phase 2 migration before we can safely lock or disable the legacy `students.class_id` and `classes.teacher_id` columns in Phase 3.
