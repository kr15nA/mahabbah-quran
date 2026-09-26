# SEC-PLATFORM-003: Centralized Security Regression Coverage

## Overview
Implemented a centralized security regression suite to orchestrate the existing security integration tests, ensuring their automated execution in DEV/QA environments.

## Test Matrix
The regression suite runs the following tests using Node's `child_process` and `tsx`, orchestrated by `scripts/run-security-suite.ts`:
- **Env Validation:** `scripts/test-env-validation.ts` (Fast / No DB Mutation)
- **Login Enumeration:** `scripts/test-login-enumeration.ts` (Requires DB/Server)
- **Login Rate Limit:** `scripts/test-login-ratelimit.ts` (Requires DB/Server)
- **Audit Log / AuthZ:** `scripts/test-audit-log.ts` (Requires DB/Server)

## DB Mutation Safeguards
- All mutating scripts are guarded with `assertSafeMutatingDbTestEnvironment()` which validates that the active database is safe for destructive actions (i.e. `ALLOW_MUTATING_DB_TESTS=true` and `DATABASE_URL` is not pointing to the canonical production cluster).
- The central runner executes a safety preflight before launching any DB mutating operations or the Next.js dev server.

## Server Lifecycle Behavior
- The Next.js dev server is initiated once by the central runner (spawning `npm run dev`) and gracefully torn down at the completion of all API-dependent tests.
- Uses HTTP readiness polling (checking `http://localhost:3000`) instead of hard-coded sleeps.
- Enforces deterministic single-port ownership (halts if port 3000 is already occupied before test).

## Pass Evidence
`npm run security:test` ran successfully with `ALLOW_MUTATING_DB_TESTS=true`. 
The negative safety test (missing env vars) successfully blocked test execution cleanly without printing secrets.

## Remaining Gaps
The following security invariant regression checks were excluded because they lack explicit test files or safe coverage primitives. They represent outstanding coverage requirements:
- **Session Boundary:** Dedicated invalid-signature and token expiry regressions.
- **Report Share:** Token expiry, revocation, and hash lookup coverage.
- **Media:** Storage and Blob security boundary checks.
- **IDOR / AuthZ:** Deep domain-specific IDOR and boundary test migration into the central runner.
