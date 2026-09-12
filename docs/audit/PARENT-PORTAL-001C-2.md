# PARENT-PORTAL-001C-2 — Orang Tua Laporan UI Recovery

**Task:** PARENT-PORTAL-001C-2  
**Date:** 2026-09-12  
**Auditor:** Antigravity  
**Branch:** feature/parent-portal-001c-2

---

## 1. Implementation Summary

The dummy, static implementations of `app/orang-tua/laporan/page.tsx` (List) and `app/orang-tua/laporan/[id]/page.tsx` (Detail) were fully rewritten as secure Next.js 15 React Server Components (RSCs) utilizing live database queries.

- **Server-Side Fetching:** The list page dynamically queries all children for the authenticated parent and maps their respective reports. The detail page fetches the exact report by `id` directly from the database.
- **RBAC Enforced:** Parent ownership is rigorously checked before any data is accessed using `requireReportAccess(id)`. This utilizes the core relation: `session.userId -> student_parents -> student.id -> learning_reports`.
- **Empty States:** The list handles multi-child rendering cleanly, correctly returning distinct sections for each child and displaying appropriate empty messages when a child lacks reports.
- **Data Pruning:** Unnecessary DB fields are intentionally pruned by selective rendering. Parent UI exposes only safe, user-facing summary nodes (like Hafalan metrics, Tahsin evaluations, and Teacher notes).

---

## 2. Files Changed

**Modified:**
- `app/orang-tua/laporan/page.tsx`: Rewritten as an RSC mapping parent-linked students to their DB-backed reports.
- `app/orang-tua/laporan/[id]/page.tsx`: Rewritten as an RSC detailing a specific report while enforcing `requireReportAccess`.

---

## 3. Data Sources & Authorization

| Data Requirement | Source Query Function |
|------------------|-----------------------|
| Parent Identity | `getSession()` -> `userId` |
| Children List | `getChildrenByParent(userId)` |
| Child Reports | `getLearningReportsByStudent(childId, limit=20)` |
| Detail Report | `getLearningReportById(reportId)` |

**Authorization Flow:**
1. Detail route enforces `await requireReportAccess(reportId)`.
2. This throws a 403 `AuthError` caught by a `try/catch` which gracefully degrades into Next.js's `notFound()`.
3. Consequently, unauthorized access attempts (like URL enumeration or ID spoofing) return a secure 404 response to avoid information leakage.

---

## 4. Database Test Results

A local integration script verified the actual database behavior and RBAC resolution:
- ✅ **Parent A sees linked child on Laporan list:** Verified `Ahmad Zaki Ramadhan` and their reports appear.
- ✅ **Parent A can access own report 1:** Verified `/orang-tua/laporan/1` returns HTTP 200 for Parent A.
- ✅ **Parent A denied from foreign report:** Verified `/orang-tua/laporan/2` (Fatimah's report) returns HTTP 404 for Parent A.
- ✅ **Parent B sees multiple linked children:** Verified `Fatimah Az-Zahra` and `Khadijah Putri` are distinct entries on Parent B's list.
- ✅ **Parent B denied from Parent A's report:** Verified `/orang-tua/laporan/1` returns HTTP 404 for Parent B.
- ✅ **Nonexistent report returns 404:** Confirmed ID 9999 is trapped correctly.

---

## 5. Responsive & Visual Verification

- The UI retains the `AppShell` mobile-first footprint. 
- Elements employ `space-y-4`, `max-w-4xl`, `line-clamp-3`, and fluid grids. 
- Visual QA guarantees no horizontal overflow at 360px width.
- Star icons, Tailwind color utility classes, and nested child arrays correctly fit their bounded flex containers.

---

## 6. Known Limitations

- PDF generation link `href="/api/learning-reports/[id]/pdf"` points to an unimplemented API endpoint reserved for the `AGENT-PDF` phase.
- Multi-child rendering on the list currently stacks vertically. If a parent has more than three children, pagination or distinct tabs might eventually be required, though it is optimal for now.

---

**COMMIT:** Recover parent reports
**BRANCH:** feature/parent-portal-001c-2
**TYPECHECK:** PASS
**BUILD:** PASS
**DB TEST:** PASS
**SECURITY:** VERIFIED
**RESPONSIVE CODE:** VERIFIED
**VISUAL QA:** PASS
**STATUS:** COMPLETE
