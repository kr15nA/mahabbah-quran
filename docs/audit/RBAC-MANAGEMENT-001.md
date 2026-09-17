# RBAC Management 001 - Release Audit

## Architecture
The RBAC management leverages the existing `roles`, `permissions`, and `role_permissions` schema natively through additive assignments. It strictly limits mutation capabilities to the subset required for dynamic role assignments (Create, Read, Edit, Assign, Revoke) using explicit, diff-based data syncing logic.

## Legacy Compatibility
The legacy `users.role` property remains untouched. Users operating strictly with these baseline definitions will continue to function without any interruption. Dynamic roles effectively extend baseline permissions using an inclusive policy map within `hasPermission`.

## system.role.manage
A discrete `system.role.manage` permission ensures access control over all Role Management APIs and components. This is fully integrated into the existing deterministic `hasPermission` framework.

## Role Code Immutability
To ensure consistent lookup behavior throughout the application, `code` strings are rendered immutable post-creation. Reassignments solely reference unique identifiers (PK IDs), bypassing structural brittleness.

Role lifecycle/deletion is intentionally out of scope for V1 and is not supported by the application.

## User-Role Diff Syncing
`syncUserRoles()` correctly parses incoming requests by analyzing delta gaps between currently assigned IDs and requested IDs, effectively guaranteeing atomic, deduplicated multi-role synchronisation against the target.

## Self-Lockout Rules
Hardened internal validations within `actions.ts` inherently reject alterations submitted against a `SUPER_ADMIN`'s own account ID. Administrators must manipulate their peers instead of themselves.

## Audit Logging
All non-read mutations record an encompassing footprint containing actor context, targeted ID, and exact delta parameters (`newValues`) under distinct actions (`ROLE_CREATED`, `USER_ROLE_ASSIGNED`, etc.).

## Transaction/Atomicity Behavior
Status: **FULLY COMPENSATED** (with native db.batch atomicity)
Through the `drizzle-orm/neon-http` adapter, simple updates (`updateRoleWithPermissions`, `syncUserRoles`) are passed as an array of statements directly to `db.batch()`, executing perfectly as an atomic transaction within Neon.
For `insertRoleWithPermissions`, because `db.batch()` cannot pass generated serial IDs (e.g., `newRole.id`) internally to subsequent queries, a manual robust FULL COMPENSATION pattern is enforced: if permissions or audit events fail post-creation, the function actively orchestrates a deterministic cleanup of the newly written role row, throwing a clear failure error upwards while maintaining system integrity.

## Known Limitations
- Partial sequential failures do NOT orphan assignments thanks to strict rollback/compensation execution block.

## Test Results
1. `test-rbac-management-001.ts` => PASS (Diff Sync, Idempotency, Validation, Cleanup)
2. `test-finance-foundation-harden-001.ts` => PASS (Auth regression continuity)
3. `rbac-audit.ts` counts successfully maintained.

## Production Rollout Pending
Development sandbox only. Production databases have not been seeded or altered.
