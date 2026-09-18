# PARENT FAMILY DASHBOARD C2 — AUDIT LOG

## 1. Scope & Baseline
- **Branch:** `feature/parent-family-dashboard-c2`
- **Baseline SHA:** `954ab30`
- **Target Feature:** Parent Beranda Family Dashboard — Real Data Summary & Performance

## 2. Architecture & Data Definitions
- **Query Architecture:** N+1 queries were completely removed from the Parent Dashboard. The target populated dashboard query count is exactly 5 queries (1 Authorized Children query + 4 batched metric queries).
- **Authorized Children (Context):** Returns explicitly active relationship (`isActive=true`, `deletedAt IS NULL`, `canViewAcademic=true`).
- **Academic Context:** Context fields (`class_name`, `program_name`, `teacher_name`) are drawn natively from the `academic_years` (filtered by `is_active=TRUE`) via enrollments and teacher assignments. No fallback guessing was used.
- **Attendance Aggregation:** Extracted raw counts (Hadir, Izin, Sakit, Alfa) using `attendance_date` filtered for the current calendar month according to `Asia/Jakarta`.
- **Hafalan Aggregation:** Shows the latest deterministic setoran based on `session_date DESC, id DESC`. Resolves canonical `surah_name`.
- **Tahsin Aggregation:** Shows the latest deterministic Tahsin record based on `session_date DESC, id DESC`.
- **Report Aggregation:** Shows the latest deterministic Parent-visible report (`status = 'sent'`).
- **Empty vs Query-Failure States:** Query failures (e.g., Neon DB timeouts) are handled via `Promise.allSettled`. Failed queries yield `available: false` (rendering "Data X sementara tidak tersedia"), distinguishing from legitimate `available: true` but `hasData: false` ("Belum ada data...").

## 3. UI Component (FamilyChildCard)
- **Structure:** Encapsulated mobile-first presentation inside `components/orang-tua/FamilyChildCard.tsx`.
- **Responsive Handling:** Layout avoids horizontal overflow, stacking columns cleanly (375px: 1 col, 768px: 2 cols, 1280px: 3 cols).
- **CTA:** Contains a "Lihat Absensi" (canonical URL) and a conditional "Lihat Laporan" CTA (only rendered if a final report was resolved).

## 4. Tests and Regression
- **C2 Unit Test:** Created `scripts/test-family-dashboard-c2.ts` to validate batched DB helper logic.
- **C1 & History Regressions:** Verified parent context (`test-parent-context.ts`) and attendance (`test-parent-attendance-month-nav.ts`) still behave as intended.
- **Guardian Regressions:** Evaluated Guardian Model (`test-family-guardian-model-001.ts`).
- **No Migrations:** Code changes adhered strictly to existing database schema constraints.
- **No Finance/C3:** Isolated purely to academic Phase C2 requirements.

## 5. Deployment
- Passed full `npx tsc --noEmit` check.
- Passed full Next.js `npm run build` static analysis.
- Deployed successfully via Vercel Preview (no Production mutation).
