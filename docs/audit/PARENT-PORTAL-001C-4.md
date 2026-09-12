# PARENT-PORTAL-001C-4 — Orang Tua Notifikasi UI Recovery

**Task:** PARENT-PORTAL-001C-4  
**Date:** 2026-09-12  
**Auditor:** Antigravity  
**Branch:** feature/parent-portal-001c-4

---

## 1. Implementation Summary

The dummy `app/orang-tua/notifikasi/page.tsx` was fully rewritten to consume real database notifications bound to the authenticated parent session. 

- **Server-Side Rendering:** The main page remains a React Server Component (RSC), directly querying `getNotificationsByUser(session.userId)`.
- **Client-Side Interaction:** A discrete, highly-scoped `"use client"` component (`NotificationItem.tsx`) was introduced to encapsulate the "Mark as Read" behavior. This enables optimistic UI updates and interacts safely with the pre-existing `/api/notifications/[id]/read` endpoint.
- **RBAC Enforced:** Parent ownership is guaranteed because `getNotificationsByUser` explicitly filters on `user_id = session.userId`. Any client-side interactions to mark notifications as read are shielded by the backend's `PATCH` endpoint, which verifies `notification.user_id === session.userId`.

---

## 2. Files Changed

**Modified:**
- `app/orang-tua/notifikasi/page.tsx`: Rewritten as an RSC that fetches parent notifications and renders a list of `NotificationItem`s or an empty state.

**Created:**
- `app/orang-tua/notifikasi/NotificationItem.tsx`: A `"use client"` micro-component handling individual notification rendering, icon mapping, date formatting, and optimistic read-state mutation.

---

## 3. Data Sources & Authorization

| Data Requirement | Source Query Function / API |
|------------------|-----------------------|
| Parent Identity | `getSession()` -> `userId` |
| Notifications List | `getNotificationsByUser(userId)` |
| Mark as Read | `PATCH /api/notifications/[id]/read` |

**Authorization Flow:**
1. The RSC extracts `userId` from the secure server session.
2. `getNotificationsByUser(userId)` inherently isolates the query to the parent's owned notifications.
3. When a parent clicks a notification, the client component issues a `PATCH` request.
4. The API endpoint verifies the session exists, retrieves the notification by ID, and confirms `notification.user_id === session.userId`. If a parent attempts to mark a foreign notification as read, it responds with a `403 Forbidden` (or `404` if nonexistent).

---

## 4. Database Test Results

A local integration script verified the behavior against seeded database constraints:
- ✅ **Parent A sees only Parent A notifications:** Verified.
- ✅ **Parent A can mark own notification as read:** Verified (HTTP 200).
- ✅ **Parent A denied from marking Parent B notification as read:** Verified (HTTP 403/404).
- ✅ **Parent B sees only Parent B notifications:** Verified.
- ✅ **Parent B denied from marking Parent A notification as read:** Verified (HTTP 403/404).
- ✅ **Nonexistent notification ID is rejected safely:** Verified (HTTP 404).

---

## 5. Responsive & Visual Verification

- Visual hierarchy distinctly isolates unread notifications using a darker border (`#4B21A2`), a tinted background (`#F9F7FE`), emboldened text, and a blue/purple dot indicator.
- Once marked read, notifications gracefully transition into a muted grayscale palette, merging smoothly with historical notifications.
- The layout complies with the mobile-first specification constraint, employing `space-y-2`, rounded styling, and icon boundaries that safely limit width up to desktop size without artifacting or overflow at 360px.

---

## 6. Known Limitations

- Real-time updates (e.g., WebSockets or Server-Sent Events) are not implemented. Notifications only update upon manual page refresh or when marked as read, which is an acceptable behavior given the current system design constraints.
- Multi-child aggregation is intrinsically handled by the backend (notifications are targeted to the `user_id` regardless of which child triggered them). The UI treats all parent-owned notifications uniformly.

---

**COMMIT:** Recover parent notifications
**BRANCH:** feature/parent-portal-001c-4
**TYPECHECK:** PASS
**BUILD:** PASS
**DB TEST:** PASS
**SECURITY:** VERIFIED
**RESPONSIVE CODE:** VERIFIED
**VISUAL QA:** PASS
**REGRESSION:** PASS (No modifications to existing /api or Admin/Guru queries were required)
**STATUS:** COMPLETE
