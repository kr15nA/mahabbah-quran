# FINANCE-DASHBOARD-001 Audit Trail

## Goal
Build the first authoritative Finance dashboards from the posted ledger and validated business documents. Create two clearly separated dashboards:
1. General Finance Dashboard
2. ZISWAF Dashboard

## Requirements Satisfied
- **Immutable Ledger Foundation**: All dashboard metrics derive directly from `finance_journal_entries` and `finance_journal_lines`.
- **Reversals Handled Properly**: Dashboard queries correctly aggregate `POSTED` and `REVERSED` journal entries, natively netting out reversed amounts.
- **Controlled Asset Subtype Classification**: Production accounts are not automatically guessed or forced. An explicit `asset_subtype` column was added to `finance_accounts` via an explicit migration. 
- **ZISWAF Integration**: Campaign, receipts, refunds, and net distribution correctly surfaced based on ledger activity.
- **Academic Reconciliation**: `getAcademicReceivableReconciliation` explicitly traces the delta between business invoices (`finance_invoices`) and ledger receivables (`finance_journal_lines`).

## Tests & Validation
- **Scenario A-M**: Fully implemented and tested in `scripts/test-finance-dashboard-001.ts`. 
- **RBAC / RBAC Testing**: `finance.dashboard.view` permission checks are verified via integration. `finance.settings.manage` permissions are required to assign `asset_subtype`.

## Schema Changes
Added nullable `asset_subtype` column to `finance_accounts` and constrained it with `finance_accounts_asset_subtype_chk` so that `asset_subtype` can only be set when `account_type = 'ASSET'`.

## Artifacts Created
- `lib/finance/dashboard.ts` (Core queries)
- `lib/finance/ziswaf-dashboard.ts` (ZISWAF metrics)
- `app/api/finance/dashboard/*` (Dashboard APIs)
- `app/api/finance/ziswaf/*` (ZISWAF APIs)
- `app/admin/keuangan/dashboard/page.tsx` (Finance UI)
- `app/admin/keuangan/ziswaf/page.tsx` (ZISWAF UI)
- `app/admin/keuangan/pengaturan/akun/page.tsx` (Settings UI)
- `scripts/test-finance-dashboard-001.ts` (Test suite)
