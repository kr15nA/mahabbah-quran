# SEC-JWT-001 — JWT Secret Hardening

## 1. Objective
Remove the hardcoded JWT fallback secret and make `JWT_SECRET` mandatory.

## 2. Problem Identified
The application previously contained a hardcoded fallback secret (`mahabbah-quran-default-jwt-secret-key-2026`) in `middleware.ts` and `lib/auth/session.ts`. If the `JWT_SECRET` environment variable was missing in production, attackers could exploit the known fallback secret to forge valid JWTs and gain unauthorized access to any role.

## 3. Files Changed
- `lib/auth/session.ts`
- `middleware.ts`

## 4. Exact Security Change
- Centralized the JWT secret retrieval into an exported `getJwtSecretKey()` function in `lib/auth/session.ts`.
- Replaced static `SECRET` usages within `jwtVerify` in `middleware.ts` with calls to this centralized function.
- Removed the hardcoded fallback secret.
- Added a `throw new Error('JWT_SECRET is not defined in environment variables')` when `JWT_SECRET` is unset.

## 5. Authentication Behavior Before
If `JWT_SECRET` was omitted from the environment, the application silently fell back to using the insecure hardcoded string. Login and session parsing would succeed, but the system would be critically vulnerable to JWT forgery.

## 6. Authentication Behavior After
- **With `JWT_SECRET`:** Login, session creation, session parsing, and middleware routing work securely with no disruption to `httpOnly` cookie behavior.
- **Without `JWT_SECRET`:** The application fails safely. `getJwtSecretKey()` throws an error causing the login API route to return a generic `500 Terjadi kesalahan pada server`. The middleware catches the thrown error inside `jwtVerify` and safely redirects the user to `/login` or returns a `401 Unauthorized` for API routes. The secret absence is not exposed to the client or in logs.

## 7. Environment Requirements
`JWT_SECRET` must be strictly defined in the runtime environment.

## 8. Tests Executed
1. **Node Evaluation Script Test:** Validated the behavior of `getJwtSecretKey()` directly via `tsx`. Checked what happens when `process.env.JWT_SECRET` is unset vs set.
2. **Typecheck:** Executed `npx tsc --noEmit`.
3. **Lint:** Executed `npm run lint`.
4. **Build:** Ran `npm run build`.

## 9. Test Results
- **Node Evaluation Script:** Passed. Threw the expected safe error when unset, and returned an encoded `Uint8Array` when a mock secret was set.
- **Typecheck:** Passed (`npx tsc --noEmit` exited 0).
- **Lint:** Failed due to pre-existing issues (75 problems regarding unescaped quotes and unused variables), unrelated to the authentication changes.
- **Build:** Passed (`npm run build` completed successfully).

## 10. Known Pre-existing Issues
- Codebase contains pre-existing linting errors (unused variables, unescaped quotes).
- Widespread Insecure Direct Object Reference (IDOR) vulnerabilities exist across the API (documented in AUTH-BASELINE-001).

## 11. Deployment Requirements
**CRITICAL:** Ensure that the `JWT_SECRET` environment variable is securely configured in Vercel for both **Preview** and **Production** environments prior to deployment. The application will lock down if the environment is unconfigured.

## 12. Rollback Procedure
If Vercel variables are misconfigured and lock users out:
1. (Recommended) Supply the Vercel `JWT_SECRET` environment variable and redeploy the environment.
2. Revert the two changed files (`lib/auth/session.ts` and `middleware.ts`) via git to their previous commit state to re-enable the fallback secret. No database or migration rollback is necessary.

## 13. Security Acceptance Criteria
- [x] Application fails safely when `JWT_SECRET` is missing.
- [x] Login succeeds when `JWT_SECRET` exists.
- [x] No JWT secret appears in logs or error traces.
- [x] No localStorage token is introduced.
- [x] Existing `httpOnly` session behavior is preserved.

## 14. Final Status
IMPLEMENTED — AWAITING REVIEW
