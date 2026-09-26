# Mahabbah System — Security Baseline

## Core Invariants (Currently Enforced)

- **Server Authorization is Authoritative:** All protected data access and privileged mutations require authoritative server-side authentication/authorization. (Public endpoints such as authentication, reference resources, or secure token-gated share endpoints intentionally bypass this where applicable).
- **Never Trust Client Role:** The role string passed from the client or embedded in query params is universally ignored. Role is extracted exclusively from the validated `httpOnly` JWT session.
- **Never Trust Client actorUserId:** Mutations inherently attribute the action to the decoded `session.userId`. Client payloads attempting to impersonate an `actorUserId` are dropped or explicitly fail validation.
- **Never Trust Client studentId for Self-Scope:** Within the `/santri` and `/orang-tua` namespaces, the `studentId` is resolved safely via `requireSelfStudentProfile(session.userId)` or `getChildrenByParent(session.userId)`. IDOR attempts via URL tampering (`/santri/profil?studentId=123`) are aggressively rejected.
- **Route Namespace Isolation:** Cross-privilege route boundaries are guarded in Middleware acting as an early routing/namespace UX guard. (Server-side authorization provides the authoritative data security boundary). A user logged in as a `guru` attempting to traverse to `/admin` will be blocked.
- **Parent-Child Ownership Checks:** Parent reads/mutations are inherently verified against the `student_parents` mapping table.
- **Teacher Ownership:** Guru actions (e.g. Absensi, Laporan) securely filter execution based on the active `teacher_assignments`. Teachers cannot formally assess students they do not supervise.
- **Safe Audit Actor Attribution:** The audit logger strictly consumes the authenticated `session.userId` when recording `actor_user_id`.
- **Sensitive Audit Redaction:** Hardcoded `stripSensitive` recursion recursively redacts recognized sensitive fields and is regression tested so that `passwordHash` and similar identifiers do not touch the audit ledger in plain text.
- **JWT / Session Rules:** Short-lived tokens. HTTP-only securely transported cookies. Secrets managed natively via Vercel env.
- **Role / Permission Architecture:** Generic baseline roles exist (`guru`, `orang_tua`, `admin`), supplemented by granular array-based permissions to allow extensibility without fracturing the core namespace isolation.

- **Login Rate Limiting:** Enforced via `login_rate_limits` using HMAC-SHA256 identifier hashing. Allows 5 failed attempts per 15-minute fixed window before blocking with a generic 429 response and Retry-After header. Success login resets the counter. No raw PII or IP-trust is involved.
- **Login Credential Enumeration Hardening:** Externally visible credential failures (nonexistent user, wrong password, inactive account) share the exact same generic 401 contract. Bcrypt timing enumeration is mitigated by comparing a dummy hash for nonexistent accounts, though it is not perfectly constant-time due to residual DB-query execution differences.

## Pending Security Work (Not Implemented)
- **Environment Validation:** Strict schema validation (e.g. Zod) enforcing the presence of critical `process.env` secrets at boot time.
- **Centralized Regression Coverage:** A unified, automated security script continuously probing the test endpoints for IDOR and RBAC evasion. (Currently partial, spread across domain unit tests).
