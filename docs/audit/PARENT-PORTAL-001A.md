# PARENT-PORTAL-001A — Orang Tua Portal: Read-Only Audit

**Task:** PARENT-PORTAL-001A  
**Date:** 2026-09-12  
**Auditor:** Antigravity (read-only, no changes made)  
**Branch audited:** current working tree (main/recovery baseline)

---

## A. Current Route Inventory

| Route | File | Type | Status |
|-------|------|------|--------|
| `/orang-tua` (layout) | `app/orang-tua/layout.tsx` | `'use client'` layout | ✅ Present — AppShell `variant="mobile"` integrated |
| `/orang-tua/beranda` | `app/orang-tua/beranda/page.tsx` | `'use client'` page | ⚠️ All data hardcoded/static |
| `/orang-tua/laporan` | `app/orang-tua/laporan/page.tsx` | `'use client'` page | ⚠️ Static array of 4 fake reports |
| `/orang-tua/laporan/[id]` | `app/orang-tua/laporan/[id]/page.tsx` | `'use client'` page | ⚠️ Static dummy data, no `id` param used |
| `/orang-tua/absensi` | `app/orang-tua/absensi/page.tsx` | `'use client'` page | ⚠️ Static 5-day array, hardcoded name/month |
| `/orang-tua/notifikasi` | `app/orang-tua/notifikasi/page.tsx` | `'use client'` page | ⚠️ Static 2-notification array |

**Missing routes per AGENTS.md spec:**
- No `/orang-tua` index redirect (root of segment). Middleware handles `/` redirect but not `/orang-tua` itself.

---

## B. Current API Inventory (Parent-Relevant)

### Usable As-Is for Parent

| Endpoint | Method | Parent Role Handled? | Notes |
|----------|--------|----------------------|-------|
| `GET /api/students` | GET | ✅ Yes — `ORANG_TUA` branch calls `getChildrenByParent(session.userId)` | Correctly scoped |
| `GET /api/students/[id]` | GET | ✅ Yes — `requireStudentAccess` enforces parent→child link | Usable |
| `GET /api/classes` | GET | ✅ Yes — `ORANG_TUA` branch calls `getClassesByParent(session.userId)` | Usable |
| `GET /api/hafalan?student_id=` | GET | ✅ Yes — `requireStudentAccess` enforced | Usable, parent can read child hafalan |
| `GET /api/notifications` | GET | ✅ Yes — scoped to `session.userId` | Usable |
| `PATCH /api/notifications` (mark all read) | PATCH | ✅ Yes — scoped to `session.userId` | Usable |

### APIs Requiring Parent-Specific Authorization (Gaps)

| Endpoint | Issue |
|----------|-------|
| `GET /api/learning-reports?student_id=` | ✅ `requireStudentAccess` enforced. BUT: no `ORANG_TUA`-specific branch in the handler. If parent calls **without** `student_id` param, the route falls through to `GURU` and `SUPER_ADMIN` branches and returns **403**. Parent must always supply `?student_id=`. |
| `GET /api/learning-reports` (no student_id) | ❌ **Missing parent branch** — parent gets 403 |
| `GET /api/attendance?class_id=&date=` | ⚠️ `requireClassAccess` is enforced and does check parent→child→class link, so technically usable. But the endpoint is designed for Guru roll-call, not parent monthly summary. |
| `GET /api/attendance` (no class_id) | ❌ Defaults to `class_id=1` — **hardcoded fallback is a security issue** |

### Missing Endpoints (No Route Exists)

| Missing Endpoint | Required By |
|-----------------|-------------|
| `GET /api/learning-reports/[id]` | UIP-2 (report detail page), `requireReportAccess` exists in RBAC but no route handler |
| `GET /api/learning-reports/[id]/pdf` | UIP-2 "Download PDF" button |
| `GET /api/attendance?student_id=&month=` (parent-scoped) | UIP-4 (attendance calendar view) |
| `PATCH /api/notifications/[id]/read` (single read) | UIP-5 |

**Confirmed:** The directory `app/api/learning-reports/[id]/` exists but contains only an `ai/` subdirectory — **there is no `route.ts` at `[id]` level**. `requireReportAccess` function exists in `lib/auth/rbac.ts` and is parent-aware but is not wired to any GET/PATCH route.

---

## C. DB / Query Layer Inventory

### Tables in Schema

| Table | Present in `drizzle/schema.ts`? | Relevant to Parent? |
|-------|---------------------------------|---------------------|
| `users` | ✅ | Identity of parent user |
| `student_parents` | ✅ `studentParents` table | Core parent-child link |
| `students` | ✅ | Child records |
| `classes` | ✅ | Child's class |
| `programs` | ✅ | Program enrollment |
| `attendance` | ✅ | Child attendance |
| `hafalan_records` | ✅ | Child hafalan |
| `tahsin_records` | ✅ | Child tahsin (joined via learning_reports) |
| `learning_reports` | ✅ | Core report a parent reads |
| `notifications` | ✅ | Parent notifications |

**All tables required for the parent portal exist. No schema changes needed.**

### Query Functions — Status

| File | Function | Status | Notes |
|------|----------|--------|-------|
| `student-parents.ts` | `getChildrenByParent` | ✅ Ready | Joins students+classes+programs, scoped to parentId |
| `student-parents.ts` | `getParentsByStudent` | ✅ Ready | Used by admin/guru |
| `student-parents.ts` | `linkParentToStudent` | ✅ Ready | Admin use |
| `students.ts` | `getStudentById` | ✅ Ready | Returns class_name, program_name, teacher_name |
| `attendance.ts` | `getAttendanceSummaryByStudent` | ✅ Ready | Returns hadir/izin/sakit/alfa counts, but `month` param is accepted but **not applied in SQL** — always returns all-time totals |
| `attendance.ts` | `getAttendanceByClassDate` | ⚠️ Guru-centric | Needs class_id+date, not student_id+month — not directly usable for parent's monthly calendar |
| `hafalan.ts` | `getHafalanByStudent` | ✅ Ready | Full hafalan history |
| `learning-reports.ts` | `getLearningReportsByStudent` | ✅ Ready | Chronological report list scoped to student |
| `learning-reports.ts` | `getLearningReportById` | ✅ Ready | Full report detail with joins |
| `learning-reports.ts` | `getDraftReportsByTeacher` | ❌ **MISSING** | Spec'd in AGENTS.md Q-9 but not implemented |
| `notifications.ts` | `getNotificationsByUser` | ✅ Ready | Paginated, scoped to userId |
| `notifications.ts` | `markNotificationRead` | ✅ Ready | Single-notification mark |
| `notifications.ts` | `markAllRead` | ✅ Ready | Bulk mark |
| `classes.ts` | `getClassesByParent` | ✅ Ready | Correctly scoped through student_parents |

**Missing query function:**
- `getAttendanceByStudentMonth(studentId, month)` — does not exist. The closest is `getAttendanceSummaryByStudent` but it ignores the `month` param in SQL.

---

## D. Parent Authorization Flow

### Session Identity (CONFIRMED)

1. Parent logs in via `POST /api/auth/login`.
2. On success, a JWT is issued containing `{ userId, role: 'orang_tua', fullName }`.
3. JWT is stored in `mq_session` httpOnly cookie.
4. `getSession()` in `lib/auth/session.ts` reads and verifies the JWT.
5. `requireAuth()` in `lib/auth/rbac.ts` calls `getSession()` and normalizes role to canonical `'ORANG_TUA'`.

### How Parent Identity Is Obtained in Queries (CONFIRMED)

- **Session → userId** is the canonical parent identity.
- Parent's `userId` maps directly to `users.id`.
- `student_parents.parent_id` references `users.id`.
- All parent-scoped queries must join through `student_parents` using `parentId = session.userId`.

### Parent RBAC Functions in `lib/auth/rbac.ts` (CONFIRMED)

| RBAC Function | Parent Guard Logic |
|--------------|-------------------|
| `requireStudentAccess(studentId)` | Verifies `student_parents` row exists: `studentId = studentId AND parentId = session.userId` |
| `requireClassStudentAccess(classId, studentId)` | Verifies child is in that class via `student_parents` |
| `requireClassAccess(classId)` | Verifies parent has a child enrolled in that class |
| `requireReportAccess(reportId)` | Verifies report's student is linked to parent via `student_parents` |

**All four RBAC guards are correctly scoped through `student_parents`. No free-floating parent data access exists.**

### Middleware (CONFIRMED)

- `middleware.ts` enforces role-to-path mapping: `orang_tua → /orang-tua`.
- Injects `x-user-id` and `x-user-role` headers for RSC consumption.
- Parent accessing `/guru` or `/admin` paths is redirected to `/orang-tua/beranda`.

---

## E. Security Gaps

### CONFIRMED GAPS

| Gap ID | Severity | Location | Description |
|--------|----------|----------|-------------|
| **SEC-P-01** | 🔴 HIGH | `GET /api/attendance` route.ts L8 | `classId` defaults to `1` if not provided: `const classId = Number(searchParams.get('class_id') \|\| 1)`. Any authenticated user who omits `class_id` gets class 1 data — `requireClassAccess(1)` may grant access if any parent happens to have a child in class 1. |
| **SEC-P-02** | 🟡 MEDIUM | `app/orang-tua/laporan/[id]/page.tsx` | Page is `'use client'`, receives no dynamic `params` — it never reads the `id` param. Download PDF and Share buttons are non-functional buttons. **No actual data fetched.** |
| **SEC-P-03** | 🟡 MEDIUM | `GET /api/learning-reports` | No `ORANG_TUA` branch without `student_id`. Parent is expected to always supply `student_id` but this is undocumented and not enforced with a helpful error. |
| **SEC-P-04** | 🟢 LOW | `app/orang-tua/layout.tsx` L32 | `userInitials="MQ"` and `userName="Mahabbah Qur'an"` are hardcoded. The layout does not read the session to display the actual parent name/initials. This is a UX/trust issue — parent sees a generic name, not their own. |
| **SEC-P-05** | 🟢 INFO | `requireStudentAccess` | When `role === 'ORANG_TUA'`, no check on student `deleted_at`. A parent whose child was soft-deleted can still pass `requireStudentAccess`. (Low risk as soft-deleted students' data is still valid historical data.) |

### NOT A RISK (by design)

- `requireStudentAccess`, `requireReportAccess`, `requireClassAccess` all correctly scope queries through `student_parents`. No client-supplied student IDs are trusted without server-side verification.
- `GET /api/hafalan?student_id=` correctly calls `requireStudentAccess` before returning data.
- `GET /api/students` for `ORANG_TUA` role ignores all query params — returns children only from session, not from any URL param.

---

## F. Dummy / Static UI / Data

All four parent pages are fully static. No real data is fetched from the API.

| File | What Is Hardcoded |
|------|------------------|
| `beranda/page.tsx` | Student name "Ahmad Zaki Ramadhan", initials "AZ", class "Kelompok A · Tahfizh Juz 30", teacher "Ustadz Aldi Solihin", all metric values (75%, 92%, 88/100), report date "4 Sep 2026", surah "An-Naba 1-10", all report text, link to `/orang-tua/laporan/1` (hardcoded ID) |
| `laporan/page.tsx` | 4-item static `reports` array with fixed surah names, scores, teacher, dates. Student name "Ahmad Zaki Ramadhan" |
| `laporan/[id]/page.tsx` | Entire report content — student name, date, teacher, attendance status, surah, ayat range, hafalan score, all 4 tahsin star ratings, teacher notes, parent advice. `id` param is never read. Both action buttons (Download PDF, Bagikan) are non-functional `<button>` elements with no `onClick`. |
| `absensi/page.tsx` | 5-day static `days` array, hardcoded summary counts (4 hadir, 1 izin, 0 sakit, 0 alfa), student name "Ahmad Zaki Ramadhan", month "September 2026" |
| `notifikasi/page.tsx` | 2-item static `notifs` array with hardcoded titles, bodies, times. No unread state, no pagination. |

**The layout itself hardcodes `userInitials="MQ"` and `userName="Mahabbah Qur'an"` instead of reading from session.**

---

## G. Recommended Implementation Sequence

```
Step 1 — Add missing GET /api/learning-reports/[id] route
  File: app/api/learning-reports/[id]/route.ts (NEW)
  Uses: getLearningReportById + requireReportAccess
  Needed by: every parent page

Step 2 — Fix getAttendanceSummaryByStudent to respect month param
  File: lib/db/queries/attendance.ts (MODIFY)
  Add WHERE attendance_date >= date_trunc('month', ${month}::date)
  Needed by: UIP-4

Step 3 — Add GET /api/attendance?student_id=&month= (parent-scoped)
  File: app/api/attendance/route.ts (MODIFY — add student_id branch for ORANG_TUA)
  Or optionally a separate endpoint
  Needed by: UIP-4

Step 4 — Add PATCH /api/notifications/[id]/read
  File: app/api/notifications/[id]/route.ts (NEW)
  Uses: markNotificationRead
  Needed by: UIP-5

Step 5 — Recover beranda/page.tsx (UIP-1)
  Convert from 'use client' static → RSC
  Read children from GET /api/students (ORANG_TUA branch)
  Read latest report from GET /api/learning-reports?student_id=
  Real parent name from x-user-id header / session

Step 6 — Recover laporan/page.tsx (UIP-3)
  Convert from 'use client' static → RSC
  Fetch child list, then reports per child

Step 7 — Recover laporan/[id]/page.tsx (UIP-2)
  Convert from 'use client' static → RSC
  Read params.id
  Fetch with GET /api/learning-reports/[id]
  Wire "Download PDF" button to client component → GET /api/learning-reports/[id]/pdf
  Wire "Bagikan" button

Step 8 — Recover absensi/page.tsx (UIP-4)
  Convert from 'use client' static → RSC
  Monthly calendar from attendance data (student_id + month from URL param)

Step 9 — Recover notifikasi/page.tsx (UIP-5)
  Convert from 'use client' static → RSC shell + client list
  Real data from GET /api/notifications
  Tap-to-read using PATCH /api/notifications/[id]/read

Step 10 — Fix layout.tsx hardcoded user info
  Read x-user-id / x-user-role headers from request headers
  Pass actual parent name+initials to AppShell

Step 11 — Fix SEC-P-01: attendance route classId default
  Remove fallback to 1 in attendance route.ts
```

---

## H. Files That Should Be Changed

### New Files (create)

| File | Why |
|------|-----|
| `app/api/learning-reports/[id]/route.ts` | Missing GET + PATCH for report detail, required by UIP-2 |
| `app/api/notifications/[id]/route.ts` | Missing PATCH for single notification read, required by UIP-5 |

### Modify Files

| File | Change Required |
|------|----------------|
| `app/orang-tua/layout.tsx` | Read actual parent name/initials from session headers; remove hardcoded `"MQ"` / `"Mahabbah Qur'an"` |
| `app/orang-tua/beranda/page.tsx` | Full recovery — RSC, real API calls, real child data |
| `app/orang-tua/laporan/page.tsx` | Full recovery — RSC, real API calls, real report list |
| `app/orang-tua/laporan/[id]/page.tsx` | Full recovery — RSC, read `params.id`, real report detail, functional buttons |
| `app/orang-tua/absensi/page.tsx` | Full recovery — RSC, real attendance data per child |
| `app/orang-tua/notifikasi/page.tsx` | Full recovery — RSC shell + client list, real notifications, mark-as-read |
| `app/api/attendance/route.ts` | Fix SEC-P-01 (remove default classId=1); add `ORANG_TUA` student_id branch |
| `lib/db/queries/attendance.ts` | Fix `getAttendanceSummaryByStudent` — apply `month` param in SQL |

---

## I. Files That Should NOT Be Changed

| File | Reason |
|------|--------|
| `components/layout/AppShell.tsx` | AppShell-002 integration already present and correct; `variant="mobile"` is working |
| `components/layout/AccountMenu.tsx` | No changes needed |
| `lib/auth/rbac.ts` | All four parent RBAC guards are correct and complete |
| `lib/auth/session.ts` | Correct and complete |
| `middleware.ts` | Correct — `orang_tua → /orang-tua/beranda` redirect works |
| `lib/db/queries/student-parents.ts` | `getChildrenByParent` and `getParentsByStudent` are correct |
| `lib/db/queries/learning-reports.ts` | `getLearningReportsByStudent` and `getLearningReportById` are correct |
| `lib/db/queries/notifications.ts` | All notification queries are correct |
| `lib/db/queries/students.ts` | `getStudentById` is correct |
| `lib/db/queries/hafalan.ts` | `getHafalanByStudent` is correct |
| `lib/db/queries/classes.ts` | `getClassesByParent` is correct |
| `app/api/students/route.ts` | `ORANG_TUA` branch already correct |
| `app/api/classes/route.ts` | `ORANG_TUA` branch already correct |
| `app/api/hafalan/route.ts` | `requireStudentAccess` guard already correct |
| `drizzle/schema.ts` | No changes needed (see Section J) |

---

## J. DB Migration Requirement

**NO — DB migration is NOT required.**

All tables required by the parent portal already exist in `drizzle/schema.ts`:
- `users` ✅
- `student_parents` ✅ (with `student_id`, `parent_id`, `relationship`, `is_primary`)
- `students` ✅
- `classes` ✅ (with `program_id`, `teacher_id`)
- `programs` ✅
- `attendance` ✅
- `hafalan_records` ✅
- `tahsin_records` ✅
- `learning_reports` ✅ (including `ai_report_text`, `ai_parent_advice`, `sent_to_parent_at`)
- `notifications` ✅ (with `reference_type`, `reference_id`, `is_read`)

The existing schema is sufficient for all parent portal features.

---

## K. Acceptance Criteria for PARENT-PORTAL-001B

The recovery implementation (PARENT-PORTAL-001B) is complete when all of the following pass:

### Authentication & Authorization
- [ ] Parent logs in with `role = 'orang_tua'` → redirected to `/orang-tua/beranda`
- [ ] Parent cannot access `/guru/**` or `/admin/**` — middleware redirects to `/orang-tua/beranda`
- [ ] `GET /api/learning-reports/[id]` returns 403 when parent is not linked to that report's student
- [ ] `GET /api/hafalan?student_id=X` returns 403 when X is not parent's child
- [ ] `GET /api/notifications` returns only current parent's notifications
- [ ] `PATCH /api/notifications/[id]/read` returns 403 if notification does not belong to current user

### Beranda Page (`/orang-tua/beranda`)
- [ ] Displays real parent's child name, class, program, teacher name
- [ ] Displays real hafalan progress %, attendance %, average score
- [ ] Shows latest `status = 'sent'` learning report (surah, score, teacher notes, parent advice)
- [ ] "Lihat Laporan" link navigates to real report ID (not hardcoded `/laporan/1`)
- [ ] Topbar shows actual parent name and initials (not "MQ" / "Mahabbah Qur'an")

### Laporan List (`/orang-tua/laporan`)
- [ ] Lists real learning reports for parent's child, newest first
- [ ] Each row shows: date, surah name (from `surah_name_latin`), hafalan score, teacher name
- [ ] Each row links to `/orang-tua/laporan/[real-id]`
- [ ] Empty state shown if no reports

### Laporan Detail (`/orang-tua/laporan/[id]`)
- [ ] Page reads `params.id` and fetches from `GET /api/learning-reports/[id]`
- [ ] 404 page shown if report not found or not accessible
- [ ] All sections display real data: student info, attendance status, hafalan section, tahsin stars, teacher notes, parent advice
- [ ] "Download PDF" button triggers `GET /api/learning-reports/[id]/pdf` (or shows coming-soon if PDF route not yet deployed)
- [ ] "Bagikan Laporan" uses native share API or copies link

### Absensi Page (`/orang-tua/absensi`)
- [ ] Shows real attendance for parent's child for current month
- [ ] Summary counts (hadir/izin/sakit/alfa) match real data
- [ ] Day list reflects real attendance records
- [ ] No hardcoded student name, no hardcoded month

### Notifikasi Page (`/orang-tua/notifikasi`)
- [ ] Lists real notifications for current parent from `GET /api/notifications`
- [ ] Unread notifications are visually distinct
- [ ] Tapping a notification marks it read via `PATCH /api/notifications/[id]/read`
- [ ] "Mark all read" works
- [ ] Empty state shown when no notifications

### Security
- [ ] `GET /api/attendance` no longer defaults to `class_id=1` — missing param returns 400
- [ ] No hardcoded student IDs remain in any parent page

---

## Summary of Findings

### What's Working
| Area | Status |
|------|--------|
| AppShell `variant="mobile"` integration | ✅ Fully integrated |
| Middleware role guard for `orang_tua` | ✅ Correct |
| RBAC `student_parents` scoping | ✅ All 4 guards correct |
| `GET /api/students` (ORANG_TUA branch) | ✅ Ready |
| `GET /api/classes` (ORANG_TUA branch) | ✅ Ready |
| `GET /api/hafalan` (with requireStudentAccess) | ✅ Ready |
| `GET /api/notifications` | ✅ Ready |
| All query functions except getAttendanceSummaryByStudent month filter | ✅ Ready |
| DB schema completeness | ✅ No migrations needed |

### What Needs Recovery
| Area | Status |
|------|--------|
| All 4 parent pages | ❌ 100% static dummy data |
| Layout hardcoded initials/name | ❌ Hardcoded |
| `GET /api/learning-reports/[id]` route | ❌ Missing |
| `PATCH /api/notifications/[id]/read` route | ❌ Missing |
| `GET /api/attendance` classId=1 default | ❌ Security risk |
| `getAttendanceSummaryByStudent` month param | ❌ Not applied in SQL |
| Parent attendance view (student-scoped) | ❌ No parent-aware attendance query/endpoint |
