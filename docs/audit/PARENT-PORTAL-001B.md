# PARENT-PORTAL-001B — Backend Recovery & Security Audit

**Task:** PARENT-PORTAL-001B  
**Date:** 2026-09-12  
**Auditor:** Antigravity  
**Branch:** feature/parent-portal-001b

---

## 1. Dependency Findings

Prior to implementing backend changes, we analyzed the existing API callers across the application:
- **`GET /api/attendance`**: Used by Guru UI (`app/guru/absensi`) with `class_id` and `date`. No Admin callers were found directly invoking this via fetch, but the endpoint serves as the primary roll-call interface.
- **`GET /api/learning-reports`**: Used by Admin and Guru to fetch reports. Guru uses `POST /api/learning-reports/[id]/ai` but does not rely on a GET detail endpoint.
- **`GET /api/notifications`**: Used by the notification bell to fetch lists. `PATCH /api/notifications/[id]/read` was missing completely.
- **`GET /api/students` & `/api/classes` & `/api/hafalan`**: Already correctly scoped and actively used by Guru and Admin.

---

## 2. API Behavior & Changes

The following targeted backend changes were implemented to securely support the Parent Portal UI while preserving existing roles:

### A. Attendance API (`/api/attendance`)
- **Fixed Security Risk (SEC-P-01):** Removed the default `class_id=1` fallback. Omitting `class_id` now correctly returns a 400 Bad Request for Admin/Guru.
- **Added ORANG_TUA Branch:** Parents can now query this endpoint using `?student_id=X&month=YYYY-MM`. The query is fully protected by `requireStudentAccess(X)`, meaning parents can only query attendance for their own children.
- **Updated Query Function:** Modified `getAttendanceSummaryByStudent` to optionally filter by `YYYY-MM` month using `TO_CHAR` and added `getAttendanceByStudentMonth` to support detailed month-view.

### B. Learning Reports API (`/api/learning-reports/[id]`)
- **Created GET Endpoint:** Implemented a read-only endpoint that fetches report details via `getLearningReportById`.
- **Authorization:** Enforced via `requireReportAccess(id)`, ensuring a parent can only view reports linked to their own child.
- **No PATCH Route Added:** As instructed, since there is no Parent or Guru business requirement to update draft reports from the detail page, no PATCH endpoint was added here.

### C. Notifications API (`/api/notifications/[id]/read`)
- **Created PATCH Endpoint:** Implemented a route to mark single notifications as read.
- **Ownership Verification:** The route fetches the notification using a new query function `getNotificationById` and explicitly validates `notification.user_id === session.userId` before calling `markNotificationRead`.

---

## 3. Database Verification Results

A local testing script (`scripts/test-parent-auth.ts`) was executed against a live instance and the database seed. The following scenarios passed successfully:

- ✅ Parent A → linked student → 200 PASS
- ✅ Parent A → unrelated student → 403 PASS
- ✅ Parent A → random/nonexistent student → 403 PASS
- ✅ Guru attendance behavior → 200 PASS
- ✅ Admin attendance behavior → 200 PASS
- ✅ Parent learning report access → 200 PASS
- ✅ Parent unrelated report → 403 PASS
- ✅ Parent notification ownership → 200 PASS
- ✅ Unrelated notification → 403 PASS

---

## 4. Security Verification

- **IDOR Check:** All Parent endpoints explicitly enforce server-side relational checks using the established RBAC library (`requireStudentAccess`, `requireReportAccess`).
- **Client-Supplied Role:** No endpoint trusts the client to define its own role. Role and session ID are retrieved securely from the JWT payload.
- **Data Leakage:** Queries do not return excessive parent or child information to unrelated users. Notification ownership explicitly prevents cross-user read mutation.

---

## 5. Build & Typecheck Results

- **Typecheck:** `tsc` compiled successfully with no strict errors.
- **Build:** `npm run build` completed successfully, producing an optimized Next.js production build.

---

## 6. Known Limitations

- Parent pages (`app/orang-tua/**`) still contain static dummy data. The backend is now ready, but the UI must be migrated to RSCs to utilize it.
- PDF Generation route (`/api/learning-reports/[id]/pdf`) has not been scoped or tested in this backend recovery, as it falls under the purview of AGENT-PDF.

---

## 7. Recommended Next Step: PARENT-PORTAL-001C

Proceed with the UI implementation (Task: PARENT-PORTAL-001C).
Convert the four parent pages from static `'use client'` to React Server Components (RSCs) and wire them to these newly secured backend endpoints.

---

**COMMIT:** Backend security recovery for parent portal
**BRANCH:** feature/parent-portal-001b
**TYPECHECK:** PASS
**BUILD:** PASS
**DB TEST:** PASS
**SECURITY:** VERIFIED
**STATUS:** COMPLETE
