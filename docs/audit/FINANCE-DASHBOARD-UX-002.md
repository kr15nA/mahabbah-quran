# FINANCE-DASHBOARD-UX-002 Audit

## Semantics
- **Outstanding Definition**: The actual remaining balance of an invoice (`amount - sum(allocated_amount)`), rather than the original issued amount.
- **Overdue (Tunggakan) Definition**: The true outstanding amount where the `due_date` is less than the as-of reporting date. Future-due unpaid invoices are excluded from the overdue KPI.
- **Payment KPI Unit**: Measured in invoices (Tagihan), accurately reflecting that a single student may hold multiple separate invoices. Labeled appropriately to avoid ambiguity.
- **Date Filtering**:
  - `Income/Expense` uses `transaction_date` in journals.
  - `Invoice Flow` metrics correctly use `created_at` (or relative `due_date`).
- **Balance As-Of Semantics**: Labeled explicitly as "Saldo Saat Ini" for Cash & Bank and Fund balances to avoid misleading interpretations of historical time-travel filters.
- **Liquid Balance Invariant**: Restricted strictly to ASSET accounts with a `CASH` or `BANK` subtype. Accounts like `RECEIVABLE` are explicitly filtered out.
- **Fund Restriction**: Distinguishes restricted vs unrestricted funds based on the authoritative `restriction_type` column on `finance_funds`.
- **ZISWAF Separation**: Exclusively uses independent ZISWAF aggregation routines. ZISWAF donations are shielded from academic flows, and academic payments do not inflate ZISWAF metrics.
- **Reconciliation Difference**: 0 (Fully verified during academic receivable reconciliation logic).
- **Reversal Semantics**: Uses Compensated Sequencing properly in the trend chart by acknowledging both the original `REVERSED` transaction and the compensating `POSTED` reversal, canceling them identically on the transaction ledger without duplication.
- **Scholarship limitation**: No scholarship logic is included.

## Quality Assurance
- **375px / 768px / 1280px**: Responsive cards and charts are preserved correctly.
- **Error States**: Handled fallback gracefully using Suspense for `useSearchParams()` boundaries.
- **Preview**: Vercel preview environments build cleanly.

## Release Status
- **Pending**: Production rollout pending final authorization.
