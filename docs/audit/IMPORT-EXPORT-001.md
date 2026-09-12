# IMPORT-EXPORT-001 — Secure Import/Export System

**Task:** IMPORT-EXPORT-001  
**Date:** 2026-09-12  
**Auditor:** Antigravity  
**Branch:** feature/import-export-001

---

## 1. Implementation Summary

A secure, reusable import/export architecture was built using `xlsx` to manage operational master data for Santri, Guru, Orang Tua, and Parent-Santri relations.
- **Preview-First Workflow:** Files are validated line-by-line in memory. Users are presented with a detailed error log (indicating row, column, and issue) and must confirm execution. Malformed or invalid data blocks execution until corrected.
- **Server Actions & APIs:** Exports and Template downloads are handled via standard Next.js route handlers streaming `xlsx` Buffers. Upload parsing and database transactions utilize Server Actions.
- **No Schema Changes:** The system reads existing `students`, `users`, and `student_parents` structures exclusively.

---

## 2. Supported Datasets & Columns

- **Santri:** `full_name`, `nickname`, `gender`, `date_of_birth`, `enrollment_date`, `class_id`
- **Guru:** `full_name`, `email`, `phone` (forces `role = guru`)
- **Orang Tua:** `full_name`, `email`, `phone` (forces `role = orang_tua`)
- **Parent ↔ Santri:** `parent_email`, `student_id`, `relationship`, `is_primary` (Uses existing matching against `users.email` and `students.id`)

---

## 3. Data Integrity & Validation Rules

- **Limits:** Max 5,000 rows and 10MB per upload limit is enforced to prevent runaway memory usage during parsing.
- **Duplicates:** Duplicates inside the DB are explicitly rejected (e.g. duplicate email/phone rows fail validation instantly). Import is strictly an INSERT operation; no silent updates or mass overwrites are permitted.
- **Transactions:** The execution is wrapped in a single Drizzle database transaction. A failure in one row rolls back the entire batch, adhering to the "All or Nothing" paradigm.
- **Passwords:** Imported accounts are generated with a temporary bcrypt-hashed password on the server. At no point are passwords ever exported or placed in plaintext.

---

## 4. Security & Export Behavior

- **Strict RBAC:** Both the `actions.ts` and `api/*/route.ts` handlers require `SUPER_ADMIN` execution bounds.
- **Forbidden Exports:** Fields like `password_hash`, `fcm_token`, or any JWT identifiers are explicitly omitted from the SQL select statements backing the exports. Only safe business properties are included in the `.xlsx` payload.

---

**COMMIT:** feat(admin): add import export system
**BRANCH:** feature/import-export-001
**TYPECHECK:** PASS
**BUILD:** PASS
**DB TEST:** PASS
**SECURITY:** VERIFIED
**RESPONSIVE CODE:** VERIFIED (The table uses horizontal scrolling inside a constrained layout to prevent layout blow-outs on mobile).
**VISUAL QA:** PASS 
**REGRESSION:** PASS (Existing admin workflows remain unaffected).
**STATUS:** COMPLETE
