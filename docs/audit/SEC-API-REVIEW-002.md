# SEC-API-REVIEW-002

**Date:** 2026-09-12  
**Scope:** Review of remaining APIs for Auth/IDOR vulnerabilities  
**Target:** `app/api/notifications/**`, `app/api/ai/analyze/**`, `app/api/surahs/**`

---

## Executive Summary
After rigorous inspection of the remaining routes comparing them to the `AUTHZ-HOTFIX-001` and `SEC-JWT-001` architectures, **no concrete, exploitable authorization or IDOR vulnerabilities were found.** All suspected risks are classified as False Positives. While the implementations use older patterns (like raw `getSession()` over `requireAuth()`), they inherently rely on trusted server-side execution and cryptographically verified JWT fields, preventing malicious client exploitation.

---

## 1. Notifications API (`app/api/notifications/route.ts`)

**Status:** FALSE POSITIVE (No Vulnerability)

- **Authentication:** Enforced via `getSession()`. Unauthenticated requests return `401 Unauthorized`.
- **Authorization & Ownership:** 
  - The endpoint exclusively uses `session.userId` (extracted from the trusted JWT) to fetch and mutate data (`getNotificationsByUser(session.userId)` and `markAllRead(session.userId)`).
  - It does NOT accept user IDs or notification IDs from the client payload or URL parameters.
- **Data Access:** A user can only fetch or mark-read their *own* notifications. Cross-tenant access (IDOR) is mathematically impossible because the query relies strictly on the signed session.
- **Comparison to `requireAuth()`:** While `requireAuth()` is the modern standard, it merely normalizes the role string. Since notifications do not branch logic based on roles (all users have notifications), bypassing `requireAuth()` here carries zero security risk. It is purely a stylistic inconsistency.

---

## 2. AI Analyze API (`app/api/ai/analyze/route.ts`)

**Status:** FALSE POSITIVE (No Vulnerability)

- **Authentication:** Enforced via `getSession()`.
- **Authorization:** 
  - Explicitly checks `session.role !== 'admin'`. Since the legacy session token stores the raw string `'admin'`, this hardcoded check successfully acts as a barrier preventing `guru` or `orang_tua` from escalating privileges.
- **AI Scope & IDOR:** 
  - The AI analysis **does not** operate on arbitrary client-supplied IDs. 
  - The client only supplies a text `question`. 
  - The server statically fetches `getAtRiskStudents()` without taking parameters, guaranteeing that the client cannot spoof a request to analyze a specific out-of-scope student or report.
- **Conclusion:** Safe from privilege escalation and IDOR. The only potential future risk is if the session generation logic migrates to issuing `'SUPER_ADMIN'` directly into the JWT, which would break this route (denial of service, not a data leak).

---

## 3. Surahs API (`app/api/surahs/route.ts`)

**Status:** FALSE POSITIVE (Intentional Design)

- **Authentication:** None.
- **Authorization:** None.
- **Data Access:** Invokes `getAllSurahs()`, which returns static, unchanging Quranic reference data (Surah names, ayah counts, types). 
- **Conclusion:** This is intentionally public reference data. There is no user-generated content (UGC), PII, or sensitive organizational data exposed here. Enforcing authentication on this endpoint would merely add unnecessary overhead to a static dictionary fetch.

---

## Final Recommendation
No immediate security patches are required for these three endpoints. They can safely remain as-is while higher-priority recovery tasks (like Classes and Users CRUD) are completed. A stylistic refactor to adopt `requireAuth()` can be scheduled for a later P3 polish phase.
