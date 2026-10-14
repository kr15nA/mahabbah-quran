# Mahabbah System — Current Project State

LAST VERIFIED:
2026-10-14

REPOSITORY:
mahabbah-quran

LAST VERIFIED APPLICATION BASELINE:
COVERAGE-SPRINT-04 — Onboarding Security, Learner Audio & Operational Readiness (PASS / MERGED)
- Scope: Imported user credential lifecycle & forced password reset, Santri Quran audio playback with 6 canonical reciters, operational health endpoint (`/api/health`), centralized cron secret helper & narrowed cron middleware allowlist, atomic import transactions, parent payment role harmonization, and expanded security regression suite.
- Evidence: Independent code review PASS — SAFE TO MERGE (`COVERAGE-SPRINT-04-HARDENING-REVIEW.md`), `npx tsc --noEmit` PASS, `npm run security:test:fast` PASS, `npm run build` PASS (97 static & dynamic routes generated), merged to main via merge commit `97499e1`.
PORTAL-SANTRI-002 — Santri Portal Phase D3 (PASS)
- Scope: Santri loading/skeleton states, error boundary, mobile UX polish, existing empty states verified, no domain/business expansion.
- Evidence: Santri D1 & D2 tests PASS (37/37 assertions), security:test:fast PASS, typecheck/diff PASS, loading/error runtime verified, mobile verification PASS.
TAHFIZ-FOUNDATION — Core Tahfiz Data Structures (PASS)
- Scope: Coverage projection, goal targeting schema, and transaction logic established. Migration 0023 applied Production.
- Evidence: Target service implemented, authorization/RBAC implemented, backfill verified on Production (31 records to 11 projections), and dedicated tests successfully run. Production application deployment still pending merge at the moment of documentation closeout.

TAHFIZ-GURU — Guru Tahfiz Experience (PASS)
- Scope: Upgraded the existing `/guru/hafalan` page into a comprehensive Tahfiz tracking dashboard for teachers.
- Evidence: Coverage visualization and target management UI built with Server Actions. Reused Hafalan entry API, fully regression tested, typechecked. Runtime responsive QA is DEFERRED TO SYSTEM-QA-FINAL.

TAHFIZ-TASMI-INTEGRATION — Tasmi Integration (PASS)
- Scope: Integrated read-only context of recent Tasmi certifications into the Guru Tahfiz workspace, enforcing domain independence (no cross-mutations).
- Evidence: UI implemented to show recent Tasmi in `/guru/hafalan` using Server Actions and secure student scope checks, with navigation links to `/guru/tasmi`. Typechecked and verified.

TAHFIZ-PARENT — Parent Tahfiz Read-Only Experience (PASS)
- Scope: Created a dedicated Parent read-only Tahfiz page.
- Evidence: UI implemented at `/orang-tua/tahfiz` using `resolveParentChildContext`. Safely exposes active target, coverage, recent hafalan, and PASSED tasmi. No mutations. Typechecked and verified.

TAHFIZ-SANTRI — Santri Tahfiz Self-Service Experience (PASS)
- Scope: Created a dedicated Santri read-only Tahfiz page.
- Evidence: UI implemented at `/santri/tahfiz` using `requireSelfStudentProfile`. Safely exposes active target, coverage, recent hafalan, and Tasmi (PASSED + NEEDS_REVIEW). Shared UI components with Parent. Typechecked and verified.

SMART-TAHFIZ — Smart Tahfiz Deterministic Insight V1 (PASS)
- Scope: Implemented pure deterministic engine to calculate target progress, next focus range, 30-day activity, Murajaah recency, and Guru-only stalled targets.
- Evidence: Dedicated unit tests pass. UI integrated into Guru, Santri, and Parent portals with role-specific payloads. No DB mutation, no AI.

AI-RATE-LIMIT-FOUNDATION-001 — Generic PostgreSQL Rate Limit Foundation (PASS)
- Scope: Implemented serverless-safe fixed-window rate limiter utilizing atomic upsert with PostgreSQL NOW().
- Evidence: Fully parameterized. Passed strict sequential and 10-concurrent race tests.

AI-TAHFIZ — Guru Tahfiz Grounded AI Advisory V1 (PASS)
- Scope: On-demand AI advisory for Guru using Vercel AI SDK Gateway (gemini-3-flash).
- Evidence: Strict fact-pack grounding, no PII, no persistence, bound output, rate limited 5/60s. Tests mock provider.

AUDIT-BASE-001 — Audit Log Foundation (PASS)
- Scope: Centralized audit logging for core academic/user entities.
- Evidence: Full coverage on CREATE/UPDATE/ACTIVATE/DEACTIVATE.

COVERAGE-SPRINT-01 — Core Workflow Fill (IMPLEMENTED)
- TAHSIN-GURU-001 (IMPLEMENTED): Standalone Guru Tahsin assessment workflow at `/guru/tahsin`. Reused `tahsin_records`, `requireStudentAccess`, with 4 criteria evaluation and history.
- AUDIT-UI-001 (IMPLEMENTED): Admin audit viewer at `/admin/audit-logs`. Filterable, paginated viewer with `old_values`/`new_values` JSON inspection.
- ADMIN-CONFIG-001 (IMPLEMENTED): Persisted institution settings at `/admin/pengaturan`. Created table `institution_settings` (migration 0025) with audit trail logging.
- NOTIF-GURU-SANTRI-001 (IMPLEMENTED): In-app notification inboxes at `/guru/notifikasi` and `/santri/notifikasi` with individual and bulk mark-read support.
- PARENT-HIST-001 (IMPLEMENTED): Historical academic-year selector for parent portal on `/orang-tua/laporan` and `/orang-tua/absensi` with strict server authorization via `resolveParentChildContext`.

COVERAGE-SPRINT-02 — Tahfiz & Learner Expansion (IMPLEMENTED)
- SANTRI-QURAN-001 (IMPLEMENTED): In-app Quran reader for Santri portal at `/santri/quran`. Canonical scripture service with 30-day cache, Arabic, Latin, Indonesian translation, Juz filter, and responsive reader restricted to authenticated Santri learner context.
- MURAJAAH-HOME-001 (IMPLEMENTED): Parent home muroja'ah logging and Guru verification. Added `home_murajaah_records` table (migration 0026). Strict IDOR protection ensuring parents only log for linked children and teachers only verify assigned students. Audit trail integrated.
- SANTRI-PRACTICE-001 (IMPLEMENTED): Memorization self-practice mode at `/santri/latihan`. Masking, progressive hint, and repetition counters. Strictly decoupled from official academic grades without mutating hafalan/tasmi records.
- REPORT-BATCH-001 (IMPLEMENTED): Class-level batch report export packaged into ZIP at `/api/learning-reports/batch-export`. Server-side scoping ensuring Admin and assigned Guru access, deterministic filenames, and batch summary text.

COVERAGE-SPRINT-03 — Finance & Learner Transparency (IMPLEMENTED)
- PARENT-FINANCE-001 (IMPLEMENTED): Multi-child billing and payment history at `/orang-tua/tagihan` and `/orang-tua/pembayaran`. Enforces `student_parents.can_view_finance = TRUE` server-side, isolated multi-child context with ChildSwitcher, itemized fee breakdown (gross, scholarship deduction, paid, outstanding), and payment receipt view.
- PORTAL-SANTRI-003 (IMPLEMENTED): Read-only learner billing transparency at `/santri/tagihan`. Reused self-student profile and finance domain models. Shows itemized fee components, payment allocations, and strictly isolates data with zero parent or sibling leakage.
- FINANCE-RECURRING-002 (IMPLEMENTED): Automated recurring billing execution via `/api/cron/recurring-billing`. Protected with constant-time Bearer `CRON_SECRET` validation, deterministic period/academic year resolution, chunked idempotent processing, zero duplicate billing guarantee, and system audit logging.

COVERAGE-SPRINT-04 — Onboarding Security, Learner Audio & Operational Readiness (PASS / MERGED)
- IMPORT-ONBOARDING-001 (PASS): Secure imported user credential lifecycle. Additive migration 0027 adds `users.must_change_password`. Cryptographically random one-time credentials generated upon import, returned one-time to SUPER_ADMIN, with forced password change gating via `/ubah-password` before portal access. Hardened with atomic database transaction (`txDb.transaction()`) on import and verified regression tests.
- SANTRI-AUDIO-001 (PASS): Quran learner reciter audio playback at `/santri/quran`. Integrated 6 canonical reciters from `equran.id` upstream, full-surah and per-ayah audio playback controls with single-active-stream invariant and automatic navigation cleanup. No microphone recording or AI pronunciation grading.
- OPS-BASE-001 (PASS): Operational readiness and config hardening. Lightweight health check probe at `GET /api/health` verifying application and DB connectivity (`SELECT 1`), centralized `getCronSecret()` helper in `lib/config/env.ts` with sanitized error reporting, parent payment auth harmonization at `/api/orang-tua/pembayaran` (explicit 403 for non-parent roles), narrowed cron middleware allowlist (`/api/cron/recurring-billing`), and cron runbook documentation at `docs/operations/CRON-RECURRING-BILLING.md`.
- SEC-REGRESSION-GAPS-001 (PASS): Expanded automated security regression suite (`scripts/test-security-regression-gaps.ts`). Covers imported user lifecycle gating, report share cryptographic token verification (with expiration and revocation enforcement), santri IDOR learner-context locking, parent finance soft-delete denial (`student_parents.deleted_at IS NOT NULL`), and centralized cron secret authentication fail-closed semantics. Hardening verified with `scripts/test-sprint-04-hardening.ts`.

DEFERRED TASKS (REMAINS DEFERRED):
- ACAD-SOFT-DELETE-001 (DEFERRED)
- OPS-QUEUE-001 (DEFERRED)
- NOTIF-EXT-001 (DEFERRED)
- UNIT-FOUNDATION-001 (DEFERRED)
- FINANCE-GATEWAY-001 (DEFERRED)
- Microphone / AI pronunciation grading (DEFERRED)

CANONICAL DOCUMENTATION:
ROADMAP-RECONCILIATION-001, ROADMAP-RECONCILIATION-002

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
- **Security Regression**: A unified regression test runner (`npm run security:test`) orchestrated in TypeScript validates environment configuration, login authentication contracts, API rate limiting, and centralized auditing on DEV/QA environments.

CURRENT KNOWN LIMITATIONS:
- **Non-Atomic Audit Log**: Current business mutations and audit log insertions execute sequentially and are not currently composed into one DB transaction. This remains a known consistency limitation.
- **Soft-Delete Consistency**: The `deleted_at` field exists, but exclusion logic is manually distributed across query functions rather than enforced globally.
- **Reporting**: Visual print QA for generated PDFs has not been comprehensively verified on physical devices.

CURRENT APPROVED NEXT TASK:
AWAITING HUMAN APPROVAL
