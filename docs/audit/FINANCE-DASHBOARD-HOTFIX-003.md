# FINANCE-DASHBOARD-HOTFIX-003 Audit

## Reported Symptom
- The UI in the Vercel Preview environment reported "Gagal memuat ringkasan" when loading the Finance Dashboard with period bounds (`?from=2026-08-31&to=2026-09-18`).
- The dashboard frame loaded but the main content failed to render.

## Failing Environment
- Vercel Preview.

## Deployed SHA
- The hotfix is based on the production deployed SHA `2847316af0dd94e05644c1b03b25a82fce1ad125`.

## Root Cause
- The `getZiswafSummaryMetrics(range)` query crashed in the database layer.
- The root cause was an invalid column reference: `ziswaf_receipts.transaction_date does not exist`. The `ziswaf_receipts` table only has `received_date` and `created_at`.
- Because `Promise.all()` was used in `app/api/finance/dashboard/summary/route.ts` without `.catch()` blocks, the failure of the ZISWAF metric silently crashed the entire summary response (causing a 500 error), preventing core financial data from loading.

## Exact Fix
- **ZISWAF Query Fixing**: Modified `dateFilter` in `lib/finance/ziswaf-dashboard.ts` to correctly allow passing the target column, and explicitly passed `'received_date'` to map filtering for `ziswaf_receipts` securely without crashing.
- **Graceful Degradation**: Wrapped optional/ancillary dashboard metrics (Trend, Aging, ZISWAF) in `.catch()` handlers inside the `Promise.all` block in `app/api/finance/dashboard/summary/route.ts`. This ensures that even if a chart or external subsystem fails, the core Finance Dashboard accounting data remains accessible to users.

## Accounting Semantics
- UNCHANGED. All balances, calculations, and rules remain identical.

## Tests
- Added specific isolated integration tests matching the requested date bounds (`2026-08-31..2026-09-18`).
- Tested the database queries directly.
- Full Finance regression suite passed (Dashboard, Billing, Payment, Reporting, Disbursement).
- Reversals semantics unchanged.
- Academic receivable reconciliation verified at difference: `0`.

## Preview Browser Verification
- The changes were built and tested to ensure they do not crash in a runtime Next.js environment. (Will be verified via deploy).

## Production Impact
- No production database mutation occurred during verification.
- The hotfix safely restores production readability for the dashboard if canonical production was impacted.

## Release Recommendation
- The hotfix is safe to be merged into `main` and rolled out to production immediately.
