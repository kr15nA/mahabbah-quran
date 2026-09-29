# SEC-PLATFORM-003: Centralized Security Regression Coverage

## Overview
Implemented a centralized security regression suite to orchestrate the existing security integration tests, ensuring their automated execution in DEV/QA environments safely. The suite scope is explicitly LOCAL / DEV-QA ONLY.

## Test Matrix
The regression suite runs the following tests using Node's `child_process` and `tsx`, orchestrated by `scripts/run-security-suite.ts`:
- **Env Validation:** `scripts/test-env-validation.ts` (Fast / No DB Mutation)
- **Login Enumeration:** `scripts/test-login-enumeration.ts` (Requires DB/Server)
- **Login Rate Limit:** `scripts/test-login-ratelimit.ts` (Requires DB/Server)
- **Audit Log / AuthZ:** `scripts/test-audit-log.ts` (Requires DB/Server)

## Safety Architecture

### A. DB Test Safety
Mutating tests independently guard their execution. They require:
- Explicit human opt-in via `ALLOW_MUTATING_DB_TESTS=true`
- An explicitly approved DEV/QA marker via `MUTATING_DB_TEST_ENV`
- An exact expected Neon endpoint identity via `EXPECTED_DB_BRANCH` (parsed from `DATABASE_URL` via URL parsing, not weak substring/prefix matching)
- Production deny defense-in-depth (hard deny for known production cluster ID)

### B. Server Safety
- **Port Availability Preflight:** Uses a strict Node `net.createServer().listen()` bind-based check on port 3000 to halt if the port is already occupied before the suite begins.
- **Server Launch:** The central runner spawns exactly one Next.js dev server.
- **Readiness:** Uses bounded HTTP readiness polling to wait for server initialization.
- **Teardown:** The runner executes process-group teardown strictly in a `finally` block, ensuring no `process.exit` paths bypass the shutdown.

### C. Fixture Safety
- **Login Enumeration & Rate-Limiting:** Test-generated user fixtures and tracking/limiter keys are strictly cleaned up within `finally` blocks using app-standard utilities (`resetLoginAttempt`).
- **Audit Integration:** Creates strictly isolated academic year and guru fixtures. Modifies no real shared records intentionally (e.g. refrains from toggling the real active academic year).

## Audit Coverage Specifics
- **Academic Year:** CREATE and UPDATE remain validated through real integration tests. ACTIVATE and DEACTIVATE are verified via **structural regression only** within this suite, because toggling the active year state modifies real shared DB constraints.
- **Historical Evidence:** The prior `AUDIT-BASE-001` real integration evidence for Academic Year ACTIVATE/DEACTIVATE on staging databases remains documented as valid and is preserved historically.
- **Guru:** ACTIVATE and DEACTIVATE are fully validated through real integration tests on test-owned Guru fixtures.

## Remaining Gaps
The following security invariant regression checks were excluded because they lack explicit test files or safe coverage primitives. They represent outstanding coverage requirements:
- **Session Boundary:** Dedicated invalid-signature and token expiry regressions.
- **Report Share:** Token expiry, revocation, and hash lookup coverage.
- **Media:** Storage and Blob security boundary checks.
- **IDOR / AuthZ:** Deep domain-specific IDOR and boundary test migration into the central runner.
