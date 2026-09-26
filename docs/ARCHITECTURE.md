# Mahabbah System — Architecture Baseline

## Application Stack
- **CURRENT:** Next.js 15 (App Router), TypeScript, Tailwind CSS v4.
- **CURRENT:** Neon PostgreSQL (Serverless HTTP driver), Drizzle ORM.
- **CURRENT:** Server Actions for authenticated mutations, strict API Route handlers for edge-cases.

## Auth & Session Model
- **CURRENT:** Stateless JWT architecture via `jose`.
- **CURRENT:** `httpOnly` secure cookies holding the session payload (`userId`, `role`).
- **CURRENT:** Parsed globally via Next.js Edge Middleware for early redirection and route namespace protection.

## Canonical RBAC
- **CURRENT:** Hardcoded canonical roles (`admin`, `guru`, `orang_tua`).
- **CURRENT:** Extensible RBAC module mapping granular `permissions` to roles.
- **CURRENT:** `requireAuth` performs deep server-side validation against required capabilities.
- **CURRENT:** `SUPER_ADMIN` safely bypasses standard RBAC checks for disaster recovery and supreme oversight.

## Namespaces
- **CURRENT:** Strict URL-level isolation.
- **CURRENT:** `/admin` (Global Data/Operations).
- **CURRENT:** `/guru` (Teacher-scoped data, formal assessment mutations).
- **CURRENT:** `/orang-tua` (Parent read-only views, child monitoring).
- **CURRENT:** `/santri` (Learner read-only self-assessments).

## Multi-Context Identity
- **CURRENT:** A single `users` row can concurrently hold identities across multiple domains.
- **CURRENT:** `hasLearnerContext` safely allows a Guru to access the `/santri` portal if they are also a registered student, strictly without privilege bleeding.

## Student/Guardian Relationships
- **CURRENT:** `student_parents` join table mapping `users` (Orang Tua) to `students`.
- **CURRENT:** Dynamic "Guardian Explorer" derives child profiles solely from this many-to-many relationship, ignoring vulnerable client payloads.

## Academic-Year Architecture
- **CURRENT:** `academic_years.is_active` acts as a global context switch. Only one year can be active.
- **CURRENT:** Mutations generally sync to the active year to prevent historical data corruption.

## Enrollment
- **CURRENT:** `enrollments` table binds a student to a `class_id` and `academic_year_id`.
- **LEGACY:** `students.class_id` (SUPERSEDED & DEPRECATED). Removed completely in `LEGACY-DEPRECATION-001`.

## Teacher Assignment
- **CURRENT:** `teacher_assignments` table binds a `teacher_id` to a `class_id` and `academic_year_id`. Enforced as 1-to-1 unique class per year.
- **LEGACY:** `classes.teacher_id` (SUPERSEDED & DEPRECATED). Removed completely in `LEGACY-DEPRECATION-001`.

## Hafalan / Tahsin / Tasmi
- **CURRENT:** Granular assessment tables tracking progress natively tied to the student and teacher.
- **CURRENT:** Guru Portal acts as the sole mutative interface; Santri/Parent interfaces are strictly read-only.

## Finance Architecture
- **CURRENT:** Dry-run first pattern. Invoices are never generated on the fly blindly.
- **CURRENT:** Scholarship and Recurring engines parse assignments, emit previews (`WILL_GENERATE`, `SKIPPED`), and require human validation before committing `DRAFT` invoices.

## Audit Model
- **CURRENT:** Synchronous append-only ledger via `lib/audit/logger.ts`.
- **CURRENT:** Server-side redaction of sensitive credentials (passwords).
- **KNOWN LIMITATION:** Current business mutations and audit writes are sequential. They are not currently composed into a single DB transaction. This is a known consistency limitation.

## Report/Share Architecture
- **CURRENT:** Server-side generation of learning reports.
- **CURRENT:** Secure public sharing via high-entropy random token.
- **CURRENT:** Token hashes are stored server-side using SHA-256 with explicit expiry and revocation controls.

## Media Architecture
- **CURRENT:** Vercel Blob integrations natively handling image uploads (profile photos) securely without polluting the repository.
