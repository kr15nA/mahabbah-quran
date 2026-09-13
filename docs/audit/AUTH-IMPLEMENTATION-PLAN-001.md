# AUTH-IMPLEMENTATION-PLAN-001: Authorization & Security Hardening
**Date:** 2026-09-12
**Status:** Implementation Plan Proposal
**Scope:** RBAC Schema, Auth Service API, Query Scoping, Migration Plan

## A. Final RBAC Schema Proposal (Drizzle)
Since `users.role` must NOT be removed immediately, we introduce the formal RBAC schema alongside it.

```typescript
// drizzle/schema.ts
import { pgTable, serial, integer, varchar, text, bigint, uniqueIndex, primaryKey } from 'drizzle-orm/pg-core';
import { users } from './schema';

export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).unique().notNull(),
  description: text('description'),
});

export const permissions = pgTable('permissions', {
  id: serial('id').primaryKey(),
  resource: varchar('resource', { length: 50 }).notNull(),
  action: varchar('action', { length: 50 }).notNull(),
}, (t) => ({
  unq: uniqueIndex('resource_action_unq').on(t.resource, t.action),
}));

export const rolePermissions = pgTable('role_permissions', {
  roleId: integer('role_id').references(() => roles.id).notNull(),
  permissionId: integer('permission_id').references(() => permissions.id).notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.roleId, t.permissionId] }),
}));

export const userRoles = pgTable('user_roles', {
  userId: bigint('user_id', { mode: 'number' }).references(() => users.id).notNull(),
  roleId: integer('role_id').references(() => roles.id).notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.roleId] }),
}));
```

## B. Permission Catalog
Using TypeScript literal types for strict validation.

```typescript
export type Resource = 'users' | 'students' | 'teachers' | 'parents' | 'programs' | 'classes' | 'attendance' | 'hafalan' | 'tahsin' | 'learning_reports' | 'notifications' | 'finance' | 'audit_logs';

export type Action = 'view' | 'create' | 'update' | 'delete' | 'manage' | 'approve' | 'export';
```

## C. Role-Permission Seed Matrix
We will seed the following mapping:
- **SUPER_ADMIN / ADMIN_AKADEMIK:** `{ resource: '*', action: 'manage' }` (Wildcard or explicit mapping to all)
- **GURU:** `{ resource: 'students', action: 'view' }`, `{ resource: 'attendance', action: 'create' }`, `{ resource: 'learning_reports', action: 'create' }`, etc.
- **ORANG_TUA:** `{ resource: 'students', action: 'view' }`, `{ resource: 'learning_reports', action: 'view' }`

## D. Resource Ownership/Scoping Rules
- **Parent (`ORANG_TUA`):** Must have a `student_parents` record linking `parent_id` (session.userId) to the target `student_id`.
- **Teacher (`GURU`):** Must be the `teacher_id` in the `classes` table for the target `student_id`.
- **Admin:** Global access.

## E. Authorization Service API
Implemented using Drizzle queries and strict typings, defaulting to DENY.

```typescript
// lib/auth/rbac.ts
import { getSession, SessionPayload } from '@/lib/auth/session';
import { sql, eq, inArray, and } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { students, classes, studentParents } from '@/drizzle/schema';

// 1. Core Verification
export async function requireAuth(): Promise<SessionPayload> { ... }
export async function requirePermission(resource: Resource, action: Action): Promise<SessionPayload> { ... }

// 2. Resource Verification (Throws 403 if denied)
export async function requireStudentAccess(studentId: number): Promise<SessionPayload> {
  const session = await requireAuth();
  if (session.role === 'admin' || session.role === 'SUPER_ADMIN') return session;

  if (session.role === 'guru') {
    const isAssigned = await db.select({ id: students.id })
      .from(students)
      .innerJoin(classes, eq(classes.id, students.classId))
      .where(and(eq(students.id, studentId), eq(classes.teacherId, session.userId)))
      .limit(1);
    if (!isAssigned.length) throw new Error('Forbidden');
  }

  if (session.role === 'orang_tua') {
    const isLinked = await db.select({ id: studentParents.id })
      .from(studentParents)
      .where(and(eq(studentParents.studentId, studentId), eq(studentParents.parentId, session.userId)))
      .limit(1);
    if (!isLinked.length) throw new Error('Forbidden');
  }

  return session;
}

export async function requireClassAccess(classId: number): Promise<SessionPayload> { ... }
```

**Query Scoping Pattern (Drizzle Compatible):**
Instead of returning raw SQL, we use Drizzle query builders.
```typescript
// lib/db/queries/students.ts
export function scopeStudentsQuery(userId: number, role: string) {
  const query = db.select().from(students).where(eq(students.deletedAt, null)); // pseudo-code logic
  // Apply contextual filters based on role using Drizzle chained operators
}
```

## F. Migration Strategy from current `users.role`
1. **Preserve Compatibility:** The `users.role` column remains untouched.
2. **Seed Data:** A one-time Drizzle seed script will insert `roles`, `permissions`, and map existing users to `user_roles` based on their `users.role` value (`admin` -> `SUPER_ADMIN`, etc.).
3. **Dual Write:** When a new user is created, we insert into `users.role` and `user_roles`.

## G. JWT/Session Transition Strategy
- **Existing Sessions:** `mq_session` cookies contain `{ role: 'admin' | 'guru' | 'orang_tua' }`.
- **Validation:** `requireAuth()` will automatically map legacy string roles to structured roles at runtime (e.g., `admin` behaves as `SUPER_ADMIN`). No existing user is logged out.
- **Payload Size:** Permissions are *not* baked into the JWT to prevent bloat. RBAC queries happen server-side, utilizing Neon's connection caching.

## H. API Migration Sequence
1. **P0 Security Patch:** Remove hardcoded `JWT_SECRET` fallback in `middleware.ts` & `session.ts`.
2. **IDOR Patches:** Implement `requireStudentAccess(id)` in `app/api/students/[id]`, `app/api/learning-reports`, and `app/api/attendance`.
3. **Schema Updates:** Add RBAC tables to `schema.ts`.
4. **Auth Service:** Implement `lib/auth/rbac.ts`.
5. **Route Refactoring:** Replace inline `session.role !== 'admin'` with `requirePermission()`.

## I. Test Strategy
- **Unit Tests:** Conceptually verify `requireStudentAccess` throws `403 Forbidden` for a mismatched `teacherId` or `parentId`.
- **Integration Validation:** Request `GET /api/learning-reports` as a parent and ensure the response strictly contains reports for linked children.

## J. Rollback Strategy
Since `users.role` and all existing domain schemas (like `student_parents`, `deletedAt`, `hafalan_records`) are unchanged:
- Reverting the API files will seamlessly restore previous functionality.
- The new RBAC tables can remain dormant without side effects.

## K. Risk Assessment & Operational Impact
- **Changes safe without data migration:** Removing JWT fallback, IDOR patching using existing `student_parents` and `classes` relationships.
- **Requires Migration:** Creating RBAC tables (`drizzle-kit generate` & `push`).
- **Requires Manual Review:** Any script mapping current admins to `SUPER_ADMIN` vs `ADMIN_AKADEMIK` (will default to `SUPER_ADMIN`).
- **Affects existing login sessions:** None. Existing tokens remain valid due to runtime mapping.
- **Requires Vercel Env Changes:** **YES.** You MUST configure `JWT_SECRET` in Vercel before deploying the P0 patch, otherwise no one can log in.

## L. Exact File-by-File Implementation Plan
1. `middleware.ts` & `lib/auth/session.ts`: `const SECRET_KEY = process.env.JWT_SECRET; if (!SECRET_KEY) throw new Error('JWT_SECRET missing');`
2. `drizzle/schema.ts`: Append RBAC tables.
3. `lib/auth/rbac.ts`: Create centralized auth service.
4. `app/api/students/[id]/route.ts`: Insert `await requireStudentAccess(id)`.
5. `app/api/attendance/route.ts`: Insert `await requireClassAccess(body.class_id)`.
6. `app/api/learning-reports/route.ts`: Modify `GET` to enforce `requireStudentAccess`.
7. `lib/db/queries/students.ts`: Refactor `searchStudents` to safely scope data for parents/teachers.

## M. Acceptance Criteria
1. Application refuses to start/authenticate if `JWT_SECRET` is undefined.
2. Parent requesting `GET /api/students/[unlinked_id]` receives HTTP 403.
3. Teacher POSTing attendance for an unassigned class receives HTTP 403.
4. RBAC database schema is present and Drizzle typechecks successfully.
5. `student_parents`, `deletedAt`, and Tahfidz schemas remain intact.
6. Existing user login flows remain unbroken.
