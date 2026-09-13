# ADMIN-ACADEMIC-004 — Admin Penilaian Management Recovery

**Task:** ADMIN-ACADEMIC-004  
**Date:** 2026-09-12  
**Auditor:** Antigravity  
**Branch:** feature/admin-academic-004

---

## 1. Implementation Summary

The dummy `app/admin/penilaian/page.tsx` was rewritten into a secure React Server Component (RSC). 
During the audit phase, it was determined that "Penilaian Kumulatif" structurally maps to the data stored inside `learning_reports` (which houses `hafalan_score`, `tahsin_score`, and `adab_score`). Because the schema uses this single table to hold these assessments and there is no broad admin mutation workflow for them, the module was recovered as a secure **Read-Only** monitoring page mirroring the Hafalan and Tahsin admin modules.

- **Server-Side Fetching & Pagination:** The module introduces a new search/pagination query function `searchPenilaianAdmin` in `lib/db/queries/learning-reports.ts`. It joins associations (student, class) and dynamically calculates the average cumulative score natively in SQL.
- **Client-Side Interactivity:** The table, search bar, and pagination controls are encapsulated within a `"use client"` component (`PenilaianClient.tsx`). Filtering is handled through URL query parameters, preserving SSR advantages and allowing deep-linking.
- **RBAC Enforced:** The module is rigorously protected by `requireAuth()` requiring `SUPER_ADMIN`. Attempting access by Guru or Orang Tua will aggressively trigger server-level redirects safely.

---

## 2. Files Changed

**Modified:**
- `app/admin/penilaian/page.tsx`: Rewrote static page to RSC handling authorization and parameterized data fetching.
- `lib/db/queries/learning-reports.ts`: Added `searchPenilaianAdmin` query function for secure admin listing, filtering, and pagination of scores.

**Created:**
- `app/admin/penilaian/PenilaianClient.tsx`: A lightweight client component responsible for rendering the table, search input, and pagination logic, managing URL state through `useRouter`.

---

## 3. Data Sources & Authorization

| Data Requirement | Source Query Function |
|------------------|-----------------------|
| Admin Identity | `requireAuth()` -> `SUPER_ADMIN` |
| Filtered Penilaian | `searchPenilaianAdmin(limit, offset, search)` |

**Authorization Flow:**
1. Next.js Edge Middleware natively restricts access to `/admin/*` routes.
2. The RSC additionally calls `requireAuth()` to assert `role === 'SUPER_ADMIN'`.
3. If unauthorized users bypass middleware, `requireAuth()` will trigger `redirect('/login')`.
4. Only upon successful authorization does the server query the full scope of learning reports. Client input (`search`) is safely passed as parameterized query arguments, preventing SQL injection or scope escalation.

---

## 4. Database Test Results

A local integration script verified the behavior against seeded database constraints:
- ✅ **Admin can view Penilaian page:** Verified (HTTP 200 with populated data).
- ✅ **Guru denied from accessing Admin Penilaian:** Verified (Intercepted by Middleware/Auth layer).
- ✅ **Parent denied from accessing Admin Penilaian:** Verified (Intercepted by Middleware/Auth layer).
- ✅ **Search filters correctly:** Verified that searching "Ahmad" exclusively returned relevant records and effectively paginated.

---

## 5. Responsive & Visual Verification

- **Desktop:** A full horizontal table displays student, class, hafalan score, tahsin score, adab score, and final average (Rata-rata Akhir).
- **Mobile/Tablet Constraints:** The table utilizes a controlled `overflow-x-auto` wrapper with a minimum width bound. The global page does not exhibit horizontal scrolling, preserving the structural integrity of the `AdminAppShell`.
- Loading transitions (search debouncing) are gracefully handled by `useTransition` rendering a semi-transparent loading spinner overlay.

---

## 6. Known Limitations

- **Read-Only:** As established for Academic monitoring modules, this page strictly monitors data without introducing redundant admin CRUD workflows. The write workflows remain correctly isolated to the Guru module creating learning reports.
- **Filter Breadth:** Filtering currently exclusively supports free text searching against the student's name, providing rapid access to a specific student's aggregate scores.

---

**COMMIT:** Recover penilaian management
**BRANCH:** feature/admin-academic-004
**TYPECHECK:** PASS
**BUILD:** PASS
**DB TEST:** PASS
**SECURITY:** VERIFIED
**RESPONSIVE CODE:** VERIFIED
**VISUAL QA:** PASS
**REGRESSION:** PASS (Guru/Parent pathways unaffected)
**STATUS:** COMPLETE
