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
2. **Sensitive Fields**: Passwords, hashes, and tokens (e.g., `fcm_token`) are automatically stripped from `old_values`, `new_values`, and `metadata` before writing to the database using the `createAuditLog` helper.
3. **Immutability**: The `audit_logs` table is strictly append-only. There is no API exposed to modify or delete logs.
4. **Actor Survival**: The `actor_user_id` FK is configured with `ON DELETE SET NULL`, meaning audit records will survive if a user is hard-deleted or soft-deleted.

## Transaction Behavior
Neon HTTP (the database driver in use) does not natively support interactive multi-statement transactions. Because of this architectural limitation, the business mutation and audit write are NOT atomic.
**Convention**:
- The `createAuditLog` helper MUST be called immediately *after* a successful business mutation.
- A failed business mutation must NEVER call `createAuditLog`.
- No successful API response is produced if the business mutation fails.

## Implemented Integrations
- **Teacher Assignment**: Audit logs capture historical and active teacher assignments (`action: CREATE/UPDATE`).
- **User Management (Guru)**: Captures user creation, update, activation, and archiving (`action: CREATE/UPDATE/ACTIVATE/DEACTIVATE/ARCHIVE`).
- **Academic Year**: Captures year creation and activation (`action: CREATE/ACTIVATE`).
- **Enrollment**: Captures student enrollment changes (`action: CREATE/UPDATE`).

## Read API
- **Endpoint**: `GET /api/audit-logs`
- **Access**: `SUPER_ADMIN` only.
- **Filters**: `actorUserId`, `action`, `entityType`, `entityId`, `limit`, `offset`.
