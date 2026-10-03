# TAHFIZ FOUNDATION (v1)

**TASK ID:** TAHFIZ-FOUNDATION
**BASELINE:** main @ 8167f2b
**BRANCH:** feat/tahfiz-foundation
**STATUS:** IMPLEMENTED

## Domain Decisions

The foundation for the Mahabbah Tahfiz domain standardizes the academic record format for the Quran memorization tracking logic:

- `hafalan_records`: Authoritative academic evidence (event sourcing)
- `tahfiz_surah_coverage`: Derived rebuildable projection based on normalized overlapping and adjacent coverage of hafalan_records
- `tahfiz_targets`: Authoritative goal history representing student active scopes
- `tasmi_sessions`: Independent exam/certification evidence (outside of regular coverage)
- `tahsin_records`: Independent reading-quality evidence

## Implementation Details

- **Schema:** Defined `tahfizSurahCoverage` and `tahfizTargets` tracking boundaries and target scopes safely.
- **Migration 0023:** Generated `0023_fresh_stature.sql`. It has been applied safely to DEV/QA environments.
- **Production Status:** NOT APPLIED. Production migration remains pending explicit human approval.
- **Coverage Normalization:** Resolves overlapping (e.g. 1-10 and 5-15 becomes 1-15), adjacent (1-10 and 11-20 becomes 1-20), gap, containment, unordered inputs, and duplication safely.
- **Hafalan Event Types:** Both `hafalan_baru` and `muraja_ah` constitute coverage evidence without arbitrary distinction.
- **Score Semantics:** Score is optional quality/assessment metadata and does not exclude evidence from coverage projections.
- **Target State Machine:** Uses exact boundaries for status (`ACTIVE`, `COMPLETED`, `CANCELLED`, `SUPERSEDED`) backed by unique constraints on the ACTIVE state.
- **Supersedes Relationship:** Revision logic executes a soft-link replacement by setting current ACTIVE to SUPERSEDED and generating a new row that links back to it via `supersedes_target_id`.
- **RBAC / Authorization:** Explicit permission `academic.tahfiz.manage` required for mutable targets. GURU mutation bound additionally by dynamic assigned contexts rather than globally spanning all students.
- **Authorization Helper Refactor:** Extracted pure internal server helpers (`authorizeStudentAccess` and `authorizePermission`) to decouple from Next.js request headers. The authoritative `require*` APIs safely retain full request isolation. This enables comprehensive boundary testing by passing synthetic auth contexts directly to domain services.
- **Hafalan Route Integrity:** Enforced server-authoritative `session.userId` over payload `teacher_id` inside `/api/hafalan/route.ts` to prevent client spoofing. Backwards compatibility maintained for existing `GuruHafalanClient` payloads.
- **Transaction Client:** Relies on explicitly instantiated connection pool (`lib/db/tx.ts`) using `@neondatabase/serverless` to bypass `neon-http` driver limits around stateful `db.transaction()` functionality.
- **Concurrency Lock:** Write operations rely on explicit FOR UPDATE locking to protect sequential evaluation bounds during projection normalization rebuild steps.
- **Backfill:** Implemented idempotent `backfill-tahfiz-coverage.ts`. Processed 28 records into 8 normalized coverage projections successfully (proven idempotency).
- **Test Evidence:** Expanded integration test suite (`scripts/test-tahfiz-foundation-001.ts`) providing full coverage matrix for:
  - Atomic Rollback: Proven that forced query abort during `addHafalanRecord` results in 0 projections being orphaned.
  - Granular RBAC Rejection: Verifies `SUPER_ADMIN` acts correctly and unauthorized / missing `teacherAssignments` are reliably rejected with `Forbidden: Student not accessible`.
  - Target Boundaries: Verified DB constraints block duplicate ACTIVE entries and out-of-order bounds.

## Known Limitations

- No `hafalan_records` UPDATE/DELETE correction workflow exists yet (dependent on TAHFIZ-GURU UX).
- Coverage is purely a projection, and has no API for direct manual override.
- No Tahfiz portal UI integration implemented (pending TAHFIZ-PARENT/SANTRI phases).
- Tasmi policy is not yet strictly enforcing cross-boundary rules.
- No Smart Tahfiz / AI Tahfiz intelligence integrated yet.
- No configurable `tahfiz_levels` exist yet.
- Production migration pending explicit human approval.

## Process Deviations

1. The `scripts/migrate.ts` command was initially invoked during the implementation phase before the final canonical database safety verification guard sequence was rigidly enforced. Impact is contained safely to DEV/QA.
2. The initial Tahfiz RBAC bootstrap execution occurred (`scripts/bootstrap-tahfiz-rbac.ts`) before it was successfully guarded by the `assertSafeMutatingDbTestEnvironment()` helper. The script attempted to map the permission to static `GURU` and `SUPER_ADMIN` codes inside `roles`, which silently failed since those are pseudo-roles mapped in code, meaning no `role_permissions` were corrupted. DB mapping remains clean (`[]`). The script was patched to strictly insert `academic.tahfiz.manage` into `permissions` relying on dynamic application for Guru and automatic override for Super Admin.
