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
- **Phase D1 (IMPLEMENTED/RELEASED)**: Portal shell + Identity + Dashboard (Identity, Current Academic Context, Current Teachers, Scholarship Summary) + Profile + Academic Context
- **Phase D2**: Attendance + Hafalan + Tahsin + Tasmi read-only views
- **Phase D3**: UX hardening + Mobile polish

## Blockers
- **NONE**

## D1 RELEASED
- **SANTRI_D1_BASELINE_SHA**: 31602bcffd4a8d4e9dcb65031cda2ae8427b5742
- **Runtime Candidate SHA**: d55ea89d70a0a87355ac03ff963e0ec60bfb1272
- **Feature Candidate SHA**: a2e9e664f7bbaf198f20fdec82e0a916f58d8d2e
- **Main Runtime Release SHA**: c1fbb97b939a40a1debc15932ae5fc286ce2dc3f
- **Production SHA**: c1fbb97b939a40a1debc15932ae5fc286ce2dc3f
- **Tag**: full-portal-santri-phase-d1-v1.0.0
- **Preview URL**: Automatically provisioned by Vercel
- **Git note**: previous feature history was amended/force-pushed once during candidate preparation; no further history rewrite allowed.
- **Branch**: `main`
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
- **D2**: NOT STARTED
- **D3**: NOT STARTED
- **Status**: RELEASED

## PHASE D2 — SANTRI ACADEMIC READ-ONLY MINI AUDIT

### BASELINE SHA
`72763f047f8737ed38e82a1bfb3173f8a800bf7b`

### ATTENDANCE DOMAIN
- **Table**: `attendance`
- **Student linkage**: `studentId`
- **Status enum**: `'hadir' | 'izin' | 'sakit' | 'alfa'`
- **Date/time fields**: `attendanceDate`, `createdAt`, `updatedAt`
- **Teacher/actor**: `teacherId`
- **Notes**: `notes`
- **Soft delete**: NO soft delete; records are physically removed or upserted.
- **Existing helpers**: `getAttendanceSummaryByStudent`, `getAttendanceByStudentMonth` (perfectly aligned with safe month/summary views).
- **Attendance Self View**: READY. The month-based summary is safely scoped.

### HAFALAN DOMAIN
- **Table**: `hafalanRecords`
- **Student linkage**: `studentId`
- **Fields**: `surahId`, `ayahStart`, `ayahEnd`, `type`, `score`, `sessionDate`, `teacherId`
- **Teacher**: Stored natively on the record.
- **Soft delete**: NO soft delete.
- **Hafalan Self View**: READY. Progress summaries (`getLastHafalanByStudent`) and paginated list (`getHafalanByStudent`) are directly usable.

### TAHSIN DOMAIN
- **Table**: `tahsinRecords`
- **Student linkage**: `studentId`
- **Fields**: `sessionDate`, `makhrajScore`, `tajwidScore`, `kelancaranScore`, `ghunnahScore`, `teacherId`
- **Soft delete**: NO soft delete.
- **Tahsin Self View**: READY. `getTahsinByStudent` exists.

### TASMI DOMAIN
- **Table**: `tasmiSessions`
- **Student linkage**: `studentId`
- **Fields**: `mode`, `surahId`, `startJuz`, `endJuz`, `sessionDate`, `score`, `status`, `examinerId`, `notes`
- **Soft delete**: Physically deleted/upserted.
- **Tasmi Self View**: READY. Queries exist in `lib/tasmi/queries.ts` and `lib/tasmi/list.ts`.

### SELF-SCOPE ARCHITECTURE
D1 identity resolution foundation remains locked:
`studentId` is resolved via `requireSelfStudentProfile(session.userId)`.
No client-provided `studentId` will be used anywhere in the `/santri` namespace.

### CLIENT STUDENT ID AUTHORITY
NO. Client-provided ID is never trusted.

### FORMAL SELF-ASSESSMENT
DENIED. No write paths (create/edit/delete/approve) are introduced.

### NOTES PRIVACY
- **Attendance notes**: Excluded (classified as `UNCLEAR` / `INTERNAL_ONLY`).
- **Hafalan notes**: Does not exist in schema.
- **Tahsin notes**: Does not exist in schema.
- **Tasmi notes**: Excluded (classified as `INTERNAL_ONLY` / `UNCLEAR`).
By default, notes are excluded to prevent accidental exposure of internal teacher remarks.

### PAGINATION
Server-side pagination will be enforced. Standard 20 items per page limit applies.

### DASHBOARD SUMMARIES
Dashboard integration is safely feasible for:
- Attendance: Current month summary (`getAttendanceSummaryByStudent`).
- Hafalan: Latest progress (`getLastHafalanByStudent`).
- Tahsin: Latest assessment or average.
No fake percentage charts will be used. Only real queries mapping to existing structures.

### NAVIGATION
The following will be added to the Santri sidebar/nav:
- Kehadiran
- Hafalan
- Tahsin
- Tasmi

### IDOR PLAN
All queries will receive the safely resolved `studentId`. Any route with a `[studentId]` parameter or body payload attempting to specify it will be rejected.

### MULTI-CONTEXT
Adheres to the strict boundaries defined in D1. Guru/Admin accessing `/santri` only sees their *own* learner formal records (if they are also a registered student). Privileges do not bleed.

### TEST MATRIX
**Count**: 25 (Includes tests for Attendance summary/history, Hafalan correctness, Tahsin rules, Tasmi mode checks, IDOR, Multi-context boundaries, and write path denial).

### PERFORMANCE / INDEXES
Existing indexes (`idx_tasmi_student_date`, `attendance_unique_per_day`) provide adequate performance. No new indexes required.

### SCHEMA CHANGE REQUIRED
NO.

### MIGRATION REQUIRED
NO.

### RECOMMENDED IMPLEMENTATION SPLIT
**ONE D2**. Since all four modules (Attendance, Hafalan, Tahsin, Tasmi) share identical read-only and self-scoping architectural patterns without requiring schema changes or complex states, they can be implemented as a single coherent Phase D2 slice.

### BLOCKERS
NONE.

### STATUS
**D2 RELEASE CANDIDATE**

## D2 RELEASE CANDIDATE HYGIENE RECORD

- **SANTRI_D2_BASELINE_SHA**: 72763f047f8737ed38e82a1bfb3173f8a800bf7b
- **D2_AUDIT_DOC_SHA**: 96c6a5f
- **D2_RUNTIME_CANDIDATE_SHA**: d3647b810e4b4a18ab127c8a1ba8d20c1443f658
- **D2_FEATURE_HEAD_SHA**: d3647b810e4b4a18ab127c8a1ba8d20c1443f658

- **git add . incident**: YES
- **accidental files**: NONE
- **self-scope**: PASS
- **pagination**: PASS
- **Attendance**: PASS
- **Hafalan**: PASS
- **Tahsin**: PASS
- **Tasmi**: PASS
- **notes privacy**: PASS
- **historical attribution**: PASS
- **formal learner writes**: NO
- **Santri Finance**: DEFERRED
- **D2 test result**: 37/37 PASS
- **domain regressions**: 
  - Phase D1: 17/17 PASS
  - Multi-context: 70/70 PASS
  - Parent: 9/9 PASS
  - Attendance: 6/6 PASS
  - Tasmi: 5/5 PASS
  - Hafalan domain: NO DEDICATED SCRIPT
  - Tahsin domain: NO DEDICATED SCRIPT
- **typecheck**: PASS
- **build**: PASS
- **Preview URL**: https://mahabbah-quran-c0oh6iyfz-krisnarefac-9550.vercel.app
- **Preview SHA**: d3647b810e4b4a18ab127c8a1ba8d20c1443f658
- **Preview**: READY
- **UAT**: PASS
- **mobile**: PASS
- **schema change**: NO
- **migration**: NO
- **Production mutation**: NO
