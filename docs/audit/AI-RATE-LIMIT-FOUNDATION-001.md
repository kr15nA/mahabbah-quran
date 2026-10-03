# AI-RATE-LIMIT-FOUNDATION-001 Audit

## Overview
Implemented generic, PostgreSQL-backed, fixed-window rate limiter designed for serverless environments. Initially targeted for AI generation requests but generic enough for other workloads.

## Implementation Details
- **Database Backend**: PostgreSQL / Neon
- **Table**: `rate_limits`
- **Algorithm**: Fixed window using atomic upsert (`INSERT ... ON CONFLICT DO UPDATE`)
- **Primary Key**: Composite `(namespace, subject_key)`
- **Subject Privacy**: Uses `SHA-256` hash of exact canonical server-owned subject. No lowercase normalization to preserve exact identity. No raw PII is stored or logged.
- **Clock Authority**: Strictly uses PostgreSQL `NOW()` for timing (e.g., `make_interval(secs => ${windowSeconds})`).
- **SQL Execution**: Fully parameterized SQL. No interpolation of limits or strings. Single atomic DB statement per request.
- **Count Cap**: Abusive requests are capped at `limit + 1`.
- **Retry Semantics**: Derived exclusively from DB clock (`expires_at`), returning `retryAfterSeconds` calculated within the atomic SQL returning clause.
- **Fail Policy**: Throws explicit infrastructure error to support Fail Closed policy.

## Architecture State
- **Login Table**: Untouched (`login_rate_limits` behaves as before).
- **Redis Dependency**: None. V1 is purely PostgreSQL.
- **In-memory Authority**: None.
- **Cleanup Background Job**: None (overwritten opportunistically on active collision).

## Verification Evidence
- ✅ DEV/QA Guarded tests: `scripts/test-rate-limit-foundation.ts`
- ✅ Sequential Tests: 1-5 allowed, 6+ denied. Remaining decreases to 0.
- ✅ Concurrency Evidence: 10 parallel requests -> exactly 5 allowed, 5 denied.
- ✅ Expiry Reset: After waiting window expiry, request succeeds, count resets.
- ✅ Isolation: Independent namespace/subject combinations don't collide.
- ✅ Security `fast` suite passes.
- ✅ No Production mutation (Migration 0024 applied ONLY to DEV/QA).
- ✅ No Preview mutation.

## Migrations
- Migration: `0024_easy_swordsman.sql`
- Status: Applied DEV/QA only. PRODUCTION/PREVIEW NOT RUN.

## Process Deviations
- **PROCESS DEVIATION 1**: Migration 0024 was invoked before final canonical database safety verification. Subsequent safe endpoint verification established the affected database as DEV/QA. Production and Preview were not migrated.
- **PROCESS DEVIATION 2**: During implementation, a command printed DATABASE_URL from .env.local into tooling output. The affected environment was DEV/QA. No credential value is recorded in canonical documentation. DEV/QA credential rotation is required before PASS closeout.

**DEV/QA CREDENTIAL ROTATION**: REQUIRED / NOT YET VERIFIED

**STATUS**: IMPLEMENTED
