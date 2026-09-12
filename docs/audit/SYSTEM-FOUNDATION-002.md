# Audit Report: SYSTEM-FOUNDATION-002 (Enrollment Foundation)

## 1. Objective
Establish an `enrollments` table mapping students to classes within an `academic_years` context. Safely migrate existing active students to the currently active academic year while preserving Phase 1 legacy `students.class_id` compatibility.

## 2. Changes Made
- **Schema:** Added `enrollments` table with a unique constraint on `(student_id, academic_year_id)`.
- **Migration:** Created and ran a safe backfill script that mapped exactly 13 active students to 13 enrollments for the active academic year (2026/2027), without disrupting existing data or changing any counts.
- **Query Layer:** Implemented `getEnrollmentsByAcademicYear`, `getStudentEnrollmentHistory`, and `upsertEnrollment` in `lib/db/queries/enrollments.ts`. The upsert ensures that `students.class_id` is synchronized for legacy compatibility ONLY when the target academic year is currently active.
- **API Layer:**
  - `GET /api/enrollments`: Fetch enrollments for an academic year (Admin only).
  - `POST /api/enrollments`: Upsert an enrollment (Admin only).
  - `GET /api/students/[id]/enrollments`: Fetch enrollment history, gated by centralized RBAC `requireStudentAccess` for Guru, Parent, and Admin.
- **Admin UI:** Added `/admin/enrollment` (label: "Penempatan Kelas") allowing Admins to search, filter, and safely reassign students to classes per academic year. Added history viewing capabilities per student.

## 3. Verifications
- **Database integrity:** 13 students correctly linked to the active academic year without duplicating records or losing existing data.
- **Build & Typecheck:** `npx tsc --noEmit` and `npm run build` both passed successfully.
- **Testing:** Provided test suite `scripts/test-enrollments.ts` validated:
  - Admin creation of enrollments.
  - Rejecting duplicate student/year entries.
  - Class change logic successfully updating `students.class_id` when in the active year, but explicitly skipping the sync when dealing with an inactive year.
  - RBAC verification ensuring Parents can only read their child's history, and Gurus their own students.

## 4. Next Steps
- This foundation readies the platform for future temporal-based reporting where attendance and hafalan records can be intrinsically linked to an academic year based on date resolution.
- Legacy `students.class_id` will continue to be safely maintained during Phase 1 operations.
