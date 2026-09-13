# UI & FEATURE BASELINE AUDIT

## 1. Executive Summary
The Mahabbah System UI has a visually modern aesthetic built with Tailwind CSS, utilizing a consistent design system (colors, rounded corners, icons). However, the functional implementation is highly incomplete. The majority of the application relies on **hardcoded, fake business data**. The routing structure exists, but the integration between the UI components and the hardened backend APIs (such as `/api/students` and `/api/attendance`) is either partial, hardcoded, or completely missing. Additionally, the responsive design lacks mobile breakpoints (e.g., using `grid-cols-5` without `md:` prefixes), causing severe overflow on mobile devices.

## 2. Route Inventory
- `/login` (Working, integrates with `POST /api/auth/login`)
- `/admin/dashboard` (Dummy Data / Dead UI)
- `/admin/santri` (Partial Integration - GET/POST works, Edit/Delete are dead)
- `/admin/laporan`, `/admin/absensi`, `/admin/analitik`, `/admin/guru`, `/admin/kelas`, `/admin/program`, `/admin/tahsin`, `/admin/penilaian`, `/admin/pengaturan`, `/admin/notifikasi`, `/admin/ai` (Missing integration or entirely Dead UI)
- `/guru/dashboard` (Dummy Data)
- `/guru/santri` (Partial / Dummy)
- `/guru/absensi` (Dummy read, Partial POST integration)
- `/guru/laporan` (Dummy read, Partial POST integration)
- `/guru/hafalan` (Missing integration)
- `/orang-tua/beranda` (Dummy Data)
- `/orang-tua/absensi`, `/orang-tua/laporan`, `/orang-tua/notifikasi` (Missing integration / Dummy Data)

## 3. Responsive Audit
The following issues are deduced from the structural Tailwind implementation:

| Issue | Breakpoint | Classification | Details |
|---|---|---|---|
| Admin Dashboard KPI Cards | < 1024px | RESPONSIVE-BUG | `grid-cols-5` used without responsive prefixes (e.g., `md:grid-cols-5`). Will crush or overflow horizontally on mobile/tablet. |
| Admin Dashboard Layout | < 1024px | RESPONSIVE-BUG | `grid-cols-12` split into `col-span-3`, `col-span-5`, `col-span-4` without stacking (`flex-col` or `grid-cols-1`) on mobile. |
| Admin Santri Table | < 768px | RESPONSIVE-BUG | `table` inside `overflow-hidden` instead of `overflow-x-auto`. Will clip data on small screens. |
| Guru Dashboard Summary | < 768px | RESPONSIVE-BUG | `grid-cols-3` without breakpoints. Will crush on mobile screens (360px - 430px). |
| Parent Dashboard Metrics | < 390px | RESPONSIVE-BUG | `grid-cols-3` for metrics might truncate text on narrow devices like iPhone SE. |

## 4. Feature Completeness
Trace mapping of key interactive elements:

- **Login Button:** UI → `POST /api/auth/login` → DB → `WORKING`
- **Admin Santri List:** UI → `GET /api/students` → DB → `PARTIAL` (Client-side filtering instead of server-side).
- **Admin Santri Add:** UI → Modal → `POST /api/students` → DB → `WORKING`
- **Admin Santri Edit/Delete:** UI → Icons only → `DEAD_UI`
- **Guru Absensi Save:** UI → `POST /api/attendance` → DB → `PARTIAL` (The student list itself is hardcoded dummy data).
- **Guru Laporan AI Gen:** UI → `POST /api/learning-reports/[id]/ai` → `PARTIAL` (Depends on hardcoded report logic).

## 5. Dead UI
- All Edit (`<Edit />`) and Delete (`<Trash2 />`) buttons in data tables.
- Pagination buttons in `/admin/santri` (Client-side slice only, doesn't paginate backend).
- "Detail" links in dashboards (`<Link href="...">`).
- AI Analysis predefined question chips (Simulated via `setTimeout`).

## 6. Dummy/Hardcoded Data
The following files contain explicitly fake business data instead of fetching from the API:
- `app/admin/dashboard/page.tsx`: Fake `AI_ANS`, `AT_RISK` array, and static numbers (`150`, `143`, `92%`).
- `app/guru/dashboard/page.tsx`: Fake `students` array (`Ahmad Zaki Ramadhan`, `Fatimah Az-Zahra`).
- `app/guru/absensi/page.tsx`: Fake `attendance` array.
- `app/orang-tua/beranda/page.tsx`: Fake child profile (`Ahmad Zaki Ramadhan`) and fake latest report text.

## 7. CRUD Matrix

| Module | Create | Read | Update | Delete | Details | Search/Filter |
|---|---|---|---|---|---|---|
| **SANTRI** | 🟡 Partial | 🟡 Partial | 🔴 Missing | 🔴 Missing | 🔴 Missing | 🟡 Client-only |
| **GURU** | 🔴 Missing | 🔴 Missing | 🔴 Missing | 🔴 Missing | 🔴 Missing | 🔴 Missing |
| **ORANG TUA** | 🔴 Missing | 🔴 Missing | 🔴 Missing | 🔴 Missing | 🔴 Missing | 🔴 Missing |
| **KELAS/PROGRAM**| 🔴 Missing | 🔴 Missing | 🔴 Missing | 🔴 Missing | 🔴 Missing | 🔴 Missing |
| **ABSENSI** | 🟡 Partial | 🔴 Missing | 🔴 Missing | 🔴 Missing | 🔴 Missing | 🔴 Missing |
| **LAPORAN** | 🟡 Partial | 🔴 Missing | 🔴 Missing | 🔴 Missing | 🔴 Missing | 🔴 Missing |
| **NOTIFIKASI** | 🔴 Missing | 🔴 Missing | 🔴 Missing | 🔴 Missing | 🔴 Missing | 🔴 Missing |

*✅ COMPLETE | 🟡 PARTIAL | 🔴 MISSING*

## 8. UX Issues
- **Feedback after save:** The "Tambah Santri" modal simply closes on success without a toast/notification, leaving the user guessing.
- **Destructive actions:** Delete buttons are present in the UI but lack confirmation dialogs.
- **Empty States:** The `/admin/santri` table has a basic empty state, but most dashboards assume data exists and will break if arrays are empty.

## 9. Accessibility Issues
- Buttons and actionable icons (`<Eye>`, `<Edit>`, `<Trash2>`) lack `aria-label`s.
- Form inputs lack proper `<label htmlFor="...">` associations.
- The contrast ratio on some badges (e.g., yellow background with white text) may fail WCAG standards.

## 10. Role-Specific Issues
- **ADMIN:** Cannot actively manage CRUD for anything other than basic Student creation.
- **GURU:** The dashboard and attendance pages are hardcoded. A teacher cannot actually pull their real assigned class list dynamically.
- **ORANG TUA:** Completely locked into seeing a hardcoded "Ahmad Zaki Ramadhan" instead of their real linked child.

## 11. API/UI Integration Gaps
The backend API and security layers (e.g., `lib/auth/rbac.ts`) are fully built and secure, but the frontend React components have not been wired to use them using `useEffect` or React Server Components (RSC) data fetching. 

## 12. Priority Matrix

| ID | Priority | Category | Location | Issue | Recommended Fix |
|---|---|---|---|---|---|
| **UI-001** | P0 | BUG | All Dashboards | All dashboards are hardcoded. | Replace hardcoded arrays with `fetch()` to `/api/*` endpoints. |
| **UI-002** | P1 | UX-ISSUE | Admin Dashboard | Grid breaks on mobile (`grid-cols-5`). | Add responsive prefixes: `grid-cols-2 md:grid-cols-3 lg:grid-cols-5`. |
| **UI-003** | P1 | MISSING_UI | Admin Data Tables | Edit/Delete actions are dead. | Implement Edit modals and Delete confirmation dialogs wiring to `PATCH`/`DELETE` APIs. |
| **UI-004** | P1 | BUG | Guru Absensi | Hardcoded student list. | Fetch students by `class_id` from `/api/students` before rendering attendance toggles. |
| **UI-005** | P2 | UX-ISSUE | Modals | No success toasts. | Integrate a global toast provider (e.g., `sonner` or `react-hot-toast`). |

## 13. Recommended UI Architecture
1. **Move to Server Components (RSC):** Instead of `'use client'` with `useEffect` fetches, the dashboards should be React Server Components that fetch directly from the DB queries (e.g., `getClassesByTeacher()`), passing initial data to client components for interactivity.
2. **Global State/Toast:** Implement a toast notification system for mutations.
3. **Responsive Grid Utility:** Standardize dashboard card layouts using auto-fit grids (`grid-cols-[auto-fit_minmax(250px,1fr)]`).

## 14. Recommended Implementation Order
1. **Phase 1 (Dashboards):** Wire up Admin, Guru, and Parent dashboards to the real backend APIs (RSC).
2. **Phase 2 (Mobile Refactor):** Apply responsive Tailwind breakpoints (`md:`, `lg:`) to all grids and tables (`overflow-x-auto`).
3. **Phase 3 (CRUD Completion):** Wire the Edit/Delete actions in the Admin panels.
4. **Phase 4 (Forms/UX):** Add `aria-labels`, loading states, and success/error toasts.
