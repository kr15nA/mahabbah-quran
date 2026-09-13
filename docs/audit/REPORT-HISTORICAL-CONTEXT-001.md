# REPORT-HISTORICAL-CONTEXT-001

## Objective
Persist the historical class context on learning reports so that a report intrinsically retains a record of the student's class at the time it was authored. This permanently prevents historical class fabrication where a student's current enrollment was previously falsely substituted into historical reports.

## Schema Change
- **Migration File**: `0006_colossal_princess_powerful.sql`
- **Migration Metadata**: Drizzle snapshot and `meta/_journal.json` generated.
- **Table Altered**: `learning_reports`
- **Column Added**: `class_id bigint`
- **Foreign Key**: `REFERENCES classes(id) ON DELETE set null`

The `class_id` column is nullable by design to preserve existing historical reports that lack this context, while preventing arbitrary default values or unsafe backfilling.

## Write Flow (Report Creation)
During `POST /api/learning-reports`, the class context is resolved dynamically and securely on the backend:
1. The endpoint validates authorization (`requireStudentAccess`) ensuring the Guru is authorized to write a report for the student.
2. It fetches the student's **Active Enrollment** using `getActiveEnrollment()`.
3. **Rejection Rule**: If no active enrollment exists for the student, the report creation is definitively rejected with a `400 Bad Request` ("Active enrollment required to create a report").
4. The resolved active `classId` is persisted into `learning_reports.class_id`.
5. Any client-provided `classId` is entirely ignored, strictly enforcing server-side authority.

## Read Flow (Queries & Authorization)
- All historical class displays now explicitly use `learning_reports.class_id` to join with the `classes` table (`LEFT JOIN classes c ON c.id = lr.class_id`), replacing any reliance on `students.class_id` or `enrollments`.
- **Existing Reports**: Since existing reports remain with `class_id = NULL`, the JOIN yields `NULL` for `class_name`. This is safely managed by the application.
- **No Historical Backfill**: No automated backfill was performed. Fabricating historical data using a student's current enrollment was strictly avoided.

## Historical Authorship
`learning_reports.teacher_id` remains the absolute source of truth for the author of a report. If a teacher is reassigned or a student moves classes, the historical author of the report will absolutely never change.

## PDF & Share Behavior
The PDF and Share generators natively render the historically persisted `class_name`.
If `class_name` is `NULL` (e.g., an old report), the PDF engine gracefully degrades to displaying `"-"`. The Share page naturally omits the class field in its structural design.

## Tests Executed
A dedicated integration test suite (`scripts/test-report-historical-context-001.ts`) validated exactly these semantics:
1. New report captures active enrollment class_id.
2. Fake client classId is ignored by API logic.
3. No active enrollment triggers rejection.
4. Existing class_id NULL report remains readable and does not display current class.
5. Student moves class -> historical report class remains original.
6. Teacher changes -> historical author remains original.

All assertions **PASSED**.

## Typecheck and Build
- **TypeScript**: `npx tsc --noEmit` -> PASS
- **Build**: `npm run build` -> PASS

## Database Migration Application Status
Due to accumulated legacy migration ledger debt (`__drizzle_migrations`), `drizzle-kit push` was **not used**.
Instead, the generated migration `0006_colossal_princess_powerful.sql` was manually applied to the DB using a custom execution script (`scripts/apply-migration-006.ts`) via standard `sql` tag templates to ensure clean schema alignment without corrupting the un-synchronized ledger state. The database successfully received the schema alter.

## Remaining Risks
- The frontend will display an empty or `-` value for the "Kelas" field in old historical reports since they do not have a recorded `class_id`. While this is factually correct, users should be aware that missing class context on old reports is intended behavior.
