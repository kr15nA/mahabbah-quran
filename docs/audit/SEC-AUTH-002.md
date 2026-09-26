# SEC-AUTH-002: Login Credential Enumeration Hardening

## Overview
- **Date:** 2026-09-26
- **Status:** PASS
- **Target:** `app/api/auth/login/route.ts`

## Discovered Vulnerability
The login route exposed distinguishable external responses for different failure scenarios (e.g., 401 "Pengguna tidak ditemukan" vs 401 "Password salah" vs 403 "Akun telah dinonaktifkan"). Additionally, the `bcrypt.compare` operation was skipped for nonexistent and inactive accounts, resulting in a significant timing discrepancy (timing enumeration oracle) allowing unauthenticated callers to differentiate between valid accounts with incorrect passwords and invalid/nonexistent accounts.

## Implemented Mitigation
1. **Response Normalization:** All credential failures (nonexistent user, wrong password, inactive account) now uniformly return HTTP `401 Unauthorized` with the generic JSON response: `{"error": "Email/HP atau password tidak valid"}`.
2. **Timing Hardening:** The login route always executes `bcrypt.compare`. If a user is not found, it compares the provided password against a static dummy hash (`DUMMY_PASSWORD_HASH`) matching the repository's cost factor (cost=10).

## Exact External Contract
- **HTTP STATUS:** 401
- **JSON SHAPE:** `{ "error": "Email/HP atau password tidak valid" }`

*Rate limits remain protected under a distinct 429 contract.*

## Test Evidence
- **Integration Test:** `scripts/test-login-enumeration.ts` successfully verified that nonexistent accounts, wrong passwords, and inactive accounts return the exact same 401 generic contract externally, while still preserving successful authentication pathways and proper rate limit regressions.

## Residual Timing Limitation
The solution mitigates the major `bcrypt` timing difference. It does not provide perfect constant-time execution, as minor timing discrepancies may remain from variable database query execution (e.g., email vs phone fallback queries) prior to the `bcrypt` step.
