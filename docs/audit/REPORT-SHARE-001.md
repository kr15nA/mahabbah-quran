# Audit: REPORT-SHARE-001

## 1. Objective
Build a secure, read-only share-link mechanism for individual learning reports, enabling authorized Admins and Gurus to share a report with a student's parent, without exposing parent/user metadata, passwords, or internal IDs.

## 2. Implementation Summary
- **Database Schema**: 
  - Added `report_shares` table with `id`, `report_id`, `creator_id`, `token_hash`, `expires_at`, `revoked_at`, and `created_at`.
  - Added an index on `token_hash`.
  - `report_id` cascades on delete to `learning_reports`.
  - Token tokens are hashed using SHA-256 for secure storage.
- **Token Generation**:
  - Raw token generated using cryptographically secure `crypto.randomBytes(32).toString('base64url')`.
  - Tokens expire after 7 days by default.
  - One-active-link rule enforced via a server-side revocation step before generating a new link.
- **Authorization & Endpoints**:
  - Created `POST /api/learning-reports/[id]/share` (Generate and fetch token URL).
  - Created `DELETE /api/learning-reports/[id]/share` (Revoke token).
  - Explicitly blocked Parent role from generating or revoking tokens, returning HTTP 403 (obfuscated as 404 in UI layer).
- **Public Share Route**:
  - Implemented `app/share/laporan/[token]/page.tsx` for read-only visualization of the report without the parent needing to be logged in.
  - Implemented `app/api/share/[token]/pdf/route.ts` to allow PDF downloading directly from the share UI.
  - Allowed `/api/share` in `middleware.ts` to permit unauthenticated access.
- **UI Components**:
  - Implemented `ShareReportModal` which handles displaying the active token, generating a new one, revoking, and sharing directly to WhatsApp.
  - Integrated `ShareReportModal` into `LaporanClient.tsx` (Admin dashboard) and `GuruLaporanClient.tsx` (Guru input report flow).

## 3. Security Considerations
- **No ID Guessing**: Token links are `base64url` 32-byte strings which are practically impossible to guess.
- **Data Isolation**: The share links strictly provide access to a single specific `learning_report` and its associated attendance, hafalan, and tahsin records. It explicitly does not expose sibling, user, or administrative data.
- **Role Scoping**: Only Admins and Gurus associated with the student can generate or revoke share links. Parents can view the links but cannot generate new ones.

## 4. Tests Performed
- **Unit & Integration Security Test**: Implemented `scripts/test-share.ts`.
- Validated that:
  - `[✅]` Parents cannot create share links.
  - `[✅]` Unauthenticated users cannot create share links.
  - `[✅]` Admin can create share links.
  - `[✅]` Regenerating creates a new token and revokes the old token.
  - `[✅]` Revoked tokens are immediately rejected.
  - `[✅]` PDF download works securely via the valid token.
  - `[✅]` Revocation correctly denies further access.

## 5. Result
- Meets all business requirements and architectural constraints specified.
- Re-uses existing DB queries for report details where applicable.
