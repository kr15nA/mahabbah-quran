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

- **authoritative source**: `enrollments` table joined with `students` status ('AKTIF'), filtered by `academicYearId`.
- **Student ↔ Fee Type mapping**: NO (Currently implicit based on Admin-selected filters in bulk generation).
- **missing concept**: Explicit entity linking a specific recurring fee to a student or class (e.g., `student_fee_assignments`). Currently relies on selecting a Fee Type and applying it to all active students in a cohort.

---

## IDEMPOTENCY

- **DB unique**: YES (`idx_finance_invoices_monthly_dup` constraint on `finance_invoices`)
- **application guard**: YES (`createInvoiceDraft` checks for existing duplicates in the transaction)
- **race safe**: YES (Protected by database UNIQUE constraint)
- **recommended key**: `studentId + academicYearId + feeTypeId + period`
- **DB constraint required**: YES (already exists)

---

## RECURRING CONFIG

- **frequency support**: YES (`billingFrequency` in `financeFeeTypes` enum 'ONE_TIME', 'MONTHLY', 'CUSTOM')
- **amount source**: Currently supplied by client in bulk generation API (`req.body.amount`), but `defaultAmount` exists on `financeFeeTypes`.
- **due date rule**: missing (No configuration for dynamic due dates on `financeFeeTypes`, e.g., 'Due on 10th of month').
- **billing day**: missing (No configuration for generation trigger day, e.g., '1st of month').

---

## SCHEMA GAP

- **migration required**: YES
- **required changes**:
  1. Add `due_date_rule` and `billing_day_rule` to `finance_fee_types` (or create a dedicated `recurring_billing_config` table).
  2. Create a `billing_runs` table to track batch status, actor, period, success/fail counts for auditability and idempotency of the job itself.

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

- **recommended V1**: Hybrid Admin UI Manual Trigger + Chunked Background API Execution. (Admin clicks "Generate", which tracks progress in `billing_runs`. Vercel Cron is deferred until the manual generation mechanism is robust).
- **batch entity**: YES (`billing_runs` table is required to track large generations and prevent stateless Vercel timeouts from losing state).
- **batch size recommendation**: Limit DB transaction boundaries to chunks of 50-100 students to prevent Neon DB locks and Vercel serverless function timeouts.

---

## ADMIN

- **route**: `/admin/keuangan/tagihan/generate` (or a dedicated tab on `/admin/keuangan/tagihan`)
- **permission**: `finance.billing.manage`
- **dry run**: YES (Crucial for Admin to see '79 Invoices Will Generate, 8 Skipped' before committing to DB).

---

## DEFERRED

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
- Fully automatic Vercel Cron (focus on manual batch V1 first)

---

## PROPOSED PHASES

- **Phase A**: Domain + Schema (Add recurrence rules to Fee Types, create Billing Runs tracking table).
- **Phase B**: Generator Engine & Dry Run (Logic to resolve amount, dates, check existing idempotency, and return preview stats).
- **Phase C**: Admin UI (Interface to preview and execute the batch run).
- **Phase D**: Automation & Scheduling (Optionally hook up Vercel Cron).

---

## RISKS

1. **Vercel Timeout Limits**: Generating 1,000+ invoices synchronously will exceed Vercel's 10-60s timeout. Must use chunked generation or a batch runner entity.
2. **Gross Amount Trust**: Current bulk endpoint relies on client-supplied amount. Recurring Billing must firmly resolve amount from Server (e.g., `feeType.defaultAmount`) to prevent manipulation.
3. **Implicit Eligibility**: Without strict Student ↔ Fee Type assignments, generation assumes all active students in a Program/Class owe the fee. Any exceptions must be handled via 100% Scholarships rather than excluding from generation.

---

**FINAL VERDICT**:
RECURRING-BILLING-001 ARCHITECTURE READY FOR IMPLEMENTATION
