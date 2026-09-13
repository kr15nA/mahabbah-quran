# TEACHER-USER-RECON-001

**Date:** 2026-09-12  
**Scope:** Reconnaissance of Users/Guru/Parent architecture  
**Objective:** Validate schema readiness and identify security boundaries before implementing `TEACHER-USER-UI-001`.

---

## 1. Database Schema
**Table: `users`**
- **Columns:** `id` (PK), `fullName`, `email` (nullable), `phone` (nullable), `passwordHash`, `role` ('guru' | 'orang_tua' | 'admin'), `avatarUrl`, `fcmToken`, `isActive`, `lastLoginAt`, `createdAt`, `updatedAt`, `deletedAt`.
- **Constraints:** No explicit unique indexes for `email` or `phone` are present in the `drizzle/schema.ts` definition block, meaning uniqueness must be strictly enforced at the application/API layer.
- **Soft Deletion:** Fully supported via `deleted_at` and `is_active`.

**Table: `student_parents`**
- **Columns:** `id` (PK), `studentId` (FK -> `students`), `parentId` (FK -> `users`), `relationship`, `isPrimary`, `createdAt`.
- **Relationship:** Supports Many-to-Many. A parent can have multiple children, and a child can have multiple parents.

**Table: `classes`**
- **Column:** `teacherId` (FK -> `users.id`). 
- **Relationship:** Directly maps a Class to exactly one Guru.

---

## 2. Authentication Model
- **Login Flow:** Computes bcrypt hash and issues a signed, HttpOnly JWT cookie (`mq_session`).
- **Payload:** Stores `userId`, `role` (raw DB string), `fullName`, and `email`.
- **Role Normalization:** `requireAuth()` automatically normalizes legacy raw roles (e.g. `'admin'` → `'SUPER_ADMIN'`) before exposing them to the endpoint logic, guaranteeing a consistent RBAC foundation.
- **Representation:** Gurus have `role='guru'`. Parents have `role='orang_tua'`.

---

## 3. Database Queries (`lib/db/queries/users.ts`)
- **Implemented:** `getUserByEmail`, `getUserByPhone`, `getUserById`, `insertUser`, `softDeleteUser`, `updateFcmToken`, `updateLastLogin`.
- **Aggregations:** `getAllTeachers()` successfully joins `classes` and `students` to calculate `class_count` and `student_count` for each teacher.

---

## 4. Current API Implementation
- **`/api/users`**: **MISSING**. 
- **`/api/guru`**: **MISSING**.
- **`/api/parents`**: **MISSING**.
- **Conclusion:** There is absolutely no REST API for creating, updating, listing, or deleting Users or Teachers. The frontend currently has no backend to talk to for user management.

---

## 5. Classes & Teacher Relationship
Assigning a Guru to a Class is **fully supported** by the database schema and the existing queries (`insertClass`, `updateClass`). The `teacher_id` is a direct foreign key. 

---

## 6. Current UI State
- **Admin Guru Page (`app/admin/guru/page.tsx`):** Entirely DUMMY. Hardcoded static array of teachers. Buttons for "Tambah Guru" are purely cosmetic. 
- **Guru Dashboard (`app/guru/**`):** Entirely DUMMY.
- **Parent Portal (`app/orang-tua/**`):** Entirely DUMMY.

---

## 7. Security Risks & Findings
1. **Password Leakage Risk (Likely if unmitigated):** 
   - The query `getAllTeachers()` executes `SELECT u.*`. If this query is blindly piped into `NextResponse.json({ data: list })` when building the `/api/users` route, it will expose `password_hash` to the frontend.
   - **Recommendation:** Map over the rows to delete `password_hash` before returning, or explicitly select only safe columns in the SQL.
2. **Arbitrary Role Assignment (Risk during implementation):**
   - The missing `POST /api/users` endpoint must enforce that only a `SUPER_ADMIN` can create users, and must strictly validate the `role` string to prevent a compromised admin token from issuing new `SUPER_ADMIN` accounts (if that is against business policy).
3. **Application-Level Uniqueness:**
   - Because `email` and `phone` lack DB-level `UNIQUE` constraints in the schema, the upcoming API MUST perform `getUserByEmail` and `getUserByPhone` checks prior to `insertUser` to prevent catastrophic duplicate credential overlaps.

---

## 8. Conclusion & Implementation Boundary
- **Schema Changes:** **NONE REQUIRED.** The current `users` schema is perfectly sufficient to support `TEACHER-USER-UI-001`.
- **Next Steps (Implementation Boundary):**
  1. Create `/api/users` (GET, POST) restricted to `SUPER_ADMIN`.
  2. Create `/api/users/[id]` (PATCH, DELETE) restricted to `SUPER_ADMIN`.
  3. Ensure APIs strip `password_hash`.
  4. Refactor `app/admin/guru/page.tsx` to become an interactive Client/Server component mirroring the robust patterns established in `STUDENT-UI-001` and `PROGRAM-UI-001`.
