# RECURRING-BILLING-001 — Phase 0 Mini Audit & Architecture Lock

## BASELINE
- **BASELINE SHA**: `665a82477a596a7cf40762e2201e3a13c56f6d4e`

---

## CURRENT INVOICE MODEL

- **invoice table**: `finance_invoices`
- **period**: `varchar(50)` (Validates to `YYYY-MM` format for MONTHLY frequency)
- **student relation**: `student_id` (References `students.id`)
- **fee type relation**: `fee_type_id` (References `finance_fee_types.id`)
- **academic year**: `academic_year_id` (References `academic_years.id`)
- **amount**: `amount` (bigint)
- **due date**: `due_date` (date)
- **status**: `status` (varchar: 'DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED')
- **invoice schema change**: NONE

---

## CURRENT CREATION FLOW

- **file**: `lib/finance/invoices.ts` (and `lib/finance/bulk-billing.ts`)
- **function**: `createInvoiceDraft` and `bulkGenerateInvoices`
- **creates Draft**: YES
- **scholarship resolver**: `resolveScholarshipForInvoice` (Called during Draft creation)
- **issue function**: `issueInvoice`
- **journal**: Handled in `issueInvoice` (Generates journal entries)

---

## ELIGIBILITY

- **authoritative source**: Future `finance_student_fee_assignments` explicitly mapping a student to a recurring fee type for a temporal period.
- **Student ↔ Fee Type mapping**: Required explicitly in V1. Temporal range dictates validity (Start Period to End Period).
- **amount override**: DEFERRED (The gross amount is strictly locked to `finance_fee_types.defaultAmount`).

---

## IDEMPOTENCY

- **DB unique**: YES (`idx_finance_invoices_monthly_dup` constraint on `finance_invoices`)
- **application guard**: YES (`createInvoiceDraft` checks for existing duplicates in the transaction)
- **race safe**: YES (Protected by database UNIQUE constraint)
- **recommended key**: `studentId + academicYearId + feeTypeId + period`
- **DB constraint required**: YES (already exists)
- **invoice uniqueness**: REMAINS AUTHORITATIVE. No new invoice origin flags will be added. Existing invoices (manual or recurring) will trigger `SKIPPED_EXISTING`.

---

## RECURRING CONFIG

- **frequency support**: YES (Must be `MONTHLY` for recurring config to activate).
- **amount source**: `finance_fee_types.defaultAmount`.
- **due date rule**: Added via dedicated table `finance_recurring_billing_configs` (`dueDayOfMonth` constrained to 1..28).
- **billing day**: DEFERRED TO AUTOMATION.
- **fee type schema change**: NONE.

---

## SCHEMA GAP

- **migration expected**: YES
- **required changes**:

### TABLE 1: finance_recurring_billing_configs
- `id` (bigserial)
- `feeTypeId` (bigint, NOT NULL, FK `financeFeeTypes.id` RESTRICT, UNIQUE)
- `isActive` (boolean, default true)
- `dueDayOfMonth` (smallint, NOT NULL, CHECK BETWEEN 1 AND 28)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

### TABLE 2: finance_student_fee_assignments
- `id` (bigserial)
- `studentId` (bigint, FK `students.id` RESTRICT)
- `academicYearId` (bigint, FK `academicYears.id` RESTRICT)
- `feeTypeId` (bigint, FK `financeFeeTypes.id` RESTRICT)
- `startPeriod` (varchar(7), NOT NULL, CHECK `YYYY-MM`)
- `endPeriod` (varchar(7), NULL, CHECK `YYYY-MM`, CHECK `>= startPeriod`)
- `status` (varchar(20), NOT NULL, e.g. `VALID`, `VOIDED`)
- `createdBy` (bigint, FK `users.id` SET NULL)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)
- **Assignment overlap strategy**: Transaction-level overlap guard using explicit concurrency locking on the DB (e.g. `pg_advisory_xact_lock` on student+fee type or SELECT FOR UPDATE) to ensure two VALID assignments for the same student, year, and fee type never overlap in their period ranges.

### TABLE 3: finance_billing_runs
- `id` (bigserial)
- `academicYearId` (bigint, FK `academicYears.id` RESTRICT)
- `feeTypeId` (bigint, FK `financeFeeTypes.id` RESTRICT)
- `period` (varchar(7), NOT NULL, CHECK `YYYY-MM`)
- `status` (varchar(30), NOT NULL, `PENDING`, `RUNNING`, `COMPLETED`, `COMPLETED_WITH_ERRORS`, `FAILED`)
- `startedBy` (bigint, FK `users.id` SET NULL)
- `startedAt` (timestamp)
- `completedAt` (timestamp)
- `eligibleCount` (integer, default 0)
- `generatedCount` (integer, default 0)
- `skippedCount` (integer, default 0)
- `failedCount` (integer, default 0)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)
- **Constraints**: `UNIQUE(academicYearId, feeTypeId, period)`
- **Run retry strategy**: Reuse/resume logical run. Newly eligible assignments discovered on an explicit rerun may be added to the same logical run. Existing successful run items will not regenerate invoices.

### TABLE 4: finance_billing_run_items
- `id` (bigserial)
- `runId` (bigint, FK `financeBillingRuns.id` RESTRICT)
- `studentId` (bigint, FK `students.id` RESTRICT)
- `assignmentId` (bigint, FK `financeStudentFeeAssignments.id` RESTRICT)
- `invoiceId` (bigint, FK `financeInvoices.id` SET NULL)
- `status` (varchar(30), NOT NULL, `PENDING`, `GENERATED`, `SKIPPED_EXISTING`, `FAILED`)
- `errorCode` (varchar(50), NULL)
- `errorMessage` (text, NULL)
- `createdAt` (timestamp)
- `updatedAt` (timestamp)
- **Constraints**: `UNIQUE(runId, assignmentId)`

**FK delete behavior**: All relational finance/audit records use `RESTRICT` to preserve history, except user references (`createdBy`/`startedBy`) which use `SET NULL`. Invoices use `SET NULL` on `invoiceId`.

---

## SCHOLARSHIP

- **integration**: REUSE PHASE B
- **full scholarship fake payment**: NO
- **snapshot semantics**: Snapshot created immediately upon Draft generation (`financeInvoiceScholarships`). Recalculation supported via `recalculateDraftScholarship` for DRAFT status only.

---

## ACCOUNTING

- **generation posts journal**: NO (Generated as DRAFT)
- **issue posts journal**: YES
- **recommended generation status**: DRAFT (Allows admin review and scholarship adjustments before posting journals).

---

## EXECUTION

- **recommended V1**: Admin UI manual generation.
- **batch entity**: YES (`finance_billing_runs` + `finance_billing_run_items`).
- **batch size recommendation**: Chunks of 50-100 students to prevent DB transaction/Vercel timeout limits.

---

## ADMIN

- **route**: `/admin/keuangan/tagihan/generate` (or dedicated tab)
- **permission**: `finance.billing.manage`
- **dry run**: YES (Preview execution counts before commit).

---

## DEFERRED

- amount override (Custom pricing)
- billing day (Trigger Automation)
- payment gateway
- QRIS
- VA
- automatic collection
- bank reconciliation
- late fees
- penalties
- proration (Partial month billing)
- restricted-fund scholarship expansion
- cross-fund scholarship
- full multi-unit Finance
- period closing
- approval workflow
- payroll
- Fully automatic Vercel Cron

---

## PROPOSED PHASES

- **Phase A**: Domain + Schema (Recurring Configs, Fee Assignments, Billing Runs, Constraints - No Generation Yet).
- **Phase B**: Generator Engine & Dry Run (Eligibility resolver, Server-side amount, Idempotency, Chunking, Retry).
- **Phase C**: Admin UI (Configure, Bulk assignments, Preview, Generate, Run history).
- **Phase D**: Automation & Scheduling (Cron, Safe retry, Operational monitoring).

---

## RISKS

1. **Vercel Timeout Limits**: Generating large sets synchronously will hit the Vercel timeout. Requires batched/chunked processing.
2. **Assignment Overlaps**: Strict concurrency control is required when adding/modifying `financeStudentFeeAssignments` to avoid logical range overlaps.

---

**FINAL VERDICT**:
RECURRING-BILLING-001 PHASE A PLAN APPROVED FOR IMPLEMENTATION
