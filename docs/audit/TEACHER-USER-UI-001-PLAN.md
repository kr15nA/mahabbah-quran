# TEACHER-USER-UI-001 IMPLEMENTATION PLAN

**Date:** 2026-09-12  
**Scope:** Admin > Guru Management (Server-side Pagination, Filters, Safe CRUD)  
**Base:** `feature/guru-ui-001` (to be created)

---

## 1. API Design: `/api/guru` vs `/api/users`
**Decision:** We will create a specialized `/api/guru` rather than a generic `/api/users`.
**Rationale:** 
- **Security:** A generic user management API inherently invites risk (e.g., privilege escalation via payload spoofing `role: 'admin'`). By hardcoding the scope to `role = 'guru'` at the controller level, we mathematically prevent this endpoint from generating or modifying Administrators.
- **Aggregations:** Gurus require unique joins (calculating `class_count` and `student_count`) that Parents and Admins do not need.
- **Endpoints:**
  - `GET /api/guru` — Paginated list of gurus, searchable, status-filtered.
  - `POST /api/guru` — Create a guru (forces `role = 'guru'`).
  - `PATCH /api/guru/[id]` — Update details / toggle `is_active`.
  - `DELETE /api/guru/[id]` — Soft delete (archive) guru.

---

## 2. Query Design (`lib/db/queries/users.ts`)
We will introduce specific, safe queries tailored for Guru management:

**`searchGurus(params: { search?: string, status?: 'active' | 'archived' | 'all', limit: number, offset: number })`**
- **Safe SELECT:** Will explicitly select `u.id, u.full_name, u.email, u.phone, u.role, u.is_active, u.last_login_at` (omitting `password_hash` and `fcm_token`).
- **Joins:** `LEFT JOIN classes` and `LEFT JOIN students` to aggregate `class_count` and `student_count`.
- **Filters:** `u.role = 'guru'` and `u.deleted_at IS NULL`. Matches `is_active` against requested status.

**`insertGuru(data)`**
- Hashes password via `bcrypt`.
- Forces `role = 'guru'`.

**`updateGuru(id, data)`**
- Safely updates fields. Ignores `role` updates.

**`archiveGuru(id)`**
- Updates `is_active = FALSE`. Does NOT touch `deleted_at` unless instructed, to preserve historical joins.

---

## 3. Authorization Matrix
| Resource | Allowed Roles | Enforcement |
|----------|---------------|-------------|
| `app/admin/guru/page.tsx` | `SUPER_ADMIN` | Server Component `requireAuth()` check |
| `GET /api/guru` | `SUPER_ADMIN` | API `requireAuth()` check |
| `POST /api/guru` | `SUPER_ADMIN` | API `requireAuth()` check |
| `PATCH /api/guru/[id]`| `SUPER_ADMIN` | API `requireAuth()` check |
| `DELETE /api/guru/[id]`| `SUPER_ADMIN`| API `requireAuth()` check |
*Note: Guru and Orang Tua are strictly denied (403).*

---

## 4. Deactivation & Reactivation Behavior
- **Archive Action:** Triggers `UPDATE users SET is_active = FALSE WHERE id = ?`.
- **Classes Relationship:** An archived Guru **is not** stripped of their current classes. This preserves historical integrity (we know who taught the class). However, in future phases, dropdowns for *assigning* a Guru to a *new* Class will filter by `is_active = TRUE`.
- **Login:** Currently, the `login` API route does not check `is_active`. As part of this implementation, we will update `app/api/auth/login/route.ts` to reject login if `is_active === false`.

---

## 5. Uniqueness Validation
Since the database does not enforce `UNIQUE` constraints on `email` and `phone`:
- **POST/PATCH Validation:** Before insertion/update, the API will query `getUserByEmail(email)` and `getUserByPhone(phone)`. 
- **Conflict Handling:** If a match exists (and `id !== currentId`), the API returns `409 Conflict` with a user-friendly message (`Email/Phone sudah terdaftar`).

---

## 6. UI Implementation (`app/admin/guru/`)
Following the `STUDENT-UI-001` blueprint:
1. **`page.tsx`:** RSC that parses URL parameters (search, page, status), calls `searchGurus`, and passes data to Client Component.
2. **`GuruTableClient.tsx`:** Client Component managing:
   - Search bar (debounced `next/navigation` push).
   - Status Filter dropdown (`active`, `archived`, `all` — defaulting to `active`).
   - Pagination controls.
   - Modals for Add/Edit/Archive.
3. **Responsive Grid:** Converts the existing static `grid-cols-3` into a responsive grid (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`) to prevent overflow on mobile (360px).

---

## 7. Expected File Changes
**Modify:**
- `app/admin/guru/page.tsx` (Convert to RSC)
- `lib/db/queries/users.ts` (Add safe queries)
- `app/api/auth/login/route.ts` (Enforce `is_active`)

**Create:**
- `app/admin/guru/GuruTableClient.tsx`
- `app/api/guru/route.ts`
- `app/api/guru/[id]/route.ts`

**Out of Scope:**
- No changes to `students`, `programs`, or `classes` tables.
- No RBAC or session middleware changes.
- No DB migrations.

---

## 8. Risks & Mitigation
- **Risk:** Admin edits a guru's password, but the new password isn't hashed.
  - **Mitigation:** The `PATCH` endpoint will strictly check if `password` is provided, and if so, run it through `bcrypt.hash()` before passing to the DB query.
- **Risk:** Parent/Guru endpoints are accidentally exposed.
  - **Mitigation:** Rely entirely on `/api/guru` explicitly hardcoding `role = 'guru'` in the SQL `WHERE` clause and insertion logic.
