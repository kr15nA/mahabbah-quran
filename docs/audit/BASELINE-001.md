# BASELINE-001: Inspect & Plan Audit Report
**Date:** 2026-09-12
**Status:** Pre-Implementation Baseline
**Scope:** Architecture, Security, API, UI, DB, and Process Audit

## 1. File & Route Inventory
**App Routes (`app/`)**
- `app/login/page.tsx`
- `app/admin/*` (dashboard, guru, santri, kelas, program, laporan, absensi, hafalan, tahsin, penilaian, analitik, ai, notifikasi, pengaturan)
- `app/guru/*` (dashboard, santri, absensi, hafalan, laporan)
- `app/orang-tua/*` (beranda, absensi, laporan, notifikasi)

**Core Libs (`lib/`)**
- `lib/auth/session.ts` (Session & JWT logic)
- `lib/db/client.ts` (DB connection)
- `lib/db/queries/*` (Database abstractions for attendance, classes, hafalan, learning-reports, notifications, programs, student-parents, students, surahs, tahsin, users)
- `lib/ai/*` (AI logic: institution-analyzer.ts, report-generator.ts)

**UI & Shared Components (`components/`)**
- `components/charts/` (AttendanceBarChart, LearningProgressChart)
- `components/ui/` (ProgressRing)

## 2. API Inventory (`app/api/`)
- `GET/POST /api/ai/analyze`
- `GET/POST /api/attendance`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET/POST /api/classes`
- `POST /api/learning-reports/[id]/ai`
- `GET/POST /api/learning-reports`
- `GET/PATCH /api/notifications`
- `GET/POST /api/programs`
- `GET/PATCH/DELETE /api/students/[id]`
- `GET/POST /api/students`
- `GET /api/surahs`

## 3. Database Table Inventory (`drizzle/schema.ts`)
1. `users` (id, fullName, email, phone, role, isActive, fcmToken, deletedAt, etc.)
2. `programs` (id, name, isActive, etc.)
3. `classes` (id, programId, teacherId, name, etc.)
4. `students` (id, userId, classId, fullName, status, deletedAt, etc.)
5. `student_parents` (id, studentId, parentId, relationship, etc.)
6. `surahs` (id, number, nameArabic, nameLatin, totalAyahs, juzStart, juzEnd)
7. `attendance` (id, studentId, classId, teacherId, attendanceDate, status, notes)
8. `hafalan_records` (id, studentId, teacherId, surahId, sessionDate, ayahStart, ayahEnd, type, score)
9. `tahsin_records` (id, studentId, teacherId, sessionDate, makhrajScore, tajwidScore, kelancaranScore, ghunnahScore)
10. `learning_reports` (id, studentId, teacherId, reportDate, attendanceStatus, hafalanRecordId, tahsinRecordId, aiReportText, aiParentAdvice, status, sentToParentAt)
11. `notifications` (id, userId, title, body, type, isRead)

## 4. Auth Flow
- Login is handled by `/api/auth/login` setting an `httpOnly` cookie (`mq_session`) with a JWT signed by `jose`.
- `lib/auth/session.ts` constructs and manages the token payload.
- No evidence of `localStorage` being used for JWT storage.

## 5. Authorization Flow
- `middleware.ts` guards paths matching `/guru`, `/orang-tua`, `/admin`, checking the `mq_session` cookie.
- It parses the JWT payload to extract `role`.
- Root path `/` redirects to the correct dashboard based on `role`.
- Headers `x-user-id` and `x-user-role` are injected into `NextRequest`.

## 6. All Role Checks
- Middleware verifies prefix against role `ROLE_PREFIXES` array.
- Missing role validation within the API Routes themselves remains to be verified (pending detailed code review of route files), but the middleware covers prefix-based routing.

## 7. CRUD Completeness by Module
**Missing APIs**:
- `users`: No `/api/users` routes exist for managing teachers/admins.
- `hafalan`: No `/api/hafalan` routes exist for creating/viewing hafalan records.
- `tahsin`: No `/api/tahsin` routes exist for tahsin records.
- Note: DB Queries exist in `lib/db/queries/` for these, but they are not exposed via API routes.

## 8. Hardcoded Fallbacks & Unhandled Actions
**ID**: UI-FALLBACK-001
- **Severity**: Medium
- **Priority**: High
- **File**: `app/admin/santri/page.tsx`
- **Location**: Line 206-214
- **Evidence**: `s.program_name || 'Tahfizh Juz 30'`, `s.last_score || 75`, `s.attendance_pct || 90`
- **Impact**: UI displays fake data if API responses omit these joined fields.
- **Recommendation**: Remove hardcoded fallbacks and ensure API returns necessary joined aggregations.
- **Acceptance Criteria**: Data accurately reflects API response payload, or shows proper empty states (e.g., `-` or `0`).

**ID**: UI-ACTION-001
- **Severity**: Low
- **Priority**: Medium
- **File**: `app/admin/santri/page.tsx`
- **Location**: Line 226-234
- **Evidence**: `<button>` elements for View (Eye), Edit, and Delete (Trash2) have no `onClick` handlers.
- **Impact**: Features appear available but do nothing when clicked.
- **Recommendation**: Implement corresponding modals or routing actions.
- **Acceptance Criteria**: Buttons trigger appropriate handlers to edit/delete/view the student.

## 9. Environment Variables and Config
- Dependencies: `NEXT_PUBLIC_APP_URL`, Database string (neon serverless), `JWT_SECRET`.
- Config Files: `next.config.ts`, `middleware.ts`, `drizzle.config.ts`.
- `.env.local` exists (contents secured).

## 10. Database Migration Status
**ID**: DB-MIGRATE-001
- **Severity**: High
- **Priority**: Critical
- **Evidence**: `drizzle/migrations/` directory does not exist.
- **Impact**: Database changes cannot be deployed or tracked sequentially.
- **Recommendation**: Run `drizzle-kit generate` to create initial migration files.
- **Acceptance Criteria**: Migrations folder is generated and committed.

## 11. Build/Typecheck/Lint Status
- **Status**: Failing (`exit code 1`)
- **Errors**: 25 errors primarily from unescaped quotes (e.g., `react/no-unescaped-entities` in `app/orang-tua/beranda/page.tsx`, `app/login/page.tsx`).
- **Warnings**: 50 warnings related to unused variables (`@typescript-eslint/no-unused-vars`) and unoptimized images (`@next/next/no-img-element`).

## 12. Security Findings
**ID**: SEC-JWT-001
- **Classification**: CONFIRMED
- **Severity**: Critical
- **Priority**: High
- **File**: `middleware.ts` & `lib/auth/session.ts`
- **Location**: Line 4
- **Evidence**: `const SECRET_KEY = process.env.JWT_SECRET || 'mahabbah-quran-default-jwt-secret-key-2026'`
- **Impact**: If `JWT_SECRET` is not set in production, attackers can forge valid JWTs and gain unauthorized access to any role.
- **Recommendation**: Remove the fallback secret or strictly throw an error if `JWT_SECRET` is missing.
- **Acceptance Criteria**: Code throws `Error('JWT_SECRET is missing')` if env variable is undefined.

## 13. Confirmed Findings from Request
1. **Hardcoded JWT fallback secret**: CONFIRMED (in `middleware.ts`, `lib/auth/session.ts`).
2. **JWT stored via httpOnly cookie**: CONFIRMED (no localStorage found).
3. **students contains classId**: CONFIRMED (`drizzle/schema.ts:54`).
4. **student_parents exists**: CONFIRMED (`drizzle/schema.ts:67`).
5. **deletedAt fields exist**: CONFIRMED (`users` and `students` in `schema.ts`).
6. **Admin student page contains unhandled buttons**: CONFIRMED (`app/admin/santri/page.tsx`).
7. **Admin student page contains fallbacks**: CONFIRMED (`app/admin/santri/page.tsx`).
8. **Tahfidz schema (surahId, ayahStart/End)**: CONFIRMED (`hafalan_records` in `schema.ts`).

## 14. Recommended Implementation Sequence
1. **Phase 0 DB Fixes**: Run `drizzle-kit generate` to establish `drizzle/migrations/`.
2. **Security Patches**: Remove JWT fallback secrets from `middleware.ts` and `session.ts`. Fix lint errors to ensure clean build.
3. **Phase 3 Completion**: Implement missing API routes (`/api/users`, `/api/hafalan`, `/api/tahsin`).
4. **Phase 5 Data Integration**: Remove fake fallbacks in UI pages (`santri`, `dashboard`) and connect real API data. Wire up empty action buttons.
