# AUTH-DESIGN-001: Authorization Architecture & Permission Matrix
**Date:** 2026-09-12
**Status:** Architecture Design Proposal
**Scope:** RBAC Design, Permission Matrix, Resource Ownership Rules

## 1. Role Definitions

| Role | Description |
|------|-------------|
| **SUPER_ADMIN** | Full system control. Can manage all users, system configurations, roles, and audit logs. |
| **ADMIN_YAYASAN** | Foundation board/leadership. Focuses on strategic oversight, high-level reporting, and financial overviews. |
| **ADMIN_AKADEMIK** | Day-to-day operational manager. Manages programs, classes, student enrollments, teacher assignments, and academic reports. |
| **FINANCE** | Manages tuition, fees, and payments (future scope). No access to academic modifications. |
| **GURU** | Teaching staff. Manages attendance, hafalan, tahsin, and learning reports only for their assigned students and classes. |
| **ORANG_TUA** | Parents/Guardians. Can only view data, reports, and notifications for their explicitly linked children. |

## 2. Permission Definitions

For each resource, access is defined by the following actions:
- **view (v):** Read/list resource details.
- **create (c):** Add a new resource.
- **update (u):** Modify an existing resource.
- **delete/archive (d):** Remove or soft-delete a resource.
- **approve (a):** Approve a workflow state (e.g., finalize a learning report).
- **verify (vf):** Verify data accuracy (e.g., verify a payment).
- **export (e):** Export resource data to PDF/CSV.
- **manage (m):** Full control (view, create, update, delete).

## 3. Resource Access Matrix

| Resource | SUPER_ADMIN | ADMIN_YAYASAN | ADMIN_AKADEMIK | FINANCE | GURU | ORANG_TUA |
|----------|-------------|---------------|----------------|---------|------|-----------|
| **Users** | m, e | v | v (teachers/parents) | v (parents) | - | - |
| **Students** | m, e | v, e | m, e | v | v (assigned) | v (linked) |
| **Teachers** | m, e | v, e | m, e | - | v (self) | - |
| **Parents** | m, e | v | m | v | v (of assigned) | v (self) |
| **Programs** | m | v | m | - | v | v |
| **Classes** | m | v | m | - | v (assigned) | v (linked) |
| **Attendance** | m, e | v, e | m, e | - | c, u, v (assigned)| v (linked) |
| **Hafalan** | m, e | v, e | m, e | - | c, u, v (assigned)| v (linked) |
| **Tahsin** | m, e | v, e | m, e | - | c, u, v (assigned)| v (linked) |
| **Learning Reports** | m, a, e | v, e | m, a, e | - | c, u, v (assigned)| v, e (linked) |
| **Notifications** | m | v (self) | m | c (finance) | c, v (assigned) | v (self) |
| **Finance (Future)**| m, e | v, e | v (status only) | m, vf, e| - | v (self) |
| **Audit Logs** | v, e | - | - | - | - | - |

## 4. Resource Ownership Rules (Contextual ABAC)

Role-based access is insufficient for Guru and Orang Tua; Attribute-Based Access Control (ABAC) / Ownership rules must be enforced:

1. **ORANG_TUA (Parents):**
   - **Rule:** A parent may only access records (Student profile, Reports, Attendance, Hafalan, Tahsin) if there is an active junction record in `student_parents` linking their `user_id` to the requested `student_id`.
   - **Enforcement:** MUST NEVER access another student by changing the ID.
2. **GURU (Teachers):**
   - **Rule:** A teacher may only access, create, or update records for students who are actively enrolled in a class where the `teacher_id` matches the teacher's `user_id`.
   - **Enforcement:** Cannot manipulate `student_id` or `class_id` in API payloads to alter records for unassigned students.
3. **FINANCE:**
   - **Rule:** Must not automatically inherit academic privileges. Cannot view academic scores or teacher notes.
4. **ADMIN (Akademik vs Yayasan):**
   - **Rule:** Admins have global scope over the resources they can access, but Admin Yayasan is strictly restricted to read-only (view/export) for academic operations.

## 5. Proposed Database RBAC Model

To support this structure flexibly without hardcoding roles into a single varchar, we propose migrating to a structured RBAC schema:

```sql
-- roles table
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL, -- 'SUPER_ADMIN', 'GURU', etc.
  description TEXT
);

-- user_roles table (supports multiple roles per user if needed in future)
CREATE TABLE user_roles (
  user_id BIGINT REFERENCES users(id),
  role_id INTEGER REFERENCES roles(id),
  PRIMARY KEY (user_id, role_id)
);

-- permissions table
CREATE TABLE permissions (
  id SERIAL PRIMARY KEY,
  resource VARCHAR(50) NOT NULL, -- 'students', 'learning_reports'
  action VARCHAR(50) NOT NULL,   -- 'view', 'create', 'update', 'delete', 'manage'
  UNIQUE (resource, action)
);

-- role_permissions table
CREATE TABLE role_permissions (
  role_id INTEGER REFERENCES roles(id),
  permission_id INTEGER REFERENCES permissions(id),
  PRIMARY KEY (role_id, permission_id)
);
```
*Alternatively, for immediate simplicity, keep the `role` varchar in `users` but expand it to an Enum and implement policy logic in code. The structured DB approach is recommended for long-term scalability.*

## 6. Proposed Authorization Service API

Centralized service to replace inline checks in `app/api/**`:

```typescript
// lib/auth/rbac.ts
import { SessionPayload } from '@/lib/auth/session'

// 1. Identity & Role Verification
export async function requireAuth(): Promise<SessionPayload>
export async function requireRole(allowedRoles: string[]): Promise<SessionPayload>
export async function requirePermission(resource: string, action: string): Promise<SessionPayload>

// 2. Contextual Ownership Verification
// Throws 403 Forbidden if the user lacks contextual access
export async function verifyStudentAccess(userId: number, role: string, studentId: number): Promise<void>
export async function verifyClassAccess(userId: number, role: string, classId: number): Promise<void>
export async function verifyReportOwnership(userId: number, role: string, reportId: number): Promise<void>

// 3. Data Filtering (Query Scoping)
// Returns WHERE clauses or base queries scoped to the user's permissions
export function scopeStudentsQuery(userId: number, role: string): string
```

## 7. Migration Strategy from Current Roles

Current `users.role` is a varchar: `'admin' | 'guru' | 'orang_tua'`.
1. **admin** -> Migrate to `SUPER_ADMIN`.
2. **guru** -> Migrate to `GURU`.
3. **orang_tua** -> Migrate to `ORANG_TUA`.
4. Create empty roles for `ADMIN_YAYASAN`, `ADMIN_AKADEMIK`, and `FINANCE` to be assigned manually by Super Admin later.

## 8. Backward Compatibility Strategy

- **Middleware Routing:** Update `middleware.ts` to map `SUPER_ADMIN`, `ADMIN_YAYASAN`, and `ADMIN_AKADEMIK` to the `/admin` route prefix.
- **Legacy API Support:** Existing checks for `session.role === 'admin'` will be shimmed in a utility function `isAdmin(role)` which returns `true` for all admin variants during the transition phase.
- **Graceful DB Migration:** Add the new `role_id` mapping while temporarily keeping the `role` varchar synced until the frontend is fully updated.

## 9. Security Acceptance Criteria

- [ ] **IDOR Prevention:** 100% of dynamic routes (`/[id]`) implement `verifyStudentAccess` or `verifyReportOwnership`.
- [ ] **Parent Isolation:** Parent accounts cannot read, view, or guess data of unlinked students.
- [ ] **Teacher Isolation:** Teachers cannot submit attendance or scores for students not assigned to them.
- [ ] **Least Privilege:** Finance accounts receive 403 Forbidden on academic mutation endpoints.
- [ ] **JWT Integrity:** Role cannot be escalated by modifying client-side state.

## 10. Implementation Sequence

1. **Phase 1: DB Schema Updates**
   - Create migrations for `roles`, `permissions`, `role_permissions`, and `user_roles`.
   - Seed default roles and permissions.
2. **Phase 2: Auth Service Implementation**
   - Build `lib/auth/rbac.ts` providing the centralized API.
   - Implement ownership validation functions (DB lookups for relationships).
3. **Phase 3: Route Refactoring**
   - Systematically replace inline `session.role === '...'` checks with `requirePermission()`.
   - Add ownership checks (`verifyStudentAccess`, etc.) to all endpoints taking IDs.
4. **Phase 4: Middleware & UI Updates**
   - Update `middleware.ts` to handle new role types.
   - Update frontend navigation and action buttons to conditionally render based on granular permissions instead of strict roles.
5. **Phase 5: Cleanup**
   - Remove hardcoded fallbacks and legacy `role` varchar column once migration is verified.
