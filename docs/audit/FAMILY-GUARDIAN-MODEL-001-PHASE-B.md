# FAMILY-GUARDIAN-MODEL-001-PHASE-B AUDIT

## Phase B1: Admin Guardian Management UI (RELEASE CANDIDATE)

### Authorization Security
- **Strict Role-Based Access Control (RBAC):** We removed all hardcoded `session.role === 'ADMIN' | 'SUPER_ADMIN'` checks across the Student Detail page (`app/admin/santri/[id]`) and its associated Server Actions.
- **Canonical Permission:** The required permission is strictly `system.user.manage`. The page route (`page.tsx`) and all Server Actions in `lib/guardians/manage.ts` validate this using `requirePermission('system.user.manage')`.
- **Test Backdoor Removal:** We purged `TEST_MOCK_ROLE` environment bypasses from `lib/auth/rbac.ts` entirely. The production environment is pristine.

### Transaction Semantics & Audit Log Consistency
- **Audit Integration:** `lib/audit/logger.ts` was refactored to support executing `createAuditLog` within an external transaction (`tx`).
- **Atomic Operations:** 
  - `createGuardianRelationship`
  - `updateGuardianRelationship`
  - `reactivateGuardianRelationship`
  - `deactivateGuardianRelationship`
  All these utilize `@/lib/finance/tx` (Neon WebSockets) to combine the core business DB mutations (including the partial unique constraint `handlePrimaryReplacement`) alongside the `createAuditLog` insertion into a single ACID database transaction.
  
### Lifecycle and Constraints
- **Defaults:** Creating a new relationship securely defaults to `canViewAcademic: false`, `canViewFinance: false`, `canReceiveNotification: false`, and `canManageLearning: false`.
- **Updates:** Standard updates only modify explicitly allowed capabilities without overwriting or clearing reserved capabilities (`canReceiveNotification` / `canManageLearning`).
- **Reactivations:** 
  - Admin users can selectively reactivate **inactive, non-deleted** relationships (`isActive: false` & `deletedAt IS NULL`).
  - True soft-deleted records (`deletedAt IS NOT NULL`) are completely hidden from the standard operational Admin UI (via `isNull(deletedAt)` filters) and cannot be reactivated using the standard flow. If a user tries to create a new relationship when only a soft-deleted row exists, the system safely permits a fresh row creation respecting the unique schema partial indexes.

### Display Policies
- The old view modal in `StudentTableClient.tsx` was gracefully removed to favor the new `/admin/santri/[id]` route. 
- The new detail layout flawlessly preserved all critical `Santri` fields (Avatar, Nama Lengkap, Nama Panggilan, ID, Status, Program, Kelas, Guru Pengampu, Tanggal Bergabung).
- The "Edit/Add Modal" workflow from the main Santri list was intentionally preserved.

### Tests
- Tests were refactored to directly target the underlying `_Core` business logic (e.g., `_createGuardianRelationshipCore`), stripping away the route authorization wrappers and allowing precise evaluation of capability toggles, primary replacements, and edge cases.
- Authorization (`hasPermission('system.user.manage')`) is tested independently to guarantee expected blockings (e.g. Guru users) and access (e.g. Admin users).

### Next Steps (Phase B2 Deferred)
Phase B2 (which will likely include advanced Guardian batch management or cross-santri mapping) remains explicitly **deferred**.

### Migration 
No schema or migration changes were made in this phase.
