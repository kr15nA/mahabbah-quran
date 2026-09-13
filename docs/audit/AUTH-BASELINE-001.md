# AUTH-BASELINE-001: Server-Side Authorization Audit
**Date:** 2026-09-12
**Status:** Pre-Implementation Baseline
**Scope:** API Route Authorization, IDOR Vulnerabilities, Resource Ownership

## 1. Global Authentication Status
All endpoints under `app/api/` (except public ones like `/api/auth/login`) correctly check for session existence via `getSession()`. **Authentication is globally enforced.**

## 2. Endpoint Authorization Analysis

1. **Is authentication checked?** Yes, across all protected routes.
2. **Is role checked?** Yes, mostly correct for mutations (e.g., `admin` checks for creates). However, read operations sometimes misuse role fallback (e.g., parents falling into admin paths).
3. **Is resource ownership/access checked?** No. Most routes lack verification that the caller (Teacher/Parent) actually owns or is assigned to the requested resource.
4. **Can a user access another user's resource by changing an ID?** Yes. Widespread Insecure Direct Object Reference (IDOR).
5. **Does the endpoint trust client-supplied userId/studentId/teacherId?** Yes, for relationships. For example, `POST /api/learning-reports` uses `session.userId` for the teacher but trusts `body.student_id`.
6. **Does the endpoint query by session identity?** Only in isolated cases like `/api/notifications`, which securely uses `getNotificationsByUser(session.userId)`.
7. **Does the endpoint return more data than the role should see?** Yes. Parents can fetch all school students via `GET /api/students` and all classes via `GET /api/classes`.
8. **Are mutation endpoints protected against privilege escalation?**
   - **Vertical (Role Escalation):** Secure. Mutations require strict roles (`admin` / `guru`).
   - **Horizontal (IDOR):** Insecure. Users can mutate resources belonging to others within the same role constraints.

## 3. Specific Scenarios Tested

| Scenario | Status | Finding |
|----------|--------|---------|
| **Parent A requests Student B** | **CONFIRMED** | `GET /api/students/[id]` and `GET /api/learning-reports?student_id=[id]` perform no relationship checks. |
| **Parent A attempts to update Student B** | **FALSE POSITIVE** | `PATCH /api/students/[id]` strictly requires `admin` role. Request is blocked (403). |
| **Teacher A requests a student assigned to Teacher B** | **CONFIRMED** | Same vulnerability as Parent A; `GET /api/students/[id]` is universally accessible to any authenticated session. |
| **Teacher attempts to create data for an unrelated student** | **CONFIRMED** | `POST /api/learning-reports` and `POST /api/attendance` trust `body.student_id` without verifying the student belongs to the teacher's class. |
| **Non-admin attempts admin-only mutations** | **FALSE POSITIVE** | Routes like `POST /api/students` or `POST /api/classes` check `session.role !== 'admin'` and block appropriately (403). |
| **User manipulates IDs in URL/body** | **CONFIRMED** | Systemic IDOR across `GET` and `POST` routes accepting IDs. |
| **User manipulates role in request payload** | **FALSE POSITIVE** | Role is extracted securely from the signed JWT payload in the `mq_session` cookie. Payload manipulation is ignored. |

## 4. Confirmed Security Issues

**ID**: AUTH-IDOR-001
- **Severity**: High
- **File**: `app/api/students/[id]/route.ts`
- **Location**: `GET` method
- **Evidence**: `const student = await getStudentById(id)` with no subsequent ownership validation.
- **Attack Scenario**: A parent alters the numeric ID in the URL to view PII of another family's child.
- **Impact**: PII data leak across the institution.
- **Recommended Fix**: Implement an access check that verifies if the user is an admin, the student's assigned teacher, or the student's linked parent.
- **Acceptance Criteria**: Endpoint returns 403 Forbidden for unrelated parents/teachers.

**ID**: AUTH-IDOR-002
- **Severity**: High
- **File**: `app/api/learning-reports/route.ts`
- **Location**: `GET` and `POST` methods
- **Evidence**: `getLearningReportsByStudent(Number(studentId))` blindly executes based on query parameter.
- **Attack Scenario**: Any authenticated user can read or write learning reports for any student ID.
- **Impact**: Unauthorized access to academic records and potential data contamination.
- **Recommended Fix**: Verify teacher-student relationship before allowing writes; verify parent-student relationship before allowing reads.
- **Acceptance Criteria**: Report operations fail for unlinked/unassigned students.

**ID**: AUTH-LEAK-001
- **Severity**: High
- **File**: `app/api/students/route.ts` & `app/api/classes/route.ts`
- **Location**: `GET` methods (fallback logic)
- **Evidence**:
  ```typescript
  if (session.role === 'guru') { return getStudentsByTeacher() }
  // Fallback for non-guru (intended for admin, but allows parent)
  return searchStudents()
  ```
- **Attack Scenario**: A parent calls `GET /api/students`. Since they are not a guru, the code defaults to the admin path and returns all students.
- **Impact**: Full institution roster exposure to parents.
- **Recommended Fix**: Add explicit `if (session.role === 'admin')` checks and reject parents from these list endpoints, or return only their linked children.
- **Acceptance Criteria**: Parents receive 403 on global listing endpoints.

## 5. Proposed Centralized Authorization API

To resolve these systemic issues without repeating complex database queries in every route, we propose introducing a centralized authorization module (e.g., `lib/auth/rbac.ts`).

```typescript
import { SessionPayload } from '@/lib/auth/session'

// 1. Core Authentication & Vertical Role Checks
export async function requireAuth(): Promise<SessionPayload>
export async function requireRole(allowedRoles: ('guru' | 'orang_tua' | 'admin')[]): Promise<SessionPayload>

// 2. Horizontal Resource Checks (Ownership / Access)
// Verifies if parent is linked to student, or if teacher teaches the student's class, or if admin.
export async function requireStudentAccess(studentId: number): Promise<SessionPayload>

// Verifies if teacher is assigned to the class, or if admin.
export async function requireTeacherAccess(classId: number): Promise<SessionPayload>

// Verifies if the report belongs to a student accessible to the caller.
export async function requireReportAccess(reportId: number): Promise<SessionPayload>
```

**Implementation Note:** *Do not implement this proposal yet until approved by the PM/Architect.*
