# LEGACY-DROP-001 Audit

## Objective
Physically remove the deprecated legacy relationship columns (`students.class_id` and `classes.teacher_id`) from the database and stop writing to them in the application layer.

## Findings

### Database Completeness Verification
Before the drop, a pre-check (`scripts/check-pre-drop.ts`) confirmed:
1. All active students have exactly one active-year enrollment.
2. All active classes have exactly one active-year teacher assignment.
3. No duplicate anomalies found in `enrollments` or `teacher_assignments`.

### Execution
1. **Schema Change**: `students.classId` and `classes.teacherId` were successfully removed from `drizzle/schema.ts`.
2. **Migration**: Generated migration `0007_aberrant_colleen_wing.sql` dropped the foreign key constraints first, and then dropped the columns. 
3. **Application Layer**:
   - `students.ts`: `insertStudent` now strictly writes only `enrollments` without touching the legacy column. `UpdateStudentData` no longer omits `class_id`.
   - `classes.ts`: `insertClass` writes strictly to `teacher_assignments` alongside class creation.
   - `enrollments.ts`: Removed the legacy `class_id` sync block.
   - `teacher-assignments.ts`: Removed the CTE block responsible for conditionally synchronizing `classes.teacher_id`.
4. **Validation**: Old tests that deliberately mutated legacy columns were removed or updated (such as removing legacy references in `test-legacy-write-cleanup-001.ts` and deleting old data-migration files).
5. A physical presence assertion test (`test-legacy-drop-001.ts`) confirmed the columns physically no longer exist in the DB, while point-in-time fields in `attendance` and `learning_reports` were unaffected.

## Verification
- **Full Test Suite**: All tests passed (6 scripts).
- **TypeScript**: `tsc --noEmit` passed.
- **Build**: `npm run build` passed.
- **Remaining References**: A final `grep` across the application directory confirmed that zero code executions read or write to `students.class_id` or `classes.teacher_id` anymore. The only leftovers are deprecated comments.

## Method of Application
The generated SQL `0007_aberrant_colleen_wing.sql` was applied directly using a Neon client execution script (`scripts/apply-legacy-drop.ts`), bypassing `drizzle-kit push` to safely work around previous migration ledger unsynchronized state debt.

## Final Verdict
**LEGACY ACADEMIC COLUMNS FULLY REMOVED**

The application is now entirely built upon the normalized multi-year enrollment system.
