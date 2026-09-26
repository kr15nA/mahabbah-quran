# Mahabbah System — Current Project State

LAST VERIFIED:
2026-09-26

REPOSITORY:
mahabbah-quran

LAST VERIFIED APPLICATION BASELINE:
SEC-PLATFORM-002 — Environment Validation

CANONICAL DOCUMENTATION:
ROADMAP-RECONCILIATION-001

STACK:
- Framework: Next.js 15 (App Router)
- Language: TypeScript (strict)
- Database: Neon PostgreSQL
- ORM: Drizzle ORM
- Styling: Tailwind CSS v4
- Auth: Custom JWT via `jose` (httpOnly cookies)
- Forms: Zod validation
- Media: Vercel Blob
- Reports: Server-side PDF generation

CURRENT ARCHITECTURAL BASELINE:
- **Authentication**: JWT-based session (`lib/auth/session.ts`) parsed via Edge Middleware.
- **RBAC**: Extensible permissions layer overlaid on canonical user roles (`admin`, `guru`, `orang_tua`). Super admin bypass exists via `SUPER_ADMIN` context.
- **Route Namespace Authority**: Strict path segregation (`/admin`, `/guru`, `/orang-tua`, `/santri`). Data privileges do not bleed across boundaries.
- **Multi-Context Identity**: `hasLearnerContext` allows dual-role users (e.g. Guru acting as Santri). Self-scope strictly resolves `studentId` via session identity, aggressively ignoring client-provided payloads.
- **Guardian/Family Model**: Explicit mapping in `student_parents`. Canonical Parent portal derives context dynamically from mapped relationships.
- **Academic Year**: Active-year state (`academic_years.is_active = true`) governs visibility and logic synchronization.
- **Enrollment**: Multi-context identity safely ties logic to active `enrollments`.
- **Teacher Assignment**: Handled cleanly in `teacher_assignments`. (Legacy `classes.teacher_id` and `students.class_id` have been formally removed from the schema).
- **Audit**: Append-only log via `lib/audit/logger.ts` with recursive sensitive field redaction.
- **Finance**: Advanced generation engines for Scholarship and Recurring Billing. Relies on Preview-first (dry-run) mutations.
- **Santri Portal**: Read-only architecture. Formal self-assessments strictly denied.
- **Parent Portal**: Mobile-first optimized read-only multi-child dashboard.
- **Guru Portal**: Primary mutation boundary for academic assessments (Hafalan, Tahsin, Tasmi, Absensi).
- **Admin Portal**: Fully functional generic CRUD interfaces and analytics.
- **Platform Security**: Identifier-based login rate limiting enforced via database atomicity (5 failures per 15m). Hardened authentication route returns generic 401 contract for all credential failures (nonexistent, wrong password, inactive) and uses dummy bcrypt hashing to mitigate timing enumeration.
- **Configuration Management**: Core application environment (DB, JWT) validated lazily at boundary execution using centralized Zod primitives without leaking secret values on failure. Optional feature integrations (AI, Media) enforce feature-scoped validation to prevent unrelated subsystem collapse.

CURRENT KNOWN LIMITATIONS:
- **Non-Atomic Audit Log**: Current business mutations and audit log insertions execute sequentially and are not currently composed into one DB transaction. This remains a known consistency limitation.
- **Soft-Delete Consistency**: The `deleted_at` field exists, but exclusion logic is manually distributed across query functions rather than enforced globally.
- **Reporting**: Visual print QA for generated PDFs has not been comprehensively verified on physical devices.

CURRENT APPROVED NEXT TASK:
AWAITING HUMAN APPROVAL
