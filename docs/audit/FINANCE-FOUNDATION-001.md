# FINANCE FOUNDATION 001

## 1. Goal Overview
To establish an authoritative, immutable double-entry ledger foundation with extensible Role-Based Access Control (RBAC), accommodating both Academic Finance (Receivables) and ZISWAF/Fund Accounting for the Mahabbah Qur'an system, strictly without floating-point arithmetic.

## 2. Implemented Schema

### 2.1 RBAC Schema
- **`roles`**, **`permissions`**, **`role_permissions`**, **`user_roles`** have been introduced.
- Existing `users.role` functions seamlessly alongside the new extensible permission structure.

### 2.2 Number Sequence
- **`finance_number_sequences`**: A concurrency-safe sequence generator utilizing PostgreSQL `ON CONFLICT DO UPDATE` returning atomic increments for transaction documents (`INV`, `PAY`, `ZIS`, `OUT`, `JRN`).

### 2.3 Finance Dimensions
- **`finance_categories`**: Defines transaction intent/source (e.g. SPP, Zakat Maal).
- **`finance_funds`**: Represents restricted or unrestricted liquidity pools (e.g. Dana Pendidikan, Dana Wakaf).
- **`finance_category_funds`**: Defines explicit compatibility configurations between categories and funds.

### 2.4 Chart of Accounts & Ledger
- **`finance_accounts`**: Accounts representing traditional COA components.
- **`finance_journal_entries`**: Immutable posted ledger headers representing confirmed financial events.
- **`finance_journal_lines`**: Strict debit/credit accounting entries enforcing standard double-entry balancing (`Total Debit == Total Credit`).

### 2.5 Billing & Payments
- **`finance_fee_types`**, **`finance_invoices`**, **`finance_payments`**, **`finance_payment_allocations`**.

### 2.6 ZISWAF & Disbursements
- **`finance_parties`**, **`finance_campaigns`**, **`ziswaf_receipts`**, **`ziswaf_receipt_allocations`**.
- **`finance_disbursements`**.

## 3. Security & Validation Rules
- **Money Representation**: Enforced usage of PostgreSQL `BIGINT` combined with TypeScript `bigint`. No floating-point or `mode: number` fallback is used for transaction amounts to eliminate precision loss.
- **Ledger Posting**: The authoritative ledger service rigorously checks for balancing, prevents negative values, and requires a distinct debit OR credit per line.
- **Atomicity**: Core state mutations (e.g., updating payment to `CONFIRMED`) and journal postings execute inside a singular interactive PostgreSQL transaction (`db.transaction` with connection pool) protecting against partial ledger corruption.
- **Idempotency**: Unique constraints placed on `(source_type, source_id, source_event)` structurally prohibit double journal posting for the same business event.

## 4. Test Verification Summary
All constraints have been fully tested executing dynamically against the PostgreSQL instance via the test script:
- [x] JSON Serialization correctly yields stringified amounts
- [x] Imbalanced ledger postings (Debit != Credit) strictly rejected
- [x] Duplicated business event postings strictly rejected
- [x] Atomic concurrency sequence generation verified
- [x] Incompatible Category/Fund allocation correctly restricted
- [x] Dynamically provisioned RBAC configurations succeed
- [x] `tsc --noEmit` and `npm run build` completed cleanly without regressions.

## Verdict
**FINANCE + ZISWAF FOUNDATION READY**
