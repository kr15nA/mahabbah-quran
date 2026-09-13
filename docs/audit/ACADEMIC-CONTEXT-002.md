# ACADEMIC-CONTEXT-002

## Objective
Remove the remaining current operational read dependencies on legacy fields (`students.class_id` and `classes.teacher_id`) from secondary queries, migrating them to the active academic context (`academic_years`, `enrollments`, `teacher_assignments`).

## Files Migrated
1. `lib/db/queries/student-parents.ts`
2. `lib/db/queries/users.ts`
3. `lib/db/queries/attendance.ts`
4. `lib/db/queries/learning-reports.ts`

## Exact Current Read Dependencies Removed
- `student-parents.ts`: Parent-child views now pull `class_name` and `teacher_name` via active `enrollments` and `teacher_assignments`.
- `users.ts`: Teacher class and student counts are built by aggregating active `teacher_assignments` and active `enrollments`.
- `attendance.ts`: The daily roster generation now uses active `enrollments` exclusively to determine class membership.
- `learning-reports.ts`: Removed the JOIN to `students.class_id` to prevent historical class fabrication.

## Current Academic Context Model
Secondary queries resolve current context via:
`active academic_year` + `enrollments` + `teacher_assignments`.
If there is no active academic year, the queries securely return empty datasets or null representations for current class/teacher fields, without falling back to legacy state.

## Historical Attendance Semantics
Historical read functions (`getMonthlyAttendanceStats`, `getAttendanceSummaryByStudent`, `getAttendanceByStudentMonth`) were left untouched. They read directly from the `attendance` table, relying securely on `attendance.class_id` and `attendance.teacher_id` as point-in-time facts.

## Historical Report Author Semantics
Learning reports preserve their historical authorship through `learning_reports.teacher_id`. The JOIN on this field was deliberately kept so that teachers retain historical ownership even after class/academic year reassignments.

## Learning Report Class-Context Limitation
`learning_reports` does not persist historical `class_id`. Previously, the code fetched the student's *current* `class_id` via `students.class_id` and presented it as the report's class, which was historically inaccurate.

## Why Current Enrollment is NOT Treated as Historical Report Class
If a student changes classes, all their historical reports would suddenly appear as if they were authored in the new class if we simply substituted active `enrollment` for `students.class_id`. To avoid this historical fabrication, `class_name` is now explicitly set to `NULL` for learning reports until a dedicated historical `class_id` column is added to the table.

## Remaining Legacy Dependencies
Repository-wide search confirms that there are **no unauthorized CURRENT READ dependencies** on `students.class_id` or `classes.teacher_id` remaining in the operational read paths.
Remaining occurrences are strictly limited to:
- Compatibility writes (`insertStudent`, `updateStudent`, etc.)
- Database test fixtures and assertions verifying backward compatibility.
- Documentation and schema definitions.

## Test Results
Real-DB integration tests executed successfully in `scripts/test-academic-context-002.ts`.
- **Parent Behavior**: Parent current class/teacher dynamically follows active enrollment/assignments.
- **Teacher Counts**: Counts correctly follow only active assignments.
- **Attendance**: Roster uses active enrollment exclusively; historical attendance relies on persisted attendance table fields.
- **Learning Reports**: Preserve historical author and nullify historical class fabrication.
- **No-active-year Behavior**: Returns secure/empty context without legacy fallback.

## Proof of Cleanup Safety
All test mutations execute within a strict `try/finally` block. Snapshot state of assignments, enrollments, and legacy fields are restored deterministically. Run tests passed, and manual db state check confirms no test leakages.

## Typecheck and Build Results
- `npx tsc --noEmit` - **PASS**
- `npm run build` - **PASS**

## DB Migration Required?
**NO.** No database schema changes were required or executed during this task.

## Remaining Risks
The frontend might display empty text for "Class" in the historical learning reports lists because the backend correctly sets it to `null`. This is visually suboptimal but factually correct.

## Recommended Next Task
**REPORT-HISTORICAL-CONTEXT-001**: Introduce a schema migration to add `class_id` to `learning_reports` to formally capture the class context at the time of report creation, and optionally backfill based on current enrollment for existing records.
