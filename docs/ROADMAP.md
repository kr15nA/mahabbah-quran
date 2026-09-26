# Mahabbah System — Master Roadmap

## A. PROJECT GOVERNANCE
- **TASK ID:** ROADMAP-RECONCILIATION-001
- **TITLE:** Project State & Documentation Baseline
- **DOMAIN:** Governance
- **STATUS:** PASS
- **DEPENDENCIES:** None
- **EVIDENCE:** `ROADMAP.md`, `PROJECT-STATE.md`, `ARCHITECTURE.md`, `SECURITY-BASELINE.md`
- **OUTSTANDING WORK:** None
- **NEXT ACTION:** AGENT-PROTOCOL-001

- **TASK ID:** AGENT-PROTOCOL-001
- **TITLE:** Mahabbah System Agent Continuity Protocol
- **DOMAIN:** Governance
- **STATUS:** PLANNED
- **DEPENDENCIES:** ROADMAP-RECONCILIATION-001
- **EVIDENCE:** Proposed rules for AGENTS.md update.
- **OUTSTANDING WORK:** Write MAHABBAH_AGENT_PROTOCOL.md or update AGENTS.md.
- **NEXT ACTION:** None

## B. SECURITY / AUTH
- **TASK ID:** SEC-AUTH-001
- **TITLE:** JWT & Server-Side Authorization
- **DOMAIN:** Security / Auth
- **STATUS:** PASS
- **DEPENDENCIES:** None
- **EVIDENCE:** `lib/auth/rbac.ts`, Edge Middleware
- **OUTSTANDING WORK:** None
- **NEXT ACTION:** None

- **TASK ID:** SEC-RBAC-001
- **TITLE:** Dynamic RBAC & Super Admin
- **DOMAIN:** Security / Auth
- **STATUS:** PASS
- **DEPENDENCIES:** SEC-AUTH-001
- **EVIDENCE:** `RBAC-MANAGEMENT-001` completion
- **OUTSTANDING WORK:** None
- **NEXT ACTION:** None

- **TASK ID:** SEC-PLATFORM-001
- **TITLE:** Login Rate Limiting
- **DOMAIN:** Security / Auth
- **STATUS:** DEFERRED
- **DEPENDENCIES:** None
- **EVIDENCE:** Missing in `app/api/auth/`
- **OUTSTANDING WORK:** Add basic IP-based rate limiting for authentication.
- **NEXT ACTION:** Schedule implementation before GA.

- **TASK ID:** SEC-PLATFORM-002
- **TITLE:** Environment Validation
- **DOMAIN:** Security / Auth
- **STATUS:** DEFERRED
- **DEPENDENCIES:** None
- **EVIDENCE:** No Zod `.env` schema parsing found.
- **OUTSTANDING WORK:** Implement strict boot-time environment schema verification.
- **NEXT ACTION:** Create `env.ts` with Zod.

- **TASK ID:** SEC-PLATFORM-003
- **TITLE:** Security Regression Coverage
- **DOMAIN:** Security / Auth
- **STATUS:** DEFERRED
- **DEPENDENCIES:** None
- **EVIDENCE:** Domain-specific checks exist, but no centralized regression suite.
- **OUTSTANDING WORK:** Unified script to continuously test IDOR and RBAC evasion.
- **NEXT ACTION:** DEFERRED

## C. IDENTITY / USERS
- **TASK ID:** ID-USER-001
- **TITLE:** User Management & Profile
- **DOMAIN:** Identity
- **STATUS:** PASS
- **DEPENDENCIES:** SEC-AUTH-001
- **EVIDENCE:** `USER-PROFILE-001`
- **OUTSTANDING WORK:** None
- **NEXT ACTION:** None

- **TASK ID:** ID-CONTEXT-001
- **TITLE:** Multi-Context Identity & Self-Scope
- **DOMAIN:** Identity
- **STATUS:** PASS
- **DEPENDENCIES:** ID-USER-001
- **EVIDENCE:** `lib/identity/learner.ts`
- **OUTSTANDING WORK:** None
- **NEXT ACTION:** None

- **TASK ID:** ID-FAMILY-001
- **TITLE:** Guardian/Family Model
- **DOMAIN:** Identity
- **STATUS:** PASS
- **DEPENDENCIES:** ID-USER-001
- **EVIDENCE:** `FAMILY-GUARDIAN-MODEL` (Phases A/B)
- **OUTSTANDING WORK:** None
- **NEXT ACTION:** None

## D. MULTI-UNIT
- **TASK ID:** UNIT-FOUNDATION-001
- **TITLE:** Multi-Unit / Branch Management
- **DOMAIN:** Multi-Unit
- **STATUS:** DEFERRED
- **DEPENDENCIES:** None
- **EVIDENCE:** `units` table missing from `schema.ts`.
- **OUTSTANDING WORK:** Schema migration, unit_id propagation, authorization scoping.
- **NEXT ACTION:** Architecture design required.

## E. ACADEMIC FOUNDATION
- **TASK ID:** ACAD-YEAR-001
- **TITLE:** Academic Years & Enrollments Phase 2
- **DOMAIN:** Academic Foundation
- **STATUS:** PASS
- **DEPENDENCIES:** None
- **EVIDENCE:** `enrollments` table implementation.
- **OUTSTANDING WORK:** None
- **NEXT ACTION:** None

- **TASK ID:** ACAD-ATTEND-001
- **TITLE:** Attendance Uniqueness Invariant
- **DOMAIN:** Academic Foundation
- **STATUS:** PASS
- **DEPENDENCIES:** None
- **EVIDENCE:** `attendance_unique_per_day` constraint.
- **OUTSTANDING WORK:** None
- **NEXT ACTION:** None

- **TASK ID:** ACAD-SOFT-DELETE-001
- **TITLE:** Soft-Delete Consistency
- **DOMAIN:** Academic Foundation
- **STATUS:** DEFERRED
- **DEPENDENCIES:** None
- **EVIDENCE:** Manual usage of `deleted_at` across queries is incomplete.
- **OUTSTANDING WORK:** Centralized safe query abstraction for soft-deleted rows.
- **NEXT ACTION:** DEFERRED

- **TASK ID:** ACAD-ASSIGN-001
- **TITLE:** Teacher Assignments Phase 2
- **DOMAIN:** Academic Foundation
- **STATUS:** PASS
- **DEPENDENCIES:** None
- **EVIDENCE:** `teacher_assignments` table implementation.
- **OUTSTANDING WORK:** None
- **NEXT ACTION:** None

- **TASK ID:** LEGACY-DEPRECATION-001
- **TITLE:** Legacy Academic Column Removal
- **DOMAIN:** Academic Foundation
- **STATUS:** PASS
- **DEPENDENCIES:** None
- **EVIDENCE:** `classes.teacher_id` and `students.class_id` successfully removed from schema.
- **OUTSTANDING WORK:** None
- **NEXT ACTION:** None

- **TASK ID:** ACAD-COMPAT-001
- **TITLE:** Legacy Compatibility Synchronization
- **DOMAIN:** Academic Foundation
- **STATUS:** SUPERSEDED
- **DEPENDENCIES:** None
- **EVIDENCE:** Superseded by complete column removal.
- **OUTSTANDING WORK:** None
- **NEXT ACTION:** None

## F. ADMIN PORTAL
- **TASK ID:** PORTAL-ADMIN-001
- **TITLE:** Core Admin Portal
- **DOMAIN:** Admin Portal
- **STATUS:** PASS
- **DEPENDENCIES:** None
- **EVIDENCE:** Full CRUD interfaces implemented via Server Actions and APIs.
- **OUTSTANDING WORK:** None
- **NEXT ACTION:** None

## G. GURU PORTAL
- **TASK ID:** PORTAL-GURU-001
- **TITLE:** Core Guru Portal
- **DOMAIN:** Guru Portal
- **STATUS:** PASS
- **DEPENDENCIES:** ACAD-ASSIGN-001
- **EVIDENCE:** Absensi, Hafalan, Tahsin, Tasmi dashboards fully functional.
- **OUTSTANDING WORK:** None
- **NEXT ACTION:** None

## H. PARENT PORTAL
- **TASK ID:** PORTAL-PARENT-001
- **TITLE:** Parent Context Canonical Shell (C1, C2, C2.1)
- **DOMAIN:** Parent Portal
- **STATUS:** PASS
- **DEPENDENCIES:** ID-FAMILY-001
- **EVIDENCE:** `PARENT-PORTAL` audit docs.
- **OUTSTANDING WORK:** None
- **NEXT ACTION:** None

## I. SANTRI PORTAL
- **TASK ID:** PORTAL-SANTRI-001
- **TITLE:** Full Portal Santri Phase D1 & D2
- **DOMAIN:** Santri Portal
- **STATUS:** PASS
- **DEPENDENCIES:** ID-CONTEXT-001
- **EVIDENCE:** `FULL-PORTAL-SANTRI-PHASE-D.md`
- **OUTSTANDING WORK:** None
- **NEXT ACTION:** None

- **TASK ID:** PORTAL-SANTRI-002
- **TITLE:** Full Portal Santri Phase D3
- **DOMAIN:** Santri Portal
- **STATUS:** PLANNED
- **DEPENDENCIES:** PORTAL-SANTRI-001
- **EVIDENCE:** Referenced in audit doc.
- **OUTSTANDING WORK:** UX Hardening and Mobile Polish.
- **NEXT ACTION:** Execute Phase D3 UI improvements.

- **TASK ID:** PORTAL-SANTRI-003
- **TITLE:** Santri Finance
- **DOMAIN:** Santri Portal
- **STATUS:** DEFERRED
- **DEPENDENCIES:** FINANCE-PARENT-001
- **EVIDENCE:** Identified as deferred in Portal D docs.
- **OUTSTANDING WORK:** Unify learner-scoped billing visibility.
- **NEXT ACTION:** Analysis required post Parent-Finance stabilization.

- **TASK ID:** QURAN-SURAH-MASTER-001
- **TITLE:** Quran Surah Master Reference
- **DOMAIN:** Academic Foundation
- **STATUS:** PASS
- **DEPENDENCIES:** None
- **EVIDENCE:** QURAN-SURAH-MASTER-001.md
- **OUTSTANDING WORK:** None
- **NEXT ACTION:** None

## J. HAFALAN / TAHSIN / TASMI
- **TASK ID:** ACAD-EVAL-001
- **TITLE:** Core Evaluation Modules (Hafalan, Tahsin, Tasmi)
- **DOMAIN:** Academic Evaluation
- **STATUS:** PASS
- **DEPENDENCIES:** None
- **EVIDENCE:** Active implementation in Guru / Parent interfaces.
- **OUTSTANDING WORK:** None
- **NEXT ACTION:** None

## K. REPORTING
- **TASK ID:** REPORT-GEN-001
- **TITLE:** Learning Reports & PDF
- **DOMAIN:** Reporting
- **STATUS:** IMPLEMENTED
- **DEPENDENCIES:** None
- **EVIDENCE:** PDF endpoints exist but lack confirmed physical print QA.
- **OUTSTANDING WORK:** Visual verification on A4 layouts.
- **NEXT ACTION:** Print Layout QA testing.

- **TASK ID:** REPORT-BATCH-001
- **TITLE:** Batch & Cross-Year Reports
- **DOMAIN:** Reporting
- **STATUS:** DEFERRED
- **DEPENDENCIES:** REPORT-GEN-001
- **EVIDENCE:** Not present in API.
- **OUTSTANDING WORK:** Bulk export features.
- **NEXT ACTION:** Requirements gathering.

- **TASK ID:** PDF-REPORT-001
- **TITLE:** PDF Report Generation
- **DOMAIN:** Reporting
- **STATUS:** PASS
- **DEPENDENCIES:** None
- **EVIDENCE:** PDF-REPORT-001.md
- **OUTSTANDING WORK:** None
- **NEXT ACTION:** None

- **TASK ID:** REPORT-SHARE-001
- **TITLE:** Secure Report Sharing
- **DOMAIN:** Reporting
- **STATUS:** PASS
- **DEPENDENCIES:** None
- **EVIDENCE:** REPORT-SHARE-001.md
- **OUTSTANDING WORK:** None
- **NEXT ACTION:** None

## L. MEDIA / FILES
- **TASK ID:** MEDIA-001
- **TITLE:** Profile Media & Upload
- **DOMAIN:** Media / Files
- **STATUS:** PASS
- **DEPENDENCIES:** None
- **EVIDENCE:** Vercel Blob integrations active.
- **OUTSTANDING WORK:** None
- **NEXT ACTION:** None

- **TASK ID:** MEDIA-PROD-001
- **TITLE:** Media Production Verification
- **DOMAIN:** Media / Files
- **STATUS:** DEFERRED
- **DEPENDENCIES:** MEDIA-001
- **EVIDENCE:** No actual Vercel/production upload verification evidence found.
- **OUTSTANDING WORK:** Verify production media uploads.
- **NEXT ACTION:** DEFERRED

## M. IMPORT / EXPORT
- **TASK ID:** IMPORT-EXPORT-001
- **TITLE:** Preview-First Import Framework
- **DOMAIN:** Import / Export
- **STATUS:** IMPLEMENTED
- **DEPENDENCIES:** None
- **EVIDENCE:** `app/admin/import-export/actions.ts` utilizes `lib/import-export/index.ts`.
- **OUTSTANDING WORK:** Final production verification of large batch imports.
- **NEXT ACTION:** UAT testing.

- **TASK ID:** IMPORT-ONBOARDING-001
- **TITLE:** Imported User Onboarding & Password Reset
- **DOMAIN:** Import / Export
- **STATUS:** DEFERRED
- **DEPENDENCIES:** IMPORT-EXPORT-001
- **EVIDENCE:** No workflows found for onboarding.
- **OUTSTANDING WORK:** Temporary password distribution and forced reset flow.
- **NEXT ACTION:** DEFERRED

## N. NOTIFICATIONS
- **TASK ID:** NOTIF-BASE-001
- **TITLE:** In-App Notifications
- **DOMAIN:** Notifications
- **STATUS:** IMPLEMENTED
- **DEPENDENCIES:** None
- **EVIDENCE:** Basic notification models and bells exist in UI.
- **OUTSTANDING WORK:** Full user-preference mappings and read-state synchronization.
- **NEXT ACTION:** DEFERRED

- **TASK ID:** NOTIF-EXT-001
- **TITLE:** Email & WhatsApp Delivery
- **DOMAIN:** Notifications
- **STATUS:** DEFERRED
- **DEPENDENCIES:** None
- **EVIDENCE:** No external provider integrations found.
- **OUTSTANDING WORK:** Build delivery queues and retry mechanisms.
- **NEXT ACTION:** DEFERRED

## O. AI
- **TASK ID:** AI-CORE-001
- **TITLE:** Admin Analytics & AI Reports
- **DOMAIN:** AI
- **STATUS:** IMPLEMENTED
- **DEPENDENCIES:** None
- **EVIDENCE:** `ADMIN-AI-001.md`, generation endpoints.
- **OUTSTANDING WORK:** Provider resilience, rate limiting, and cost-control queues.
- **NEXT ACTION:** DEFERRED

## P. AUDIT
- **TASK ID:** AUDIT-BASE-001
- **TITLE:** Audit Log Foundation
- **DOMAIN:** Audit
- **STATUS:** PATCH_REQUIRED
- **DEPENDENCIES:** None
- **EVIDENCE:** `AUDIT-LOG-001.md`, missing on `updateAcademicYear`.
- **OUTSTANDING WORK:** Patch academic-year UPDATE API to include `createAuditLog`.
- **NEXT ACTION:** Execute hotfix for Academic Year updates.

- **TASK ID:** AUDIT-UI-001
- **TITLE:** Audit Viewer UI
- **DOMAIN:** Audit
- **STATUS:** DEFERRED
- **DEPENDENCIES:** AUDIT-BASE-001
- **EVIDENCE:** No frontend interface for logs.
- **OUTSTANDING WORK:** Admin viewer for system trails.
- **NEXT ACTION:** DEFERRED

## Q. FINANCE
- **TASK ID:** FINANCE-V1
- **TITLE:** Finance V1
- **DOMAIN:** Finance
- **STATUS:** PASS
- **DEPENDENCIES:** None
- **EVIDENCE:** Core invoicing and dashboards active.
- **OUTSTANDING WORK:** None
- **NEXT ACTION:** None

- **TASK ID:** FINANCE-SCHOLARSHIP-001
- **TITLE:** Scholarship Billing A-D
- **DOMAIN:** Finance
- **STATUS:** PASS
- **DEPENDENCIES:** None
- **EVIDENCE:** Scholarship engines fully functional.
- **OUTSTANDING WORK:** None
- **NEXT ACTION:** None

- **TASK ID:** FINANCE-RECURRING-001
- **TITLE:** Recurring Billing Phases A-C
- **DOMAIN:** Finance
- **STATUS:** PASS
- **DEPENDENCIES:** None
- **EVIDENCE:** Config to generator UX implemented safely.
- **OUTSTANDING WORK:** None
- **NEXT ACTION:** None

- **TASK ID:** FINANCE-PAYMENT-001
- **TITLE:** Refunds & Multi-Allocation Reconcile
- **DOMAIN:** Finance
- **STATUS:** PASS
- **DEPENDENCIES:** None
- **EVIDENCE:** Payment state transition rules verified.
- **OUTSTANDING WORK:** None
- **NEXT ACTION:** None

- **TASK ID:** FINANCE-RECURRING-002
- **TITLE:** Recurring Billing Phase D (Automation)
- **DOMAIN:** Finance
- **STATUS:** DEFERRED
- **DEPENDENCIES:** FINANCE-RECURRING-001
- **EVIDENCE:** Noted as deferred in Phase C docs.
- **OUTSTANDING WORK:** Implement cron-driven issuance.
- **NEXT ACTION:** Requirements gathering.

- **TASK ID:** FINANCE-PARENT-001
- **TITLE:** Parent Finance UI Redesign
- **DOMAIN:** Finance
- **STATUS:** DEFERRED
- **DEPENDENCIES:** PORTAL-PARENT-001
- **EVIDENCE:** Identified as deferred epic in audit docs.
- **OUTSTANDING WORK:** Unified billing summary for parents.
- **NEXT ACTION:** Requirements analysis.

## R. UI / UX
- **TASK ID:** UI-BASE-001
- **TITLE:** Architecture & Responsive Layouts
- **DOMAIN:** UI / UX
- **STATUS:** IMPLEMENTED
- **DEPENDENCIES:** None
- **EVIDENCE:** `UI-ARCH-001` exists, but cross-device QA is incomplete.
- **OUTSTANDING WORK:** Tablet/Mobile QA, Accessibility ARIA audits.
- **NEXT ACTION:** QA Verification phase.

## S. OPERATIONS / PRODUCTION
- **TASK ID:** OPS-BASE-001
- **TITLE:** Operational Readiness
- **DOMAIN:** Operations
- **STATUS:** UNKNOWN
- **DEPENDENCIES:** None
- **EVIDENCE:** No documentation found for observability, DB backup, or recovery checklists.
- **OUTSTANDING WORK:** Establish monitoring, logging, and data retention policies.
- **NEXT ACTION:** Create deployment checklist.

- **TASK ID:** SYSTEM-QA-FINAL
- **TITLE:** Final System Production QA
- **DOMAIN:** Operations
- **STATUS:** IN_PROGRESS
- **DEPENDENCIES:** None
- **EVIDENCE:** CORE-FINAL-QA-001.md (Partial coverage documented).
- **OUTSTANDING WORK:** Print layout QA, real-device mobile QA.
- **NEXT ACTION:** QA Phase execution.

## T. MAHABBAH TAHFIZ (FUTURE)
- **TASK ID:** TAHFIZ-FOUNDATION
- **TITLE:** Core Tahfiz Data Structures
- **DOMAIN:** Mahabbah Tahfiz
- **STATUS:** PLANNED
- **DEPENDENCIES:** QURAN-SURAH-MASTER-001, ACAD-YEAR-001
- **EVIDENCE:** Future Roadmap requirement.
- **OUTSTANDING WORK:** Target hafalan, setoran, murojaah, progress models.
- **NEXT ACTION:** DEFERRED

- **TASK ID:** TAHFIZ-GURU
- **TITLE:** Guru Tahfiz Experience
- **DOMAIN:** Mahabbah Tahfiz
- **STATUS:** PLANNED
- **DEPENDENCIES:** TAHFIZ-FOUNDATION, PORTAL-GURU-001
- **EVIDENCE:** Future Roadmap requirement.
- **OUTSTANDING WORK:** Target management, structured setoran, assessment interfaces.
- **NEXT ACTION:** DEFERRED

- **TASK ID:** TAHFIZ-PARENT
- **TITLE:** Parent Tahfiz Visibility
- **DOMAIN:** Mahabbah Tahfiz
- **STATUS:** PLANNED
- **DEPENDENCIES:** TAHFIZ-FOUNDATION, PORTAL-PARENT-001
- **EVIDENCE:** Future Roadmap requirement.
- **OUTSTANDING WORK:** Progress tracking, home murojaah visibility.
- **NEXT ACTION:** DEFERRED

- **TASK ID:** TAHFIZ-SANTRI
- **TITLE:** Santri Tahfiz Experience
- **DOMAIN:** Mahabbah Tahfiz
- **STATUS:** PLANNED
- **DEPENDENCIES:** TAHFIZ-FOUNDATION, PORTAL-SANTRI-001
- **EVIDENCE:** Future Roadmap requirement.
- **OUTSTANDING WORK:** Quran reading, audio, practice modes.
- **NEXT ACTION:** DEFERRED

- **TASK ID:** TAHFIZ-TASMI-INTEGRATION
- **TITLE:** Tasmi Integration
- **DOMAIN:** Mahabbah Tahfiz
- **STATUS:** PLANNED
- **DEPENDENCIES:** TAHFIZ-FOUNDATION, ACAD-EVAL-001
- **EVIDENCE:** Future Roadmap requirement.
- **OUTSTANDING WORK:** Reconcile existing Tasmi architecture without duplication.
- **NEXT ACTION:** DEFERRED

- **TASK ID:** SMART-TAHFIZ
- **TITLE:** Smart Tahfiz Analytics
- **DOMAIN:** Mahabbah Tahfiz
- **STATUS:** PLANNED
- **DEPENDENCIES:** TAHFIZ-FOUNDATION
- **EVIDENCE:** Future Roadmap requirement.
- **OUTSTANDING WORK:** Scheduling and Murojaah recommendations.
- **NEXT ACTION:** DEFERRED

- **TASK ID:** AI-TAHFIZ
- **TITLE:** AI Tahfiz Assistant
- **DOMAIN:** Mahabbah Tahfiz
- **STATUS:** PLANNED
- **DEPENDENCIES:** SMART-TAHFIZ
- **EVIDENCE:** Future Roadmap requirement.
- **OUTSTANDING WORK:** Assisted transcription, error analysis (augmenting teacher authority).
- **NEXT ACTION:** DEFERRED


## HISTORICAL TASK REGISTRY

The following historical tasks from previous phases and legacy documentation have been integrated or superseded by the Canonical Roadmap above. They are preserved here for traceability.

*Note: Historical IDs retained directly as canonical IDs are not duplicated in this registry.*

- **HISTORICAL TASK ID:** SEC-JWT-001
- **STATUS:** PASS
- **CANONICAL PARENT:** SEC-AUTH-001
- **EVIDENCE:** Initial JWT implementation
- **NOTES:** Absorbed into core auth architecture.

- **HISTORICAL TASK ID:** AUTHZ-HOTFIX-001
- **STATUS:** PASS
- **CANONICAL PARENT:** SEC-RBAC-001
- **EVIDENCE:** Hotfix for early authorization leaks.
- **NOTES:** Hardened in canonical RBAC layer.

- **HISTORICAL TASK ID:** AUTHZ-REAL-DATA-VERIFY-001
- **STATUS:** PASS
- **CANONICAL PARENT:** SEC-RBAC-001
- **EVIDENCE:** Verification on production-like data.
- **NOTES:** Integrated into standard tests.

- **HISTORICAL TASK ID:** SEC-API-REVIEW-002
- **STATUS:** PASS
- **CANONICAL PARENT:** SEC-RBAC-001
- **EVIDENCE:** API namespace checks.
- **NOTES:** Evolved into standard `requireAuth`.

- **HISTORICAL TASK ID:** MASTER-RECOVERY-BASELINE-002
- **STATUS:** PASS
- **CANONICAL PARENT:** ROADMAP-RECONCILIATION-001
- **EVIDENCE:** Earlier recovery phases.
- **NOTES:** Superseded by canonical reconciliations.

- **HISTORICAL TASK ID:** STUDENT-UI-001
- **STATUS:** PASS
- **CANONICAL PARENT:** PORTAL-ADMIN-001
- **EVIDENCE:** Admin student management.
- **NOTES:** Merged into Admin Portal.

- **HISTORICAL TASK ID:** PROGRAM-UI-001
- **STATUS:** PASS
- **CANONICAL PARENT:** PORTAL-ADMIN-001
- **EVIDENCE:** Admin program management.
- **NOTES:** Merged into Admin Portal.

- **HISTORICAL TASK ID:** TEACHER-USER-RECON-001
- **STATUS:** PASS
- **CANONICAL PARENT:** ID-USER-001
- **EVIDENCE:** User role reconciliation.
- **NOTES:** Consolidated user profiles.

- **HISTORICAL TASK ID:** TEACHER-USER-UI-001
- **STATUS:** PASS
- **CANONICAL PARENT:** PORTAL-ADMIN-001
- **EVIDENCE:** Admin guru management.
- **NOTES:** Merged into Admin Portal.

- **HISTORICAL TASK ID:** UI-SHELL-001
- **STATUS:** PASS
- **CANONICAL PARENT:** UI-BASE-001
- **EVIDENCE:** Initial layout shell.
- **NOTES:** Evolved into UI Architecture.

- **HISTORICAL TASK ID:** UI-SHELL-002
- **STATUS:** PASS
- **CANONICAL PARENT:** UI-BASE-001
- **EVIDENCE:** Extended layout shell.
- **NOTES:** Evolved into UI Architecture.

- **HISTORICAL TASK ID:** CLASS-RECOVERY-001
- **STATUS:** PASS
- **CANONICAL PARENT:** ACAD-YEAR-001
- **EVIDENCE:** Early class schema fixes.
- **NOTES:** Resolved by Enrollment Phase 2.

- **HISTORICAL TASK ID:** GURU-OPERATIONS-001
- **STATUS:** PASS
- **CANONICAL PARENT:** PORTAL-GURU-001
- **EVIDENCE:** Guru dashboard basics.
- **NOTES:** Expanded in core Guru Portal.

- **HISTORICAL TASK ID:** ADMIN-ACADEMIC-001
- **STATUS:** PASS
- **CANONICAL PARENT:** PORTAL-ADMIN-001
- **EVIDENCE:** Admin Absensi.
- **NOTES:** Merged into Admin Portal.

- **HISTORICAL TASK ID:** ADMIN-ACADEMIC-002
- **STATUS:** PASS
- **CANONICAL PARENT:** PORTAL-ADMIN-001
- **EVIDENCE:** Admin Hafalan.
- **NOTES:** Merged into Admin Portal.

- **HISTORICAL TASK ID:** ADMIN-ACADEMIC-003
- **STATUS:** PASS
- **CANONICAL PARENT:** PORTAL-ADMIN-001
- **EVIDENCE:** Admin Tahsin.
- **NOTES:** Merged into Admin Portal.

- **HISTORICAL TASK ID:** ADMIN-ACADEMIC-004
- **STATUS:** PASS
- **CANONICAL PARENT:** PORTAL-ADMIN-001
- **EVIDENCE:** Admin Penilaian.
- **NOTES:** Merged into Admin Portal.

- **HISTORICAL TASK ID:** ADMIN-REPORT-001
- **STATUS:** PASS
- **CANONICAL PARENT:** PORTAL-ADMIN-001
- **EVIDENCE:** Admin learning report viewer.
- **NOTES:** Merged into Admin Portal.

- **HISTORICAL TASK ID:** ADMIN-ANALYTICS-001
- **STATUS:** PASS
- **CANONICAL PARENT:** PORTAL-ADMIN-001
- **EVIDENCE:** Admin dashboard charts.
- **NOTES:** Merged into Admin Portal.

- **HISTORICAL TASK ID:** ADMIN-NOTIF-001
- **STATUS:** DEFERRED
- **CANONICAL PARENT:** NOTIF-BASE-001
- **EVIDENCE:** Admin push notifications.
- **NOTES:** Superseded by canonical notifications.

- **HISTORICAL TASK ID:** ADMIN-ACCOUNT-001
- **STATUS:** PASS
- **CANONICAL PARENT:** PORTAL-ADMIN-001
- **EVIDENCE:** Admin self-account management.
- **NOTES:** Merged into Admin Portal.

- **HISTORICAL TASK ID:** ADMIN-USER-001
- **STATUS:** PASS
- **CANONICAL PARENT:** PORTAL-ADMIN-001
- **EVIDENCE:** Admin all-users management.
- **NOTES:** Merged into Admin Portal.

- **HISTORICAL TASK ID:** PARENT-PORTAL-001A
- **STATUS:** PASS
- **CANONICAL PARENT:** PORTAL-PARENT-001
- **EVIDENCE:** Phase A parent UI.
- **NOTES:** Rolled into C1, C2 canonical shells.

- **HISTORICAL TASK ID:** PARENT-PORTAL-001B
- **STATUS:** PASS
- **CANONICAL PARENT:** PORTAL-PARENT-001
- **EVIDENCE:** Phase B parent features.
- **NOTES:** Rolled into Canonical Parent Portal.

- **HISTORICAL TASK ID:** PARENT-PORTAL-001C-1
- **STATUS:** PASS
- **CANONICAL PARENT:** PORTAL-PARENT-001
- **EVIDENCE:** Beranda.
- **NOTES:** Merged into Canonical Parent Portal.

- **HISTORICAL TASK ID:** PARENT-PORTAL-001C-2
- **STATUS:** PASS
- **CANONICAL PARENT:** PORTAL-PARENT-001
- **EVIDENCE:** Laporan.
- **NOTES:** Merged into Canonical Parent Portal.

- **HISTORICAL TASK ID:** PARENT-PORTAL-001C-3
- **STATUS:** PASS
- **CANONICAL PARENT:** PORTAL-PARENT-001
- **EVIDENCE:** Absensi.
- **NOTES:** Merged into Canonical Parent Portal.

- **HISTORICAL TASK ID:** PARENT-PORTAL-001C-4
- **STATUS:** PASS
- **CANONICAL PARENT:** PORTAL-PARENT-001
- **EVIDENCE:** Notifikasi.
- **NOTES:** Handled under canonical Notifs.

- **HISTORICAL TASK ID:** PARENT-PORTAL-001C-2.1
- **STATUS:** PASS
- **CANONICAL PARENT:** PORTAL-PARENT-001
- **EVIDENCE:** Selected Child Dashboard.
- **NOTES:** Merged into Canonical Parent Portal.

- **HISTORICAL TASK ID:** ADMIN-AI-001
- **STATUS:** IMPLEMENTED
- **CANONICAL PARENT:** AI-CORE-001
- **EVIDENCE:** ADMIN-AI-001.md
- **NOTES:** Basis of canonical AI module.

- **HISTORICAL TASK ID:** SYSTEM-QA-001
- **STATUS:** PASS
- **CANONICAL PARENT:** SYSTEM-QA-FINAL
- **EVIDENCE:** SYSTEM-QA-001.md
- **NOTES:** Superseded by final QA.

- **HISTORICAL TASK ID:** SYSTEM-FOUNDATION-001
- **STATUS:** PASS
- **CANONICAL PARENT:** ACAD-YEAR-001
- **EVIDENCE:** Academic Year foundation.
- **NOTES:** Merged.

- **HISTORICAL TASK ID:** SYSTEM-FOUNDATION-002
- **STATUS:** PASS
- **CANONICAL PARENT:** ACAD-YEAR-001
- **EVIDENCE:** Enrollment foundation.
- **NOTES:** Merged.

- **HISTORICAL TASK ID:** SYSTEM-FOUNDATION-003
- **STATUS:** HARDENED
- **CANONICAL PARENT:** ACAD-ASSIGN-001
- **EVIDENCE:** 4120368
- **NOTES:** Teacher assignment foundation.

- **HISTORICAL TASK ID:** AUDIT-LOG-001
- **STATUS:** PASS
- **CANONICAL PARENT:** AUDIT-BASE-001
- **EVIDENCE:** AUDIT-LOG-001.md
- **NOTES:** Adopted into canonical audit tasks.

- **HISTORICAL TASK ID:** PARENT-FINANCE-001
- **STATUS:** DEFERRED
- **CANONICAL PARENT:** FINANCE-PARENT-001
- **EVIDENCE:** Deferred epic.
- **NOTES:** Re-indexed as canonical FINANCE-PARENT-001.

- **HISTORICAL TASK ID:** RBAC-MANAGEMENT-001
- **STATUS:** PASS
- **CANONICAL PARENT:** SEC-RBAC-001
- **EVIDENCE:** RBAC completion.
- **NOTES:** Merged.

- **HISTORICAL TASK ID:** FAMILY-GUARDIAN-MODEL-001
- **STATUS:** PASS
- **CANONICAL PARENT:** ID-FAMILY-001
- **EVIDENCE:** Model doc.
- **NOTES:** Merged.

- **HISTORICAL TASK ID:** MULTI-CONTEXT-IDENTITY-001
- **STATUS:** PASS
- **CANONICAL PARENT:** ID-CONTEXT-001
- **EVIDENCE:** MULTI-CONTEXT-IDENTITY-001.md
- **NOTES:** Merged.

- **HISTORICAL TASK ID:** FAMILY-GUARDIAN-MODEL-001-PHASE-B
- **STATUS:** PASS
- **CANONICAL PARENT:** ID-FAMILY-001
- **EVIDENCE:** FAMILY-GUARDIAN-MODEL-001-PHASE-B.md
- **NOTES:** Merged.

- **HISTORICAL TASK ID:** GUARDIAN-RELATIONSHIP-EXPLORER-001
- **STATUS:** PASS
- **CANONICAL PARENT:** ID-FAMILY-001
- **EVIDENCE:** GUARDIAN-RELATIONSHIP-EXPLORER-001.md
- **NOTES:** Merged.

- **HISTORICAL TASK ID:** PARENT-FAMILY-CONTEXT-C1
- **STATUS:** PASS
- **CANONICAL PARENT:** PORTAL-PARENT-001
- **EVIDENCE:** PARENT-FAMILY-CONTEXT-C1.md
- **NOTES:** Merged.

- **HISTORICAL TASK ID:** PARENT-FAMILY-DASHBOARD-C2
- **STATUS:** PASS
- **CANONICAL PARENT:** PORTAL-PARENT-001
- **EVIDENCE:** PARENT-FAMILY-DASHBOARD-C2.md
- **NOTES:** Merged.

- **HISTORICAL TASK ID:** PARENT-FAMILY-DASHBOARD-C2.1
- **STATUS:** PASS
- **CANONICAL PARENT:** PORTAL-PARENT-001
- **EVIDENCE:** PARENT-FAMILY-DASHBOARD-C21.md
- **NOTES:** Merged.

- **HISTORICAL TASK ID:** TASMI-MODULE-001
- **STATUS:** PASS
- **CANONICAL PARENT:** ACAD-EVAL-001
- **EVIDENCE:** TASMI-MODULE-001.md
- **NOTES:** Merged.

- **HISTORICAL TASK ID:** TASMI-MODULE-001-PHASE-B
- **STATUS:** PASS
- **CANONICAL PARENT:** ACAD-EVAL-001
- **EVIDENCE:** TASMI-MODULE-001-PHASE-B.md
- **NOTES:** Merged.

- **HISTORICAL TASK ID:** SCHOLARSHIP-BILLING-001
- **STATUS:** PASS
- **CANONICAL PARENT:** FINANCE-SCHOLARSHIP-001
- **EVIDENCE:** SCHOLARSHIP-BILLING-001.md
- **NOTES:** Merged.

- **HISTORICAL TASK ID:** RECURRING-BILLING-001
- **STATUS:** PASS
- **CANONICAL PARENT:** FINANCE-RECURRING-001
- **EVIDENCE:** RECURRING-BILLING-001.md
- **NOTES:** Merged.

- **HISTORICAL TASK ID:** RECURRING-BILLING-PHASE-B
- **STATUS:** PASS
- **CANONICAL PARENT:** FINANCE-RECURRING-001
- **EVIDENCE:** RECURRING-BILLING-PHASE-B.md
- **NOTES:** Merged.

- **HISTORICAL TASK ID:** RECURRING-BILLING-PHASE-C
- **STATUS:** PASS
- **CANONICAL PARENT:** FINANCE-RECURRING-001
- **EVIDENCE:** RECURRING-BILLING-PHASE-C.md
- **NOTES:** Merged.

- **HISTORICAL TASK ID:** FULL-PORTAL-SANTRI-PHASE-D
- **STATUS:** PASS
- **CANONICAL PARENT:** PORTAL-SANTRI-001
- **EVIDENCE:** FULL-PORTAL-SANTRI-PHASE-D.md
- **NOTES:** Merged.

- **HISTORICAL TASK ID:** LEGACY-WRITE-CLEANUP-001
- **STATUS:** PASS
- **CANONICAL PARENT:** LEGACY-DEPRECATION-001
- **EVIDENCE:** LEGACY-WRITE-CLEANUP-001.md
- **NOTES:** Merged.

- **HISTORICAL TASK ID:** FINANCE-DASHBOARD-001
- **STATUS:** PASS
- **CANONICAL PARENT:** FINANCE-V1
- **EVIDENCE:** FINANCE-DASHBOARD-001.md
- **NOTES:** Merged.

- **HISTORICAL TASK ID:** FINANCE-DASHBOARD-HOTFIX-003
- **STATUS:** PASS
- **CANONICAL PARENT:** FINANCE-V1
- **EVIDENCE:** FINANCE-DASHBOARD-HOTFIX-003.md
- **NOTES:** Merged.

- **HISTORICAL TASK ID:** FINANCE-DASHBOARD-UX-002
- **STATUS:** PASS
- **CANONICAL PARENT:** FINANCE-V1
- **EVIDENCE:** FINANCE-DASHBOARD-UX-002.md
- **NOTES:** Merged.

- **HISTORICAL TASK ID:** FINANCE-DASHBOARD-VISUAL-003
- **STATUS:** PASS
- **CANONICAL PARENT:** FINANCE-V1
- **EVIDENCE:** FINANCE-DASHBOARD-VISUAL-003.md
- **NOTES:** Merged.

- **HISTORICAL TASK ID:** FINANCE-FOUNDATION-001
- **STATUS:** PASS
- **CANONICAL PARENT:** FINANCE-V1
- **EVIDENCE:** FINANCE-FOUNDATION-001.md
- **NOTES:** Merged.

- **HISTORICAL TASK ID:** FINANCE-FOUNDATION-HARDEN-001
- **STATUS:** HARDENED
- **CANONICAL PARENT:** FINANCE-V1
- **EVIDENCE:** FINANCE-FOUNDATION-HARDEN-001.md
- **NOTES:** Merged.

- **HISTORICAL TASK ID:** FINANCE-PRODUCTION-QA-001
- **STATUS:** PASS
- **CANONICAL PARENT:** FINANCE-V1
- **EVIDENCE:** FINANCE-PRODUCTION-QA-001.md
- **NOTES:** Merged.

- **HISTORICAL TASK ID:** FINANCE-RELEASE-001
- **STATUS:** PASS
- **CANONICAL PARENT:** FINANCE-V1
- **EVIDENCE:** FINANCE-RELEASE-001.md
- **NOTES:** Merged.

- **HISTORICAL TASK ID:** FINANCE-REPORTING-001
- **STATUS:** PASS
- **CANONICAL PARENT:** FINANCE-V1
- **EVIDENCE:** FINANCE-REPORTING-001.md
- **NOTES:** Merged.

- **HISTORICAL TASK ID:** ZISWAF-RECEIPT-001
- **STATUS:** PASS
- **CANONICAL PARENT:** FINANCE-V1
- **EVIDENCE:** ZISWAF-RECEIPT-001.md
- **NOTES:** Merged.

- **HISTORICAL TASK ID:** USER-STUDENT-PROFILE-PHOTO-001
- **STATUS:** PASS
- **CANONICAL PARENT:** MEDIA-001
- **EVIDENCE:** USER-STUDENT-PROFILE-PHOTO-001.md
- **NOTES:** Merged.

- **HISTORICAL TASK ID:** UI-ARCH-001
- **STATUS:** PASS
- **CANONICAL PARENT:** UI-BASE-001
- **EVIDENCE:** UI-ARCH-001.md
- **NOTES:** Merged.

- **HISTORICAL TASK ID:** UI-FEATURE-BASELINE-001
- **STATUS:** PASS
- **CANONICAL PARENT:** UI-BASE-001
- **EVIDENCE:** UI-FEATURE-BASELINE-001.md
- **NOTES:** Merged.

- **HISTORICAL TASK ID:** UI-POLISH-CORE-001
- **STATUS:** PASS
- **CANONICAL PARENT:** UI-BASE-001
- **EVIDENCE:** UI-POLISH-CORE-001.md
- **NOTES:** Merged.

- **HISTORICAL TASK ID:** UI-SHELL-001-CORRECTION-PLAN
- **STATUS:** PASS
- **CANONICAL PARENT:** UI-BASE-001
- **EVIDENCE:** UI-SHELL-001-CORRECTION-PLAN.md
- **NOTES:** Merged.
