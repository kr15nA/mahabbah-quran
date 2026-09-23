# MULTI-CONTEXT-IDENTITY-001 PHASE D — FULL PORTAL SANTRI MINI AUDIT

## Baseline
- **Baseline SHA**: 31602bcffd4a8d4e9dcb65031cda2ae8427b5742

## Current Santri Portal
- Currently located entirely at `/santri`.
- Contains only a single dashboard page (`app/santri/page.tsx`).
- Shows basic student profile and active scholarship ("Beasiswa Saya").
- Displays a placeholder banner indicating other features (Hafalan, Tahsin, Tasmi, Absensi) are in development.

## Learner Identity Resolution
- Uses `students.user_id` linkage (explicit 1-to-1 linkage).
- Canonical helpers exist in `lib/identity/learner.ts` (`getSelfStudentProfile`, `requireSelfStudentProfile`, `hasLearnerContext`).
- Works independently of active enrollment, tying identity safely to the session user.

## Self-Scope & Formal Assessment Lock
- **Self-Scope**: The application uses the `requireSelfStudentProfile(userId)` helper to derive `studentId`, guaranteeing operations operate only on the user's own linked student record. Client-provided `studentId`s are ignored in this namespace.
- **Formal Self-Assessment Lock**: A strict business rule dictates that a learner cannot create, edit, or delete formal academic records (Attendance, Hafalan, Tahsin, Tasmi) in their own portal context.
- **Guru/Parent Bleed**: Prevented by strict namespace separation (`/santri` vs `/guru` vs `/orang-tua`).
- **Super Admin Bleed**: Even a SUPER_ADMIN acting in the `/santri` context is restricted from formal self-assessment.

## Proposed Routes
- `/santri` - Dashboard (Profile summary, Scholarship summary, Active Teacher, Academic summary)
- `/santri/profil` - Detailed Profile (Read-only Institutional data)
- `/santri/akademik` - Enrollment, Program & Class history, Assigned Teachers
- `/santri/kehadiran` - Read-only Attendance calendar/history
- `/santri/hafalan` - Read-only formal Hafalan history
- `/santri/tahsin` - Read-only Tahsin assessment history
- `/santri/tasmi` - Read-only Tasmi records
- `/santri/beasiswa` - Scholarship details (Can be integrated into Dashboard or standalone)

## Dashboard
A unified overview using REAL data:
- **Identity Card**: Photo, Name, Status.
- **Learning Summary**: High-level attendance stats, latest hafalan progress.
- **Relationships**: Current active teacher (`getActiveTeacherAssignment`).
- **Finance/Scholarship**: Current active scholarship benefit.

## Profile
- Student institutional profile remains read-only (Unit, Program, Class, Enrollment Status).
- Personal user-level updates (avatar, etc) continue through existing User Profile flows.

## Academic Context
- Solved via `lib/db/queries/academic-context.ts` (`getActiveAcademicContext`, `getActiveEnrollment`).
- UI will distinctly show current active enrollment vs historical data.

## Teacher / Mentor
- Sourced from `teacher_assignments` via `lib/db/queries/teacher-assignments.ts`.
- Shows name, program context, and role. Private contact data hidden.

## Attendance
- Read-only grid/calendar and summary (Hadir, Izin, Sakit, Alpa).
- No self-editing capability.

## Hafalan
- Read-only history of formal assessments (Surah, Ayah range, date, score, teacher).
- No self-evaluation forms.

## Tahsin
- Read-only history of Tahsin evaluations.
- No self-evaluation forms.

## Tasmi
- Read-only history of Tasmi events.

## Scholarship
- Already implemented. Logic resides in `lib/finance/scholarships/queries`. Will be refined/integrated into the new dashboard layout.

## Santri Finance
- **Status**: DEFERRED
- **Reason**: Requires significant domain overlap with Parent Finance. A dedicated unified learner billing summary service is not yet fully available in a safe read-model. This will be tackled under PARENT-FINANCE-001.

## Permission Model
- Portal access is authorized solely by the existence of a learner identity (`students.user_id`), checked via `verifyUserContext(session, 'learner')` and `requireSelfStudentProfile`.
- RBAC permissions are not required for basic learner access.
- Formal write operations are blocked by hardcoded business rules, not just missing RBAC permissions.

## IDOR Protection
- Rely exclusively on `requireSelfStudentProfile(session.userId).id` for all backend data fetching within the `/santri` namespace.
- No query params or body parameters for `studentId` are trusted.

## Pagination
- Server-side pagination will be enforced for Attendance, Hafalan, Tahsin, and Tasmi histories.

## Mobile UX
- Responsive design tailored for mobile-first usage.
- Standardized vertical stacked cards for histories, avoiding wide desktop-only tables.

## Query / Service Architecture
- All self-scoped queries will be encapsulated in a new service layer: `lib/student-portal/queries.ts` or equivalent.
- Ensures no accidental reuse of Guru/Admin queries that might lack self-scope constraints.

## Test Matrix
- **Count**: 25 scenarios (based on prompt requirements).

## Schema / Migration
- **Schema change required**: NO
- **Migration required**: NO

## Recommended Implementation Split
- **Phase D1**: Portal shell + Identity + Dashboard + Profile + Academic Context
- **Phase D2**: Attendance + Hafalan + Tahsin + Tasmi read-only views
- **Phase D3**: UX hardening + Mobile polish

## Blockers
- **NONE**

## D1 RELEASE CANDIDATE
- **SANTRI_D1_BASELINE_SHA**: 31602bcffd4a8d4e9dcb65031cda2ae8427b5742
- **Runtime Candidate SHA**: d55ea89d70a0a87355ac03ff963e0ec60bfb1272
- **Git note**: previous feature history was amended/force-pushed once during candidate preparation; no further history rewrite allowed.
- **Branch**: `feature/full-portal-santri-phase-d1`
- **Preview URL**: Automatically provisioned by Vercel
- **Preview SHA**: d55ea89d70a0a87355ac03ff963e0ec60bfb1272
- **Preview Status**: READY
- **Routes Implemented**: `/santri`, `/santri/profil`, `/santri/akademik`, `/santri/beasiswa`
- **Learner Self-Resolution**: Enforced strictly via `requireSelfStudentProfile(session.userId)`.
- **Current Enrollment Resolution**: Enforced strictly via deterministic `getActiveAcademicContext()` and explicit `enrollments.status = 'active'`.
- **Current Teacher Resolution**: Enforced strictly via deterministic active enrollment and explicit `teacherAssignments.status = 'ACTIVE'`.
- **History Semantics**: Explicitly separated into `getMyEnrollmentHistory` and `getMyTeacherHistory` without limiting or confusing with current scope.
- **Scholarship Self-Scope**: Scoped cleanly using `requireSelfStudentProfile` identity resolution.
- **Context Switcher Behavior**: Verifies learner context via `hasLearnerContext(session.userId)`.
- **IDOR Protection**: Complete. No endpoints rely on externally provided `studentId`.
- **Formal Write Denial**: Assured. No write paths or APIs created for institutional or formal assessment data.
- **Santri Finance**: Confirmed DEFERRED.
- **Tests**: Phase D1 suite passed (17/17). 
- **Regression Results**: Multi-context (70/70), Parent context (9/9), Profile photo (8/8).
- **Typecheck & Build**: Passed (`tsc --noEmit` & `next build` OK).
- **Schema Change**: NO
- **Migration**: NO
- **Production mutation**: NO
- **Status**: D1 RELEASE CANDIDATE
