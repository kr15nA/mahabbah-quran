# AUDIT: USER-PROFILE-001

## Architecture Overview
The `USER-PROFILE-001` feature implements a unified, self-service profile management system accessible across all role portals (`/admin/akun`, `/guru/akun`, `/orang-tua/akun`). 
The logic is unified in a reusable React Client component (`UnifiedAccountClient`) and a set of secure Server Actions (`lib/profile/actions.ts`).

### Identity vs Domain Profile Separation
- **Identity**: Identity attributes (full name, phone, password, avatar) are stored in the core `users` table and editable securely via this self-service profile page.
- **Domain Profiles**: Contextual domain logic (e.g., linked students for parents, assigned classes for teachers) is aggregated securely using domain queries. The interface aggregates these links to display context, but it does NOT allow editing domain assignments in this flow. Domain assignments remain strictly under administrative RBAC domains.

## Editable & Read-Only Fields
- **Editable**: `fullName`, `phone`, `avatarUrl`
- **Read-Only**: `email` (part of authentication identity, must be updated via a dedicated admin or re-authentication flow), `legacy_role`, `dynamic_roles`, and `permissions`.

## Target Security & Mass-Assignment
- Server actions completely ignore any `userId` or identity context provided by the client form data.
- The mutation target is hard-locked to `session.userId` securely fetched via `requireAuth()`, completely eliminating IDOR risks.
- Mass-assignment is mitigated because the server explicitly picks `full_name`, `phone`, and `avatarUrl` from the payload, discarding all other inputs.

## Password Security
- Passwords are changed via a dedicated tab and isolated form.
- The current password is mathematically validated using bcrypt before any change is permitted.
- The new password strictly enforces length policies, must not equal the current password, and requires confirmation.
- Plaint-text passwords are never persisted.
- The audit log for `PASSWORD_CHANGED` intentionally records `null` for both `oldValues` and `newValues` to preserve secrecy.

## Avatar Media & Cleanup Ordering
- The file upload endpoint (`/api/upload`) explicitly restricts arbitrary entity targets for self-uploads by defaulting the entity lock to `session.userId`.
- Replaced the unsafe global deletion of old blobs in `lib/media/index.ts` with a safe, decoupled pattern.
- **Cleanup Guarantee**: The old avatar blob is ONLY queued for deletion strictly *after* the database commits the new profile update and `AVATAR_UPDATED` audit log. This guarantees no orphaned profiles and protects against database failure modes.

## Transaction Mechanism
- Modified server actions to use the existing Neon `Pool`-based `financeDb` connection (aliased as `txDb` in profile actions) exported from `lib/finance/tx.ts`. 
- This leverages the pre-existing serverless transaction infrastructure, enabling a **true PostgreSQL transaction**.
- **Inside the DB transaction**: Profile table updates (`users`) and audit log inserts (`PROFILE_UPDATED`, `PASSWORD_CHANGED`, `AVATAR_UPDATED`) are grouped together. If any fails, the entire DB transaction rolls back safely.
- **Outside the DB transaction**: Blob storage deletion (cleaning up the old avatar) occurs strictly outside the DB transaction. Blob deletion is inherently non-transactional in PostgreSQL; thus, it runs only *after* the DB transaction successfully commits.

## Linked Profile Behavior
- The context aggregation purely queries actual DB relationships (`teacher_assignments`, `student_parents`, etc.). It avoids inferring relationships based solely on user role, maintaining strict truth.

## RBAC Display
- Uses a unified helper `getEffectivePermissions(session.userId)` to extract dynamic permissions by joining `user_roles`, `role_permissions`, and `permissions`.
- Ensures accurate read-only display of granted privileges on the user interface.

## Regressions
- **Media Regression**: No global media lifecycle behavior was changed. Existing media behavior is preserved for all non-profile callers. The profile/avatar flow explicitly opts into deferred cleanup (`cleanupPrevious: false`) to guarantee avatar DB consistency.
- **RBAC & Finance**: Verified safe, isolated behavior.
- **Build**: Successfully passed strict typescript `npx tsc --noEmit` checks and testing.

## Production Status
- **Pending Rollout**: No database migrations were executed, no schema pushed. No production data was altered. This update is safe for immediate deployment.

## Release Info
- **Feature SHA**: 9c2963a
- **Main Release SHA**: dc301389afd90359d91306c515c3429ccdca56e3
- **Production Deployed SHA**: dc30138
- **Deployment Status**: Ready
- **Smoke Results**: PASS (/login 200, protected routes 307 redirect)
- **Authenticated Smoke**: NOT AVAILABLE
- **Migration**: None
- **Release Date**: 2026-09-17T15:08:55Z

