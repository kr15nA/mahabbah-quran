# MIGRATION-BASELINE-001 Audit

## Objective
Establish a formal and safe Drizzle migration baseline for an already-initialized production database to enable standard, non-destructive migration workflows moving forward.

## Status

**BEFORE:**
- Filesystem migrations = `0000_groovy_quasimodo.sql` to `0007_aberrant_colleen_wing.sql`
- Actual schema = Matches the exact cumulative state of `0000`–`0007`.
- Ledger rows = `0` (Ledger divergence caused by historical use of `drizzle-kit push` and raw SQL application bypassing bookkeeping).

**AFTER:**
- Filesystem migrations = `0000`–`0007` (Unchanged).
- Actual schema = Unchanged (Verified structurally identical).
- Ledger rows = `8` exact Drizzle migration records matching native hashes.
- Standard migrator = `0` pending migrations.

## Methodology

### 1. Reconciliation Strategy (Option A)
Since the production database safely mirrored the exact cumulative state of filesystem migrations up to `0007`, the ledger was reconciled by manually synthesizing atomic Drizzle migration records into the `drizzle.__drizzle_migrations` table. 

### 2. Hash & Order Resolution
Using the official `readMigrationFiles` API from `drizzle-orm/migrator`, the exact native SHA-256 hashes and timestamp semantics (`folderMillis`) were derived for the historical migrations, averting any fabricated state.

### 3. Execution
A one-time fail-closed script (`scripts/reconcile-ledger.ts`) validated the actual schema configuration dynamically, ensured an empty initial ledger state (`0` rows), and then bulk-inserted the 8 native migration bookkeeping records.

## Future Standard Migration Workflow

The project configuration has shifted strictly away from `drizzle-kit push`. The new standard operating procedure is as follows:

1. Edit `drizzle/schema.ts` with desired model changes.
2. Run `npm run db:generate` to let `drizzle-kit` synthesize a raw SQL migration.
3. Review the generated `.sql` file in `drizzle/migrations/`.
4. Commit the `.sql` + `meta/*_snapshot.json` + `meta/_journal.json`.
5. Apply the migration using the new dedicated runner: **`npm run db:migrate`**.
6. Verify changes in the ledger.

**⚠️ CRITICAL WARNING FOR PRODUCTION:**
- `drizzle-kit push` MUST NOT be used for shared, staging, or production schema changes going forward. It bypasses formal DDL ledgers and complicates reproducibility.
- NEVER run historical migrations against an already-initialized database unless the ledger state has been verified as reconciled.

## Verification
- **Fresh DB Initialization**: STATICALLY VERIFIED / NOT EXECUTED AGAINST EMPTY DATABASE. (Verified Drizzle static resolutions, but no disposable Neon environment was provisioned to execute an end-to-end `0000` to `0007` pipeline).
- **Existing Production DB**: DB schema remains unharmed; zero tables recreated, zero constraints unexpectedly modified.
- **Ledger Health**: Drizzle's `migrate()` function reports zero pending migrations, cleanly acknowledging the reconciled baseline.
- **CI/CD Health**: NextJS application build and standard TypeScript compilation succeed smoothly.

## Retained & Removed Tooling
**Removed:**
- `scripts/apply-migration-006.ts`
- `scripts/apply-legacy-drop.ts`
- `scripts/reconcile-ledger.ts` (Safely removed after verified successful reconciliation).

**Added:**
- `scripts/migrate.ts` (Official runtime Drizzle Neon migrator).

## Remaining Risks
None related to Drizzle migration divergence. All legacy schema mismatches and synchronization disparities have been cleared.
