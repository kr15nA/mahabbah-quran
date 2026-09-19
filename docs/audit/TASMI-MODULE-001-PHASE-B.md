# TASMI-MODULE-001 PHASE B: Admin & Guru Tasmi Management UI

## Scope 
Implemented Admin & Guru Tasmi management UI based on the Phase A backend domain. This encompasses the history view, recording functionality, update logic, and deletion.

## Audit

**Routes**
- `/admin/tasmi`: Implemented with server-side query fetching and `TasmiAdminClient`. Includes global data with bounded search/pagination.
- `/guru/tasmi`: Implemented with Guru-specific bounded fetching (`getGlobalTasmiHistory` with `teacherId`) and `TasmiGuruClient`. Search is restricted within the authorized scope.

**Navigation**
- Modified `app/admin/layout.tsx` to include Tasmi under Akademik.
- Modified `app/guru/layout.tsx` to include Tasmi. Note: Guru navigation is statically rendered; the shell cannot hide the route purely based on `academic.tasmi.read`. The route itself enforces authorization, returning an error/denied if accessed without permission.

**Permissions (RBAC)**
- Used Option B: NO default permission migration was created. Permissions `academic.tasmi.read` and `academic.tasmi.manage` must be assigned to Guru dynamically via the existing RBAC system at `/admin/pengguna/roles` before usage.
- Handled properly via `requirePermission` in both server components and Server Actions.

**Student Scope Enforcement**
- Guru routes strictly enforce IDOR prevention. 
- In `/guru/tasmi`, `getGlobalTasmiHistory` receives `teacherId` and enforces filtering. 
- Create/Update/Delete Server Actions run `checkGuruStudentScope` before mutating to ensure the student explicitly belongs to the Guru through valid class enrollments and teacher assignments.

**Forms & Modals**
- Used modal-based UX patterned after `HafalanClient`.
- Implemented `TasmiForm` which switches between `SURAH` (with dropdown) and `JUZ_RANGE` (with start and end juz inputs + real-time preview text).
- `TasmiForm` locks `mode` and student assignment on Edit. It successfully passes the payload back to parent actions for Server Mutations.

**Target Formatter**
- Canonical formatter implemented in `lib/tasmi/formatters.ts` producing uniform output (e.g., `1 Juz • Juz 30` or canonical Surah name) for both Admin/Guru history.

**Mutation Actions**
- Server Actions (`createTasmiAction`, `updateTasmiAction`, `deleteTasmiAction`) explicitly mapped inputs into the safe DTO required by the Phase A `TasmiService`.
- Updates only apply allowed fields (`mode` is locked) and verify record ownership/scope correctly.

**Tests**
- DB/UI tests successfully hit bounded logic returning passing arrays for both Admin and Guru endpoints.
- Typescript build strictly typechecks the payload formats.

**Responsive Design**
- Table includes standard Mahabbah responsive horizontal scrolling for dense data screens on mobile (`min-w-[800px]`).

**Migrations**
- NONE. Reusing existing `tasmi_sessions` Phase A schema.

## Final Note
Proceed with Preview deployment and manual UAT for both Admin and Guru (ensure Guru is assigned necessary permissions for UAT).
