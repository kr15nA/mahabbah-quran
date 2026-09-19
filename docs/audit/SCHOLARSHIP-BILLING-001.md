# SCHOLARSHIP-BILLING-001 — Phase 0 Audit + Phase A Implementation

## Release Status

- **PHASE A STATUS**: RELEASED
- **Feature Release SHA**: 8ed23e453be28f594c420a83cfcec3e857afb84d
- **Main Release SHA**: 58a16d9001c248e34b03d64f7514eb3cf75414ea
- **Production Deployed SHA**: 58a16d9001c248e34b03d64f7514eb3cf75414ea
- **Tag**: scholarship-billing-phase-a-v1.0.0

### Production Migrations
- **0019**: APPLIED
- **0020**: APPLIED

### Impact
- **Live Billing Integration**: NOT ENABLED
- **Existing invoice behavior**: UNCHANGED
- **Outstanding**: UNCHANGED
- **Ledger**: UNCHANGED
- **Payment**: UNCHANGED
- **Parent Finance**: UNCHANGED
- **Production Scholarship Business Data**: NONE
- **Phase B**: NOT STARTED

---

## A. Current Finance Architecture

**Invoice Model**:
`financeInvoices` represents an invoice with a single flat `amount`. There is no `invoice_lines` table. The `amount` field must be strictly `> 0` due to database CHECK constraint (`finance_invoices_amount_chk`).

**Payment Allocation**:
`financePaymentAllocations` links `paymentId` to `invoiceId` with an `allocatedAmount`.

**Outstanding Formula** (unchanged in Phase A):
Calculated at runtime in `getInvoiceDetails` and `reconcileInvoiceStatus`.
`Outstanding = Invoice.amount - Sum(Allocations where Payment is CONFIRMED)`

**Posting Model**:
Invoices are posted to the ledger upon `ISSUED` status:
- Debit: `feeType.receivableAccountId` (Asset)
- Credit: `feeType.incomeAccountId` (Income)
For the full `invoice.amount`.

Payments are posted upon `CONFIRMED`:
- Debit: `payment.destinationAccountId` (Asset/Bank)
- Credit: `feeType.receivableAccountId` (Asset)

**Reversal Model**:
Canceling an `ISSUED` invoice reverses the exact original Journal Entry. Payments can be canceled if `PENDING`.

**Money Representation**:
PostgreSQL `bigint` (no floating point). TypeScript `bigint`.

**Restricted Fund Model**:
Funds (`financeFunds`) have `restrictionType: 'RESTRICTED' | 'UNRESTRICTED'`. All ledger lines require a `fundId`.

**Existing Discount/Waiver Model**:
None exists. `amount` is currently both the gross charge and the net payable.

---

## B. Production Read-Only Precheck

Using `scripts/inspect-finance.ts` (deleted post-audit — not committed):
- **Students**: 128
- **Open Invoices**: 4
- **Overdue Invoices**: 0
- **Existing Apparent Discount Cases**: 0

---

## C. Recommended Scholarship Domain

**Model**: OPTION A — Gross Invoice + Scholarship Adjustment via side-table.

**Why not Option B (Net Invoice)?**
`financeInvoices.amount` has a DB CHECK `> 0`. A 100% scholarship would produce Net = 0 which fails insertion. Accounting standards also require recognizing full gross revenue and a separate scholarship expense.

**Why not Option C (Invoice Lines)?**
No existing invoice lines architecture. Every billing query and UI would require rewriting.

**Why not Option D (Virtual Payment)?**
A payment requires a `destinationAccountId` (ASSET). Scholarships are Expenses/Contra-Revenue — not cash.

### Proposed Model
- `financeInvoices.amount` = **Gross Charge** (unchanged)
- `finance_invoice_scholarships` = immutable snapshot per-invoice
- **Net Payable** = `invoice.amount - Sum(invoice_scholarships.scholarship_amount)`
- **Outstanding** = `Net Payable - Sum(confirmed payment allocations)`

---

## D. Unit Scope Analysis

**Finding**: The current schema has NO `unit_id` on any finance entity.

Entity relationship graph:
```
programs → classes → enrollments → students
academicYears → enrollments → students
financeFeeTypes → (no unitId)
financeFunds → (no unitId)
financeAccounts → (no unitId)
```

**Conclusion**: The system is currently single-unit. All finance entities (fee types, funds, accounts) are institution-scoped. There is no multi-unit partitioning in the current schema. Adding `unitId` to `scholarship_programs` would be premature given the current architecture.

**Unit isolation is achieved** by:
1. `scholarship_programs` apply globally to configured `feeTypeIds`
2. Awards are scoped to `studentId + academicYearId`
3. Student enrollment validation (must have active enrollment for the academic year) provides the natural scope boundary

This is correct and sufficient for the current single-unit architecture. Multi-unit scoping is deferred to a future architecture phase.

---

## E. AuditAction Storage

**Storage**: TypeScript-only (`as const` object in `lib/audit/types.ts`). The `audit_logs.action` column is `varchar(50)`.

**DB migration needed for audit actions**: NO. The scholarship domain uses raw string constants for audit actions (e.g., `'STUDENT_SCHOLARSHIP_ASSIGN'`). These are consistent with existing finance domain patterns (`'PAYMENT_CREATE'`, `'ISSUE'`, etc.) which also bypass the typed `AuditAction` constants.

---

## F. Phase Plan

- **Phase A**: Schema definition, domain CRUD logic, pure calculator, migration, tests.
- **Phase B**: Update `issueInvoice` ledger posting (3-way split), update `getInvoiceDetails` / `reconcileInvoiceStatus` to factor scholarship deductions. Define zero-net status semantics.
- **Phase C**: Admin UI for managing scholarship programs and awarding them to students.
- **Phase D**: Parent/Guru UI updates; recurring billing auto-attach integration.

---

## G. PHASE A IMPLEMENTATION

**LIVE BILLING INTEGRATION**: NOT ENABLED
**Existing invoices**: UNCHANGED
**Outstanding formula**: UNCHANGED
**Ledger posting**: UNCHANGED
**Parent Finance**: UNCHANGED

### Migrations

| # | File | Contents |
|---|------|----------|
| 0019 | `0019_pale_sabretooth.sql` | Creates `scholarship_programs`, `scholarship_program_fee_types`, `student_scholarships`, `finance_invoice_scholarships` |
| 0020 | `0020_grey_screwball.sql` | Adds `program_name_snapshot` column, adds unique index `(invoice_id, student_scholarship_id)` |

Migration meta artifacts tracked: `meta/0019_snapshot.json`, `meta/0020_snapshot.json`, `meta/_journal.json`.
Applied via: `npm run db:migrate` (canonical).

### Schema Tables

**`scholarship_programs`**
- `id`, `name`, `description`
- `calculation_type` — `PERCENTAGE | FIXED_AMOUNT | FULL` — DB CHECK enforced
- `percentage_basis_points` — `> 0 AND <= 10000` — DB CHECK enforced
- `fixed_amount` — `> 0` — DB CHECK enforced
- Cross-field DB CHECK: enforces PERCENTAGE/FIXED/FULL mutual exclusivity of fields
- `status` — `DRAFT | ACTIVE | INACTIVE`
- `funding_fund_id` — FK → `finance_funds` (RESTRICT)
- `scholarship_account_id` — FK → `finance_accounts` (RESTRICT), must be `EXPENSE` type for activation
- `created_by`, `updated_by`, `deleted_at`

**`scholarship_program_fee_types`**
- `program_id` FK → `scholarship_programs` (CASCADE)
- `fee_type_id` FK → `finance_fee_types` (CASCADE)
- Unique index `(program_id, fee_type_id)`

**`student_scholarships`**
- `student_id` FK → `students` (RESTRICT)
- `scholarship_program_id` FK → `scholarship_programs` (RESTRICT)
- `academic_year_id` FK → `academic_years` (RESTRICT)
- `start_date`, `end_date` — inclusive; endDate >= startDate enforced in domain
- `status` — `ACTIVE | REVOKED | EXPIRED` — DB CHECK enforced
- `awarded_at`, `revoked_at`, `deleted_at`
- Index `(student_id, academic_year_id, status)` for active lookups

**`finance_invoice_scholarships`** (snapshot — dormant in Phase A)
- `invoice_id` FK → `finance_invoices` (CASCADE)
- `student_scholarship_id` FK → `student_scholarships` (RESTRICT)
- `scholarship_program_id` FK → `scholarship_programs` (RESTRICT)
- Snapshot fields: `calculation_type_snapshot`, `percentage_basis_points_snapshot`, `fixed_amount_snapshot`
- `gross_eligible_amount`, `scholarship_amount` — DB CHECK `scholarship_amount <= gross_eligible_amount AND >= 0`
- `program_name_snapshot` — historical name preserved for display
- `fund_id_snapshot`, `scholarship_account_id_snapshot` — historical accounting references
- Unique index `(invoice_id, student_scholarship_id)` — prevents double-application
- **Zero production callsites in Phase A** — confirmed by grep

### Calculation Model

Pure function `calculateScholarshipBenefit` in `lib/finance/scholarships/calculator.ts`:

```
FULL:       scholarship = gross
FIXED:      scholarship = min(fixedAmount, gross)
PERCENTAGE: scholarship = floor(gross * basisPoints / 10000)
```

**Rounding**: Integer floor via BigInt: `(grossAmount * BigInt(basisPoints)) / BigInt(10000)`. No Number floating-point.
**Net**: always `>= 0`. Caps applied before returning.
**DB-level**: `scholarship_amount <= gross_eligible_amount` enforced by CHECK constraint.

### Fee Scope & Unit Isolation

- **Fee Scope**: `scholarship_program_fee_types` maps each program to specific `feeTypeIds`. A scholarship only applies if the invoice `feeTypeId` is listed.
- **Unit Scope**: Current schema is single-unit. No `unit_id` exists. Isolation is achieved via enrollment validation.
- **Effective Period**: Awards bounded by `start_date` and `end_date` (inclusive) within `academic_year_id`.

### Effective Date Semantics

- **startDate**: inclusive
- **endDate**: inclusive (null = open-ended, active for rest of academic year)
- **endDate >= startDate**: enforced in domain service at assignment and update time

### Stacking Rule V1

Overlapping awards on the same fee type + overlapping date interval = **DENIED**.

Overlap formula:
```
intervals overlap if NOT (aEnd < bStart OR bEnd < aStart)
null endDate = open-ended = no bound
```

Tests: same dates → DENIED, partial overlap → DENIED, adjacent non-overlapping → ALLOWED, different fee types → ALLOWED.

Enforcement: application-level within transaction. Race note: concurrent assignments may bypass application-level check under high concurrency. DB exclusion constraint not implemented (Drizzle/Postgres `EXCLUDE` requires `tsrange` type — out of scope for V1). Document limitation accepted.

### Award Enrollment Validation

At assignment time:
1. Student exists and not `deletedAt`
2. Student `status = 'active'`
3. Student has active enrollment for `academicYearId` (`enrollments.status = 'active'`)
4. Scholarship Program is `ACTIVE` and not `deletedAt`
5. Program has at least one eligible fee type

### Snapshot Lifecycle

- **DRAFT invoice**: scholarship snapshot may be recalculated/replaced in Phase B
- **ISSUED invoice**: snapshot becomes immutable — enforced in Phase B
- Phase A does not modify the invoice lifecycle

### 100% Scholarship Invoice Status

**Finding**: Inspecting `financeInvoices` — `PAID` status is set by `reconcileInvoiceStatus` when `paidAmount >= invoice.amount`. This means `PAID` = "outstanding is zero" regardless of whether cash was received.

With a 100% scholarship, Net Payable = 0. Whether a zero-net invoice should immediately become `PAID` upon issuance (vs requiring an explicit zero-amount confirmation) is a **business decision deferred to Phase B** when the 3-way journal split is implemented.

### Accounting Configuration

- `fundingFundId`: fund referenced by scholarship program — validated as existing and active on activation
- `scholarshipAccountId`: must be `EXPENSE` type and active for activation
- **Restricted fund consumption**: DEFERRED TO PHASE B. Phase A only stores the reference.
- Account type reasoning: scholarship benefit is an institutional expense, not a payment.

### Audit Actions (Phase A)

Stored as `varchar` strings (TypeScript-only constants — no DB enum):

| Action | Trigger |
|--------|---------|
| `SCHOLARSHIP_PROGRAM_CREATE` | `createScholarshipProgram` |
| `SCHOLARSHIP_PROGRAM_UPDATE` | `updateScholarshipProgramDraft` |
| `SCHOLARSHIP_PROGRAM_ACTIVATE` | `activateScholarshipProgram` |
| `SCHOLARSHIP_PROGRAM_DEACTIVATE` | `deactivateScholarshipProgram` |
| `STUDENT_SCHOLARSHIP_ASSIGN` | `assignStudentScholarship` |
| `STUDENT_SCHOLARSHIP_UPDATE` | `updateStudentScholarship` |
| `STUDENT_SCHOLARSHIP_REVOKE` | `revokeStudentScholarship` |

All mutations + audit are atomic (single transaction).

---

## H. Security

- Credential exposed in terminal during audit was rotated at Neon provider level.
- Old credential revoked (confirmed: new password issued).
- Vercel environment updated.
- `scripts/inspect-finance.ts` deleted.
- `.env.local.latest` deleted.
- `.env.local`, `.env.local.latest`, `.env.production.local` all confirmed git-ignored.
- Only `ref/trd.md:920` contains a template placeholder (`postgresql://...@...neon.tech/mahabbah`) — not a real credential.

---

## I. Test Script

`scripts/test-scholarship-billing-phase-a.ts` (permanent):
- Safety gate: `ALLOW_MUTATING_DB_TESTS=true` required; production DB URL rejected
- Calculator: FULL, FIXED, PERCENTAGE (50%, 33%, 100%), odd-Rupiah floor, FIXED>GROSS cap, gross=1 edge, negative gross rejected, invalid configs rejected
- DB Integration Tests using isolated fixtures (auto-cleaned in finally):
  - **Program**: Create DRAFT, prevent activation without fee mapping/accounting, prevent activation with inactive funds/accounts or non-EXPENSE accounts, successful activation and deactivation.
  - **Award**: Assign valid award, reject missing/deleted/inactive students, reject missing enrollment, reject invalid dates (end < start).
  - **Overlap**: Enforce same-fee overlap rejection, permit adjacent non-overlapping, permit overlapping on different fee types.
  - **Audit**: Verify `SCHOLARSHIP_PROGRAM_CREATE` and `STUDENT_SCHOLARSHIP_ASSIGN` logging.
  - **Snapshot Constraints**: Verify `(invoiceId, studentScholarshipId)` unique constraint and `scholarshipAmount <= grossEligibleAmount` DB checks.
- Invocation: `ALLOW_MUTATING_DB_TESTS=true npx tsx --env-file=.env.local scripts/test-scholarship-billing-phase-a.ts`

---

## J. Accidental Drizzle Push Investigation

A rogue `npx drizzle-kit push` was executed during the Phase A hardening workflow.

**Findings**:
1. **Target DB**: The command executed against the DEV/QA environment defined in `.env.local` (Neon database).
2. **Schema Mutated**: **NO**. The command was cancelled via task management during the `[⣷] Pulling schema from database...` phase, before any SQL statements were generated or applied to the database.
3. **Production Affected**: **NO**. The `.env.local` credential targeted DEV/QA, not Production. Production environment and credentials were never loaded.
4. **Migration Consistency**: **YES**. Subsequent verification via `npx drizzle-kit check` confirmed the schema matches the current codebase (`drizzle.config.ts`), and `npm run db:migrate` cleanly applied the `0019` and `0020` migrations. No duplicate or partial migration state exists.
5. **Remediation**: None required. State is clean.
