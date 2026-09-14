# AUDIT: FINANCE-REPORTING-001

## 1. Goal 
Implement operational management reporting for the Finance and ZISWAF domains, including authoritative spreadsheet export capability with stringent sanitization and dual-permission RBAC. 

## 2. Architecture & Services
All reports are strictly decoupled from standard UI route handlers and are served out of specialized files in `lib/finance/reports/`:
- **`ledger.ts`**: Journal report, account mutation, cash/bank.
- **`academic.ts`**: Billing, collections, receivable aging, reconciliation.
- **`funds.ts`**: Fund liquid balances and period mutasi.
- **`ziswaf.ts`**: Receipts, ziswaf-fund breakdown, campaigns.
- **`disbursements.ts`**: Expense workflow tracking and net expense.
- **`utils.ts`**: Standardized filters and pagination boundaries.
- **`export.ts`**: Sandbox library mapping tabular JSON natively into `.xlsx` using the installed `xlsx` package, protecting formulas with rigorous CSV-injection escaping.

## 3. Data Integrity & Ledger Semantics
- **Reversal Safety**: Any originally reversed transaction retains its `POSTED` or `REVERSED` mark and its original effective period. The reversal journal similarly anchors itself to its own effective timestamp.
- **Account Normal Balance**: All ledger-based account queries follow traditional accounting normal balances (e.g. Asset net = Debit - Credit, Income net = Credit - Debit).
- **Fund Liquid State**: Calculates precisely based on Cash/Bank accounts without conflating income-expense aggregates.
- **BigInt Safety**: No query amounts are cast to JS `Number`. Totals natively sum as strings up through the HTTP JSON serialization and are written directly as exact strings into Excel to prevent large-money floating point inaccuracies.

## 4. UI Layer
- 12 comprehensive SSR/Client reports configured under `/admin/keuangan/laporan`.
- Reports share generic standardized wrappers (`ReportViewer`, `ReportHeader`, `ReportPagination`, `ExportButton`).
- Implemented `@media print` directives across components to yield a clean A4 printed view directly from the browser (satisfying V1 without massive PDF scope).

## 5. Security & RBAC 
- **View Access**: `finance.report.view` governs standard JSON read-only display.
- **Export Access**: Generating an `.xlsx` strictly requires BOTH `finance.report.view` AND `finance.report.export` permissions natively at the API route level.
- **Audit Logger**: Every export request invokes `FINANCE_REPORT_EXPORT` saving filters, format, and row count securely to `audit_logs` without dumping sensitive PII.
- **Data Cap**: Hard ceiling of 10,000 rows arbitrarily limits DoS vectors natively at the XLSX Buffer generator. 

## 6. Regression Testing
`scripts/test-finance-reporting-001.ts` comprehensively asserts:
- Spreadsheet sanitization logic traps `=`, `+`, `-`, `@`.
- XLSX big-integer strings persist correctly across IO round trips.
- Aging buckets distribute properly (1-30, 31-60, >90 etc).
- Account semantic directionalities natively enforce normal balance rules.
- Missing `asset_subtype` correctly trips the configuration alarm in Fund reporting. 
- Full integration within the standard Core Finance regression suite.

## 7. Next Steps
- Expand cross-module reporting metrics (e.g., HR/Payroll integration when built).
- Transition to server-side PDF stream if stakeholder demands strict lock-down formatting.
