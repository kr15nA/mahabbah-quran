# RECURRING-BILLING-001 — Phase B Mini Audit & Architecture Lock

## BASELINE
- **BASELINE SHA**: `41ff3f9277c0a405dcc0b7646c55122d667ed1b4`

---

## 1. EXISTING REUSABLE SERVICES

- **Invoice Service** (`lib/finance/invoices.ts`):
  - `createInvoiceDraft`: Safely wraps Invoice creation + Scholarship Snapshot resolution + Audit logging inside a single transaction. Throws "Duplicate recurring invoice detected" on logical collision.
  - Can be safely reused by the recurring engine without any scholarship-specific coupling.
  
- **Recurring Config Domain** (`lib/finance/recurring.ts`):
  - Handles `finance_recurring_billing_configs` and `finance_student_fee_assignments`.
  - Phase B logic (dry-run and generation execution) will be cleanly separated into `lib/finance/recurring-generator.ts`.

- **Bulk Billing** (`lib/finance/bulk-billing.ts`):
  - Exists for manual batching, but **MUST NOT** be reused for automated recurring billing because it accepts `amount` from the client. The recurring engine must strictly enforce `finance_fee_types.defaultAmount`.

---

## 2. EXACT DOMAIN CONTRACTS

### ELIGIBILITY LOCK
Authoritative eligibility is derived **exclusively** from `finance_student_fee_assignments` where:
- `status = 'VALID'`
- `startPeriod <= targetPeriod`
- `endPeriod IS NULL OR endPeriod >= targetPeriod`
- `academicYearId` and `feeTypeId` match the billing run context.
- (Implicit) `students.status = 'AKTIF'` and valid `enrollments` are checked upon assignment creation; the assignment itself remains the engine's source of truth.

### CONFIG LOCK
Generation is valid only if:
- `finance_recurring_billing_configs.isActive = true`
- `finance_fee_types.billingFrequency = 'MONTHLY'`
- `finance_fee_types.defaultAmount > 0`
- `dueDayOfMonth` is strictly between `1` and `28`
- Target period format: `YYYY-MM`
- Due date calculation: `YYYY-MM-{dueDayOfMonth}`
- **Gross amount source**: `finance_fee_types.defaultAmount` (client payload is ignored).

---

## 3. DRY RUN CONTRACT

**Function**: `dryRunRecurringBilling(params)`
- **READ-ONLY**: YES. Must not create billing runs, run items, invoices, snapshots, or journals.
- **Return Type**:
  - `academicYearId`, `feeTypeId`, `period`, `grossAmount`, `dueDate`
  - `eligibleCount`, `existingInvoiceCount`, `willGenerateCount`, `invalidCount`
  - `items`: Array of `{ assignmentId, studentId, studentName, status, reason, existingInvoiceId }`
- **Allowed item statuses**: `WILL_GENERATE`, `SKIPPED_EXISTING`, `INVALID`
- **Invalid Handling**: `INVALID` config (e.g. inactive) throws and aborts the entire dry run. Per-student invalidity (if any constraints fail to align) marks the specific item `INVALID`.

---

## 4. GENERATION CONTRACT

- **Logical Run Reuse**: YES. Searches by `academicYearId + feeTypeId + period`. Creates if missing. Explicit rerun reuses the same run ID.
- **Chunk Default**: 50 items per processing boundary to prevent Vercel/DB timeouts.
- **Discovery**: Explicit rerun discovers and processes newly eligible `finance_student_fee_assignments`. Existing items are never duplicated.

---

## 5. TRANSACTION & RACE STRATEGY

- **Transaction Boundary**:
  - One small transaction per run item execution (handled intrinsically by `createInvoiceDraft`).
  - **Avoid** spanning a single transaction across 50 students to prevent prolonged locks and cascading timeouts.
- **Race Strategy**:
  - If two processes attempt to generate for the same student concurrently, `createInvoiceDraft`'s transaction or `idx_finance_invoices_monthly_dup` constraint will throw a duplicate error.
  - The generator will catch this specific race error, query for the `existingInvoiceId`, and gracefully mark the run item as `SKIPPED_EXISTING`. It will **not** leave the item as `FAILED`.

---

## 6. STATE MACHINE & COUNTERS

### Run State Machine
- `PENDING` → `RUNNING` → `COMPLETED` | `COMPLETED_WITH_ERRORS`
- `FAILED` is reserved for catastrophic run-level failures (e.g. schema dropped, config missing).
- Retry/Rerun transitions: `FAILED` | `COMPLETED_WITH_ERRORS` | `COMPLETED` → `RUNNING`.
- Reruns process only newly discovered or `PENDING`/`FAILED` items. `GENERATED` and `SKIPPED_EXISTING` are terminal.

### Counter Strategy
- **Avoid** increment-on-retry (unsafe under concurrent/failed states).
- Counters (`eligibleCount`, `generatedCount`, `skippedCount`, `failedCount`) will be **derived** by aggregating the statuses of `finance_billing_run_items` at the end of each chunk processing.

---

## 7. ERROR CODES & LOGGING

- `INVALID_RECURRING_CONFIG`
- `INVALID_FEE_AMOUNT`
- `ASSIGNMENT_NOT_ELIGIBLE`
- `STUDENT_NOT_FOUND`
- `INVOICE_CREATE_FAILED`
- `SCHOLARSHIP_RESOLUTION_FAILED`
- `UNKNOWN_ERROR`

*No secrets, raw DB URLs, or stack traces will be stored in `finance_billing_run_items.errorMessage`.*

---

## 8. TEST PLAN (24 Cases)

DEV-only integration testing must cover:
1. Inactive recurring config rejected
2. Non-MONTHLY fee type rejected
3. DefaultAmount null/zero rejected
4. Assignment before startPeriod excluded
5. Assignment after endPeriod excluded
6. VALID in-range assignment eligible
7. VOIDED excluded
8. Dry run creates zero business rows
9. Dry run detects manual existing invoice
10. Generate creates DRAFT invoice
11. Gross uses feeType.defaultAmount
12. DueDate correct
13. Scholarship snapshot reused
14. Full scholarship produces net zero semantics without fake payment
15. No journal created
16. Existing invoice -> SKIPPED_EXISTING
17. Rerun does not duplicate invoice
18. Retry FAILED item
19. COMPLETED rerun discovers newly eligible assignment
20. Run item unique respected
21. Invoice concurrency race resolves idempotently
22. Counters correct after mixed GENERATED/SKIPPED/FAILED
23. Chunk size enforcement
24. Production guard refuses mutating tests

---

## 9. NON-GOALS & PERMISSION

- **Deferred**: Admin UI, Cron automation, automatic issuance, payment gateways, proration, late fees.
- **Accounting**: Generation creates NO journals. Invoices remain `DRAFT`.
- **Permission**: `finance.billing.manage` via Server Auth.

---

## 10. RISKS & BLOCKERS

- **Blockers**: NONE.
- **Risks**: Vercel timeouts mitigated by chunk size (50) and granular item-level transactions. N+1 queries mitigated by bulk lookups where safe (e.g., existing invoices for the batch).

---

**FINAL VERDICT**: PHASE B IMPLEMENTED & TESTED
All 32 test assertions passed successfully against the DEV environment using `test-recurring-billing-phase-b.ts`. No test fixture leakage was detected. Zero schema mutations occurred. Build succeeded.
