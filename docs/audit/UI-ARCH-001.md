# UI-ARCH-001: Minimal UI Architecture Plan

## 1. Objective
To define a pragmatic, non-destructive UI architecture for the Mahabbah System that repairs the existing responsive and functional baseline issues identified in `UI-FEATURE-BASELINE-001`. This plan leverages the existing Next.js App Router, current Neon database backend, and Tailwind CSS configuration without introducing unnecessary dependencies or requiring a total rewrite.

---

## 2. Global Conventions

### A. Responsive Breakpoint Strategy
Rely strictly on standard Tailwind breakpoints to ensure consistency and prevent layout crushing on small devices:
- **`sm` (640px):** Large phones (landscape)
- **`md` (768px):** Tablets (Portrait). Primary breakpoint for collapsing sidebars and switching lists to grids.
- **`lg` (1024px):** Laptops. Safely use `grid-cols-3` or `grid-cols-4`.
- **`xl` (1280px):** Desktop. Safely use `grid-cols-5` or `grid-cols-12`.
*Rule:* All grid and flex layouts must be mobile-first (e.g., `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`).

### B. Spacing Rules
- **Micro:** `gap-1`, `gap-2` (Icons and labels)
- **Component:** `p-4`, `p-5` (Card padding)
- **Section:** `gap-4`, `gap-6`, `space-y-4` (Between cards and distinct structural sections)
- **Layout:** `p-4 md:p-6 lg:p-8` (Main page container padding)

### C. Typography Hierarchy
- **Page Titles:** `text-xl md:text-2xl font-extrabold text-gray-900`
- **Card Headings:** `text-sm font-bold text-gray-900`
- **Primary Body:** `text-xs md:text-sm text-gray-700`
- **Secondary/Meta:** `text-[10px] md:text-[11px] text-gray-500`

### D. Component Strategy (Server vs. Client)
- **React Server Components (RSC):** Default for all page shells (`page.tsx`) and layout shells. Fetch data directly via Drizzle query functions (e.g., `getClassesByTeacher()`), bypassing the `/api` route overhead for initial renders.
- **Client Components (`'use client'`):** Restricted strictly to the interactive leaves of the tree (e.g., `DataTable`, `Form`, `AttendanceToggle`, `ConfirmDialog`). Pass serialized RSC data down as props.

---

## 3. Shared UI Patterns

### 1. AppShell
- **Purpose:** The root container managing the layout wrapper (Sidebar + Main Content).
- **Mobile:** Renders the `Topbar` and hides the sidebar behind a hamburger menu overlay.
- **Desktop:** Fixed left sidebar, scrollable main content area.
- **Accessibility:** `main` landmark role. Focus management when mobile drawer opens.

### 2. Sidebar
- **Purpose:** Primary vertical navigation for Admin and Guru.
- **Mobile:** Hidden off-screen `(-translate-x-full)`, animated in via overlay.
- **Desktop:** Fixed width (e.g., `w-64`), visible.
- **Accessibility:** `<nav>` role, `aria-label="Main Navigation"`.

### 3. Mobile Navigation (Bottom Nav)
- **Purpose:** Quick tab-based navigation specifically designed for the Orang Tua (Parent) role.
- **Mobile:** Fixed to bottom (`bottom-0 w-full`), visible.
- **Desktop:** Hidden (`hidden md:flex`).
- **Accessibility:** `role="navigation"`, large touch targets (min 44x44px).

### 4. Topbar
- **Purpose:** Contextual header for mobile (hamburger icon) and global actions (notifications, profile avatar).
- **Mobile:** Sticky top, holds page title and menu toggle.
- **Desktop:** Sticky top, breadcrumbs or page title.
- **Accessibility:** `<header>` role.

### 5. PageHeader
- **Purpose:** Standardized title and primary call-to-action (CTA) row for all pages.
- **Mobile:** Stacked layout (`flex-col` if CTA is wide).
- **Desktop:** Inline `flex justify-between items-center`.
- **Accessibility:** Contains `<h1>`.

### 6. StatCard
- **Purpose:** KPI display (e.g., "Total Santri", "Kehadiran").
- **Mobile:** `col-span-1` or `w-full` horizontal layout.
- **Desktop:** Grid items (`md:col-span-1`).
- **Accessibility:** Decorative icons (`aria-hidden="true"`).

### 7. DataTable
- **Purpose:** Standard tabular data display for Admin screens.
- **Mobile:** Wrapped in `overflow-x-auto` to prevent layout breaking, though `MobileDataList` is preferred.
- **Desktop:** Full width table.
- **Accessibility:** `table`, `th` with `scope="col"`.

### 8. MobileDataList
- **Purpose:** Responsive alternative to tables for mobile devices. Displays rows as stacked cards.
- **Mobile:** Visible (`flex flex-col gap-3`).
- **Desktop:** Hidden (switches to `DataTable`).
- **Accessibility:** `ul` and `li` roles.

### 9. EmptyState
- **Purpose:** Feedback when lists/tables have no data.
- **Mobile/Desktop:** Centered column, muted icon, helpful text, and optional "Create" CTA.
- **Accessibility:** `role="status"`.

### 10. LoadingState
- **Purpose:** Feedback during data fetching or mutations.
- **Mobile/Desktop:** Skeleton loaders matching the physical shape of the data (cards/table rows) rather than generic spinners.
- **Accessibility:** `aria-busy="true"`, `role="status"`.

### 11. ErrorState
- **Purpose:** Fallback boundary for failed data fetching.
- **Mobile/Desktop:** Alert box (`bg-red-50 text-red-700`) with a "Coba Lagi" (Retry) button.
- **Accessibility:** `role="alert"`.

### 12. ConfirmDialog
- **Purpose:** Destructive action confirmation (Delete, Archive).
- **Mobile/Desktop:** Centered modal overlay, trap focus.
- **Accessibility:** `role="dialog"`, `aria-modal="true"`.

### 13. Form Pattern
- **Purpose:** Standardized input, labels, and validation feedback.
- **Mobile/Desktop:** Stacked labels (`flex-col`), inline validation errors (`text-red-500 text-[10px]`).
- **Accessibility:** Explicit `htmlFor` linking labels to inputs.

### 14. Toast/Feedback
- **Purpose:** Non-blocking success/error messages after mutations.
- **Implementation:** Since no dependency exists, build a lightweight React Context + Portal based toast.
- **Mobile:** Anchored to top-center.
- **Desktop:** Anchored to bottom-right.
- **Accessibility:** `role="status"`, `aria-live="polite"`.

### 15. Pagination
- **Purpose:** Server-side pagination controls.
- **Mobile:** Condensed (Prev / Next only).
- **Desktop:** Full numbers (Prev 1 2 3 Next).
- **Accessibility:** `aria-label="Pagination"`, `aria-current="page"` for active.

### 16. StatusBadge
- **Purpose:** Standardized pills for statuses (Active, Inactive, Hadir, Alfa).
- **Mobile/Desktop:** Small padding (`px-2 py-0.5`), distinct background/text color combos.
- **Accessibility:** Text conveys meaning, not just color.

---

## 4. Reusability & Refactor Strategy

### A. What to Reuse
- **Layout Shells:** Existing `app/[role]/layout.tsx` files.
- **Tailwind Tokens:** Existing color palette (`#4B21A2`, `#FBBF24`, etc.).
- **Chart Components:** `LearningProgressChart` and `AttendanceBarChart` (simply pass them real data props).
- **ProgressRing:** Continue using `components/ui/ProgressRing`.

### B. What to Create (New)
- **`components/ui/ConfirmDialog.tsx`**: Essential for preventing accidental deletes.
- **`components/ui/Toast.tsx`**: For mutation feedback.
- **`components/ui/EmptyState.tsx`**: Standardized empty placeholders.

### C. What NOT to Refactor Yet
- **Complex UI redesigns:** Stick to the current aesthetic.
- **Authentication/Session Logic:** Do not touch `rbac.ts` or `session.ts`.
- **Database Schema:** Use the data structures as they strictly exist today.
- **Chart Libraries:** Do not swap `recharts` for anything else.

---

## 5. Migration Strategy (Page-by-Page)

The repair should be sequenced systematically to unblock the most critical user paths first without breaking current mockups during transition.

### Phase 1: Foundation & Shared Components
1. Create `ConfirmDialog`, `Toast`, and `EmptyState`.
2. Refactor `app/admin/dashboard/page.tsx` grids to use mobile-first breakpoints (`grid-cols-1 md:grid-cols-3 lg:grid-cols-5`).

### Phase 2: RSC Data Binding (Dashboards)
1. **Guru Dashboard:** Convert `app/guru/dashboard/page.tsx` to an RSC. Fetch `getClassesByTeacher()` and `getStudentsByTeacher()`. Pass data to the client components. Remove hardcoded arrays.
2. **Admin Dashboard:** Convert to RSC. Fetch total counts using direct DB queries.
3. **Parent Dashboard:** Convert to RSC. Fetch `getChildrenByParent()`. Remove hardcoded "Ahmad Zaki Ramadhan".

### Phase 3: Forms and Mutations (Interactivity)
1. **Guru Absensi (`/guru/absensi`):** Make the page RSC to fetch the real student roster. Pass roster to a client `<AttendanceForm>` component that triggers the `POST /api/attendance` mutation and shows a Toast.
2. **Guru Laporan (`/guru/laporan`):** Fetch real assigned students. Hook the AI generator to the real endpoint and manage the loading state appropriately.

### Phase 4: Admin CRUD Completion
1. **Santri List (`/admin/santri`):** Shift the filtering and pagination from client-side array slicing to server-side query parameters (`?page=1&class=2`). 
2. **Edit/Delete Actions:** Wire the dead `<Edit>` and `<Trash2>` icons. The Trash icon should trigger the `ConfirmDialog` before firing `DELETE /api/students/[id]`.

### Acceptance Criteria for Completion
- No hardcoded business data remains in the UI.
- No horizontal overflow on 360px mobile screens.
- All destructive actions require confirmation.
- All successful mutations trigger UI feedback (Toast).
- All role-based dashboards render real database queries securely.
