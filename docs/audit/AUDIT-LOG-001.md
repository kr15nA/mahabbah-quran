# AUDIT-LOG-001: Audit Trail Foundation

## Objective
Establish a server-side, append-only audit trail foundation that records administrative mutations securely.

## Data Model
- **Table**: `audit_logs`
- **Columns**:
  - `id`: bigserial PK
  - `actor_user_id`: bigint FK -> `users.id` (ON DELETE SET NULL)
  - `action`: varchar (CREATE, UPDATE, DELETE, etc.)
  - `entity_type`: varchar (USER, CLASS, ACADEMIC_YEAR, etc.)
  - `entity_id`: bigint
  - `old_values`: JSONB
  - `new_values`: JSONB
  - `metadata`: JSONB
  - `created_at`: timestamp with time zone (defaults to now())

## Rules & Security
1. **Actor Identity**: `actor_user_id` MUST be sourced from the authenticated server session (`requireAuth()`). It is NEVER accepted from client input.
2. **Sensitive Fields**: Passwords, hashes, and tokens (e.g., `fcm_token`, `accessToken`) are recursively stripped from `old_values`, `new_values`, and `metadata` objects and arrays before writing to the database using the `createAuditLog` helper.
3. **Immutability**: The `audit_logs` table is strictly append-only. This is enforced at the application/API layer (there is no API exposed to modify or delete logs). No database-level triggers are used.
4. **Actor Survival**: The `actor_user_id` FK is configured with `ON DELETE SET NULL`, meaning audit records will survive if a user is hard-deleted or soft-deleted.

Neon HTTP (the database driver in use) does not natively support interactive multi-statement transactions. Because of this architectural limitation, the business mutation and audit write are NOT atomic. 

**KNOWN CONSISTENCY RISK**: Audit delivery is non-atomic with the business mutation in current integrations. If the server crashes after the business mutation succeeds but before `createAuditLog` executes, the business data changes but the audit log is permanently lost. This is not fully transactional.

**Convention**:
- The `createAuditLog` helper MUST be called immediately *after* a successful business mutation.
- A failed business mutation must NEVER call `createAuditLog`.
- No successful API response is produced if the business mutation fails.

## Implemented Integrations
- **Teacher Assignment**: Audit logs capture historical and active teacher assignments (`action: CREATE/UPDATE`).
- **User Management (Guru)**: Captures user creation, update, activation, and archiving (`action: CREATE/UPDATE/ACTIVATE/DEACTIVATE/ARCHIVE`). Note: "User Management" currently tracks Guru management only. Operations on other user types are not instrumented yet.
- **Academic Year**: Captures year creation, update, and activation (`action: CREATE/UPDATE/ACTIVATE/DEACTIVATE`). When a year is activated, it also logs `DEACTIVATE` for the previously active year.
- **Enrollment**: Captures student enrollment changes (`action: CREATE/UPDATE`).

## Read API
- **Endpoint**: `GET /api/audit-logs`
- **Access**: `SUPER_ADMIN` only.
- **Filters**: `actorUserId`, `action`, `entityType`, `entityId`, `limit`, `offset`.
