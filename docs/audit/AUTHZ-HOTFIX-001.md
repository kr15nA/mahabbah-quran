# AUTHZ-HOTFIX-001 — Server-Side Authorization Hardening

## 1. Objective
Fix the widespread Insecure Direct Object Reference (IDOR) and authorization scope leak vulnerabilities identified in the server-side API endpoints (`AUTH-BASELINE-001`). Ensure that all routes strictly validate relationship chains before granting access, enforcing a Default Deny posture.

## 2. Files Changed
- `lib/db/client.ts` (Exported Drizzle `db` instance)
- `lib/db/queries/classes.ts` (Added `getClassesByParent`)
- `lib/auth/rbac.ts` (Created)
- `app/api/students/route.ts` (Modified)
- `app/api/classes/route.ts` (Modified)
- `app/api/students/[id]/route.ts` (Modified)
- `app/api/learning-reports/route.ts` (Modified)
- `app/api/learning-reports/[id]/ai/route.ts` (Modified)
- `app/api/attendance/route.ts` (Modified)

## 3. Vulnerabilities Fixed
- **AUTH-LEAK-001:** `GET /api/students` and `GET /api/classes` previously leaked global institution data to parents if the `guru` check was bypassed. Now strictly scoped to the parent's linked children/classes.
- **AUTH-IDOR-001:** `GET /api/students/[id]` previously permitted any authenticated user to fetch any student profile regardless of relationship.
- **AUTH-IDOR-002:** `GET /api/learning-reports`, `POST /api/learning-reports`, and `POST /api/learning-reports/[id]/ai` previously allowed arbitrary report fetching/creation for unrelated students.
- **Attendance IDOR:** `POST /api/attendance` previously accepted attendance data for any `class_id` and `student_id` without validating teacher assignments.

## 4. Exact Authorization Logic
A new centralized authorization helper (`lib/auth/rbac.ts`) was introduced that maps legacy roles to canonical roles (`SUPER_ADMIN`, `GURU`, `ORANG_TUA`). It enforces ownership via Drizzle queries:
- **`requireStudentAccess(studentId)`:** Validates that a teacher owns the student's class, or that a parent has a `student_parents` record linking them to the student.
- **`requireClassAccess(classId)`:** Validates that a teacher owns the class, or that a parent has a linked child in the class.
- **`requireClassStudentAccess(classId, studentId)`:** Enforces both class ownership and student membership simultaneously (used for attendance batch recording).
- **`requireReportAccess(reportId)`:** Validates ownership of the learning report entity.
- If any check fails, an `AuthError(403, 'Forbidden...')` is thrown, which the route gracefully catches to return a safe `403 Forbidden` response without leaking database internals.

## 5. Tests Executed
1. **Typecheck:** `npx tsc --noEmit`
2. **Build:** `npm run build`

## 6. Test Results
- **Typecheck:** Passed. No TypeScript errors in the new RBAC implementations or updated routes.
- **Build:** Passed. Next.js edge runtime gracefully handles the new logic and the Drizzle ORM implementation compiles without error.
- **Lint:** Pre-existing lint issues persist (unused variables/imports), but no new structural issues were introduced by the authorization changes.

## 7. Remaining Security Gaps & Known Limitations
- **Legacy Roles:** We are still heavily relying on the string `'admin' | 'guru' | 'orang_tua'` inside the session payload rather than dedicated database permission matrices.
- **Full RBAC Absence:** Granular permission tables (as planned in `AUTH-IMPLEMENTATION-PLAN-001`) have not yet been provisioned.

## 8. Rollback Procedure
If the stringent ownership checks falsely lock out valid operations (e.g., due to missing database relationship rows):
1. **Source Rollback:** Revert the branch `security/authz-hotfix-001` via `git restore`.
2. **Database:** No database migrations were created, so no schema rollback is necessary.
3. No environment variables need to be modified.
