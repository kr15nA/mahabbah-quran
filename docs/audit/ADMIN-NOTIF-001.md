# ADMIN-NOTIF-001 — Admin Notifikasi Management Recovery

**Task:** ADMIN-NOTIF-001  
**Date:** 2026-09-12  
**Auditor:** Antigravity  
**Branch:** feature/admin-notif-001

---

## 1. Implementation Summary

The dummy `app/admin/notifikasi/page.tsx` was rewritten into a secure React Server Component (RSC). 
During the audit phase, it was determined that the `notifications` table structure securely binds notifications to a specific `user_id`. Instead of exposing a global institution-wide firehose (which could leak private parent or teacher data), the Admin Notifikasi module strictly renders notifications that are **explicitly targeted to the logged-in Admin**. This cleanly reuses the existing notification query architecture established during the Parent Portal recovery.

- **Server-Side Fetching:** The module leverages `searchNotifications` added to `lib/db/queries/notifications.ts`. This query natively supports text searching against `title` and `body`, as well as filtering by `is_read` status directly in SQL.
- **Client-Side Interactivity:** The list, search bar, status filter dropdown, and the "Tandai Semua Dibaca" (Mark All Read) button are encapsulated in a `"use client"` component (`NotifikasiClient.tsx`). Filtering seamlessly synchronizes with URL query parameters (`?status=unread&page=1`), preserving SSR routing.
- **RBAC Enforced:** The page strictly requires `SUPER_ADMIN` via `requireAuth()`.

---

## 2. Files Changed

**Modified:**
- `app/admin/notifikasi/page.tsx`: Rewrote static dummy page to RSC handling authorization and parameterized data fetching.
- `lib/db/queries/notifications.ts`: Added `searchNotifications` query function for secure admin listing, filtering, and pagination of notifications.

**Created:**
- `app/admin/notifikasi/NotifikasiClient.tsx`: Client component wrapping the notification list, search inputs, pagination logic, and API calls for marking notifications as read.

---

## 3. Data Sources & Authorization

| Data Requirement | Source Query Function |
|------------------|-----------------------|
| Admin Identity | `requireAuth()` -> `SUPER_ADMIN` |
| Filtered Notifications | `searchNotifications(limit, offset, search, isRead, userId)` |
| Mark All Read | `PATCH /api/notifications` |
| Mark Single Read | `PATCH /api/notifications/[id]/read` |

**Authorization Flow:**
1. Next.js Edge Middleware natively restricts access to `/admin/*` routes.
2. The RSC additionally calls `requireAuth()` to assert `role === 'SUPER_ADMIN'`.
3. If unauthorized users bypass middleware, `requireAuth()` intercepts and fires `redirect('/login')`.
4. Only upon successful authorization does the server query the `notifications` table, explicitly restricted by `user_id = session.userId`. 
5. The `PATCH` endpoints enforce their own `getSession()` ownership checks natively.

---

## 4. Database Test Results

A local integration script verified the behavior against seeded database constraints:
- ✅ **Admin can view Notifikasi page:** Verified (HTTP 200 with populated scoped data).
- ✅ **Guru denied from accessing Admin Notifikasi:** Verified (Intercepted by Middleware/Auth layer).
- ✅ **Parent denied from accessing Admin Notifikasi:** Verified (Intercepted by Middleware/Auth layer).
- ✅ **Status filter updates values correctly:** Verified that setting `?status=unread` strictly returned unread records.

---

## 5. Responsive & Visual Verification

- **Desktop:** A clean, wide list of notifications with titles, timestamps, bodies, and read status indicators.
- **Mobile/Tablet Constraints:** The list acts as vertical cards wrapping safely. The global page preserves the structural integrity of the `AdminAppShell` without introducing horizontal layout breaking.
- Loading transitions (search debouncing/filtering) are gracefully handled by `useTransition` rendering a semi-transparent loading spinner overlay, preventing UI freezing.

---

## 6. Known Limitations

- **Personal Scope Only:** As established by the schema, an Admin only sees notifications explicitly sent to them by the system. They cannot read notifications intended for a specific Guru or Parent, protecting data privacy.
- **Broadcast Generation:** This page is strictly for *reading* notifications. The capability for an Admin to manually broadcast a custom notification to all users is not part of this view (it would belong to a separate messaging workflow if requested later).

---

**COMMIT:** Recover notifications
**BRANCH:** feature/admin-notif-001
**TYPECHECK:** PASS
**BUILD:** PASS
**DB TEST:** PASS
**SECURITY:** VERIFIED
**RESPONSIVE CODE:** VERIFIED
**VISUAL QA:** PASS
**REGRESSION:** PASS (Guru/Parent pathways unaffected)
**STATUS:** COMPLETE
