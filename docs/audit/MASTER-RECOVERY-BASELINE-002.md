# MASTER RECOVERY BASELINE 002

**Date:** 2026-09-12  
**Repository:** `mahabbah-quran`  
**Phase:** Post-Program & Student Recovery Reconnaissance  

---

## 1. Git Status
- **Current Branch:** `feature/program-ui-001`
- **HEAD Commit:** `65b6b579a51a4ad9414c33b59a13b286de844c4a`
- **Working Tree:** Contains unstaged audit logs and minor uncommitted cosmetic UI tweaks (layout/icons). The source code logic is clean.
- **Recent Recovery Commits:**
  - `65b6b57` fix(program): default active program filter
  - `c777d96` feat(program): complete responsive program management
  - `7875545` feat(student): complete responsive student management
  - `424f4f5` fix(security): resolve authorization IDOR and data leaks
  - `4d85948` fix(security): enforce JWT_SECRET

---

## 2. Routes Inventory

### Admin (`app/admin/**`)
- **`/santri`**: REAL. Full CRUD, Pagination, Debounced Search, Real DB. Secure.
- **`/program`**: REAL. Full CRUD, Pagination, Filters, Real DB. Secure.
- **`/kelas`**: DUMMY. Static `classes` array. `grid-cols-3` will break on mobile.
- **`/guru`**: DUMMY. Static `teachers` array.
- **`/dashboard`**, **`/absensi`**, **`/hafalan`**, **`/tahsin`**, **`/penilaian`**, **`/laporan`**, **`/analitik`**, **`/ai`**, **`/notifikasi`**, **`/pengaturan`**: All DUMMY. Fake stats, no real data.

### Guru (`app/guru/**`)
- All routes (`/dashboard`, `/absensi`, `/hafalan`, `/laporan`, `/santri`) are entirely DUMMY.

### Orang Tua (`app/orang-tua/**`)
- All routes (`/beranda`, `/absensi`, `/laporan`, `/notifikasi`) are entirely DUMMY.

### Login (`app/login/**`)
- **`/login`**: REAL. Wired to API, JWT session cookies, redirect middleware logic.

---

## 3. API Inventory

| Endpoint | Methods | Auth Check | Status | Notes |
|----------|---------|------------|--------|-------|
| `/api/auth/login` | POST | N/A | READY | Secure bcrypt & JWT payload. |
| `/api/auth/logout` | POST | N/A | READY | Destroys session. |
| `/api/students` | GET, POST | `requireAuth` | READY | Strong RBAC for Admin/Guru. |
| `/api/students/[id]` | GET, PATCH, DELETE | `requireAuth` | READY | Explicit ownership checks. |
| `/api/programs` | GET, POST | `requireAuth` | READY | Paginated, admin-gated. |
| `/api/programs/[id]` | GET, PATCH, DELETE | `requireAuth` | READY | `SUPER_ADMIN` secured. |
| `/api/classes` | GET, POST | `requireAuth` | PARTIAL | Missing `PATCH`, `DELETE`. |
| `/api/learning-reports` | GET, POST | `requireAuth` | PARTIAL | Uses `requireStudentAccess`. |
| `/api/attendance` | GET, POST | `requireAuth` | PARTIAL | Uses `requireClassAccess`. |
| `/api/notifications` | GET, PATCH | `getSession` | **RISK** | Needs refactor to `requireAuth`. |
| `/api/ai/analyze` | POST | `getSession` | **RISK** | Needs refactor to `requireAuth`. |
| `/api/surahs` | GET | None | PUBLIC | Unauthenticated static data fetch. |

---

## 4. Database (Drizzle Schema)

**Foundation:**
- Primary keys are uniformly `bigserial` (`id`).
- Timestamps (`created_at`, `updated_at`) with timezone on all entity tables.

**Deletions & Archiving:**
- `deleted_at`: Used strictly for `users` and `students` (Soft Delete).
- `is_active`: Used for `users`, `programs`, `classes` (Logical Archive).
- Transactions (`attendance`, `hafalan_records`, `tahsin_records`, `learning_reports`) do not possess soft deletes. Deletions would be physical or rely on cascades (which are currently restricted by Drizzle defaults).

**Relationships:**
- `classes` references `programs.id` and `users.id` (teacher).
- `students` references `classes.id`.
- `student_parents` maps `students.id` ↔ `users.id` (parent).
- Activity tables map strictly to `students.id` and `users.id` (teacher).

---

## 5. Security Posture
- **JWT & Sessions:** Highly secure. Signed, encrypted, HttpOnly.
- **`requireAuth()`:** Centralized authorization is operational and successfully normalizes legacy `admin` string to canonical `SUPER_ADMIN`.
- **IDOR Protection:** Ownership macros (`requireStudentAccess`, `requireClassAccess`, `requireReportAccess`) exist and block cross-tenant lookups for Gurus and Parents.
- **Identified Gap:** The `/api/notifications` and `/api/ai/analyze` routes bypass `requireAuth()` and call `getSession()` directly, running the risk of unhandled canonical role expectations or weak type checks. 

---

## 6. UI & Responsiveness Flaws (Outside Santri/Program)
1. **Hardcoded Arrays:** Almost every UI component outside `Admin > Santri` and `Admin > Program` maps over a `const data = [...]` array.
2. **Fake Interactivity:** Buttons like `Tambah Kelas`, `Tambah Guru`, `Simpan Laporan` do not trigger actual network requests in the dummy files.
3. **Responsive Breakage:** `grid-cols-2` and `grid-cols-3` are hardcoded without `md:` prefixes in `DataKelasPage` and `DataGuruPage`. This will cause severe horizontal overflow on 360px mobile viewports.

---

## 7. Feature Matrix

| Feature | Route / UI | API | DB Query | Status | Priority |
|---------|------------|-----|----------|--------|----------|
| **Auth** | READY | READY | READY | READY | - |
| **Admin - Santri** | READY | READY | READY | READY | - |
| **Admin - Program** | READY | READY | READY | READY | - |
| **Admin - Kelas** | BROKEN (Dummy) | PARTIAL | PARTIAL | PARTIAL | P1 |
| **Admin - Guru (Users)** | BROKEN (Dummy) | MISSING | PARTIAL | PARTIAL | P1 |
| **Guru - Dashboard** | BROKEN (Dummy) | N/A | MISSING | MISSING | P2 |
| **Guru - Kegiatan** | BROKEN (Dummy) | PARTIAL | PARTIAL | PARTIAL | P2 |
| **Parent - Beranda** | BROKEN (Dummy) | MISSING | MISSING | MISSING | P2 |
| **AI Integration** | BROKEN (Dummy) | PARTIAL | N/A | PARTIAL | P3 |
| **Notifications** | BROKEN (Dummy) | PARTIAL | PARTIAL | PARTIAL | P3 |

---

## 8. Dependency Map
To build a functional application, the entities must be populated in this specific order due to foreign-key dependencies:

1. **Programs** (Done) 
2. **Users (Guru / Parents)** (Required for Classes & Students)
3. **Classes** (Requires Programs + Guru)
4. **Students** (Done, but requires active Classes to function properly)
5. **Student_Parents** (Requires Students + Parent Users)
6. **Transactions (Attendance, Hafalan, Tahsin, Reports)** (Requires Students + Classes)

---

## 9. Recommended Execution Order

**Phase 1: Foundation Completion (P1)**
1. **Security Patch:** Refactor `notifications` and `ai` routes to use `requireAuth()`.
2. **Users UI (Guru & Parents):** Implement `app/admin/guru` full CRUD (API + UI). Required to assign teachers to classes.
3. **Classes UI:** Implement `app/admin/kelas` full CRUD (API + UI). 

**Phase 2: Guru Operations (P2)**
4. **Guru Dashboard & Students List:** Connect Guru UI to their assigned students.
5. **Attendance UI:** Build the daily attendance roster logic.
6. **Hafalan & Tahsin UI:** Enable teachers to input daily progress.

**Phase 3: Feedback Loop (P2)**
7. **Learning Reports:** Wire up the Guru report generation.
8. **Parent Portal:** Wire up the `Orang-Tua` dashboard to read attendance and reports.

**Phase 4: Polish (P3)**
9. AI report generation integration.
10. Notifications broadcast and real-time UI.
11. Admin analytics dashboard logic.
