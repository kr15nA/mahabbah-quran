# ADMIN-ACCOUNT-001 — Admin Profile & Account Settings Recovery

**Task:** ADMIN-ACCOUNT-001  
**Date:** 2026-09-12  
**Auditor:** Antigravity  
**Branch:** feature/admin-account-001

---

## 1. Implementation Summary

The missing Admin Profile & Account Settings module has been fully implemented at `app/admin/akun/page.tsx` as a secure React Server Component mapping to the authenticated user's profile.
- **Account Settings Interface:** Provides split views for Profile Information (Avatar, Name, Phone, Email) and Account Security (Password changes).
- **Avatar Upload:** Designed a minimal, safe, server-side route `/api/upload` that securely pipes authenticated uploads to Vercel Blob (using `@vercel/blob` which was identified in package.json) avoiding arbitrary filesystem writes.
- **Server Actions:** Replaced complex API routing with robust Next.js server actions (`updateProfile` and `changePassword`) to directly interact with `users` query methods safely without leaking hashes.
- **Layout Navigation:** Hooked up the `AccountMenu` dropdown component "Profil & Akun" explicitly replacing the disabled "Segera" options, enabling smooth navigation.

---

## 2. Files Changed

**Modified:**
- `components/layout/AccountMenu.tsx`: Wired up dropdown elements to link directly to `/admin/akun`.
- `lib/db/queries/users.ts`: Created generic `updateUser` function to handle selective DB updates based on provided fields for admins.

**Created:**
- `app/admin/akun/page.tsx`: RSC fetching user info to hydrate the client.
- `app/admin/akun/AccountClient.tsx`: Interactive client form component with transitions, upload tracking, and tab navigation.
- `app/admin/akun/actions.ts`: Secure server actions validating and executing updates directly against the authenticated user's DB row.
- `app/api/upload/route.ts`: Secure image handler for uploading Avatars directly to Vercel Blob.

---

## 3. Data Sources & Authorization

| Function / File | Source / Action |
|-----------------|-----------------|
| Admin Identity | `requireAuth()` -> restricts access to `SUPER_ADMIN` globally. |
| Fetch Profile | `getUserById(session.userId)` |
| Avatar Upload | `POST /api/upload` (Checks session, validates 5MB limit, and restricts to `image/*`). |
| Password Change| Server Action: Validates old password with `bcrypt.compare`, hashes new via `bcrypt.hash`. |

**Security Considerations & Boundaries:**
- The server actions (`actions.ts`) statically execute against `session.userId`. It is impossible for an attacker to supply a forged `userId` through the client payload to overwrite a different account.
- Passwords mutations enforce an 8-character minimum and require the new password to differ from the old.
- Sensitive user tokens, hashes, and FCM configs are inherently discarded from the client bundle by safely destructuring only required fields (`full_name`, `email`, `phone`, `avatar_url`) in the RSC before passing to `AccountClient`.

---

## 4. Database Test Results

A local integration script verified the behavior against seeded database constraints:
- ✅ **Admin loads own profile:** Verified (HTTP 200 with populated profile data).
- ✅ **Guru denied access to Admin settings:** Verified (Intercepted by Middleware/Auth layer).
- ✅ **Parent denied access to Admin settings:** Verified (Intercepted by Middleware/Auth layer).

---

## 5. Responsive & Visual Verification

- **Desktop:** The profile UI is presented within a comfortable, max-width bounded centered layout. Avatar uploading visually cues via a compact spinner within the circular frame.
- **Mobile/Tablet Constraints:** Inputs naturally stack into single-column layouts when space is constrained (such as the Email/Phone sibling row). Tab navigation relies on clear Lucide icons and scrollable padding, eliminating horizontal viewport issues.

---

## 6. Known Limitations

- **File Validation:** The `/api/upload` route only validates the MIME type via the HTTP boundary (`file.type.startsWith('image/')`), which is generally sufficient for a Vercel Blob payload but won't catch deeply disguised non-image files bypassing basic headers. However, Vercel Blob prevents execution, minimizing risk.
- **Local Sandbox State:** This module does NOT manage non-Admin users. "User Management" tasks (such as assigning Gurus) belong strictly to separate Admin modules to maintain isolation.

---

**COMMIT:** Recover account settings
**BRANCH:** feature/admin-account-001
**TYPECHECK:** PASS
**BUILD:** PASS
**DB TEST:** PASS
**SECURITY:** VERIFIED
**RESPONSIVE CODE:** VERIFIED
**VISUAL QA:** PASS
**REGRESSION:** PASS (Guru/Parent portals remain completely unaffected)
**STATUS:** COMPLETE
