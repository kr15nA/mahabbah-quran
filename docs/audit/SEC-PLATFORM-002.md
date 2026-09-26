# Security Audit: SEC-PLATFORM-002 (Environment Validation)

**Date**: 2026-09-26
**Target Phase**: Implementation
**Task ID**: SEC-PLATFORM-002
**Agent**: AGENT-1
**Context**: Mahabbah System Platform Security

## 1. Goal
Implement centralized reusable environment validation primitives using Zod, ensuring safe execution models without eager Next.js build-time disruption and without leaking secrets in errors.

## 2. Implementation Overview
- Created `lib/config/env.ts` with lazy validation functions: `getDatabaseUrl`, `getJwtSecret`, `getAnthropicApiKey`, `getBlobToken`.
- Centralized validation sanitizes Zod errors, exposing only the variable name and reason (e.g. "Cannot be empty"), stripping the actual provided invalid value to prevent secret leaks in logs.
- Refactored `DATABASE_URL` consumers (`lib/db/client.ts`, `drizzle.config.ts`, `scripts/migrate.ts`) to use `getDatabaseUrl()`.
- Refactored `getJwtSecretKey()` in `lib/auth/session.ts` to use `getJwtSecret()`.
- Refactored AI services to call `getAnthropicApiKey()`. This guarantees a safe feature boundary failure (throws and returns sanitized error to the caller) rather than a silent failure.
- Refactored Vercel Blob integrations in `lib/media/storage.ts` to lazily call `getBlobToken()`, failing safely if invoked without configuration.

## 3. Findings & Resolution
- **Issue**: Next.js Build Time and Feature Optionality.
  **Resolution**: Adopted Option A (Lazy Validation). Rather than a global `env.mjs` parsing everything on boot (which blocks `next build` if optional AI secrets are absent and breaks migration scripts), variables are validated strictly when their specific subsystem is invoked.
- **Issue**: Wrong-DB ownership protection.
  **Resolution**: Left unresolved by design. Format validation (e.g., regex `^postgres://`) cannot determine DEV vs PROD ownership. `EXPECTED_DB_BRANCH` is preserved in testing scripts, but runtime ownership verification remains out of scope for SEC-PLATFORM-002.

## 4. Verification Check
- [x] Zod is used to validate environment variables.
- [x] Validation errors do not leak secrets in stack traces.
- [x] `DATABASE_URL` validates at DB config boundary.
- [x] `JWT_SECRET` validates at session boundary.
- [x] Optional feature secrets (AI, Media) are scoped.
- [x] Unrelated startup/build does not break when optional secrets are absent.
- [x] All test suites pass.

## 5. Result
**PASS**. Implementation meets acceptance criteria without introducing new third-party dependencies, adhering tightly to Next.js App Router architectures.
