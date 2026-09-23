# RECURRING BILLING PHASE C - ADMIN UI MINI AUDIT & UX ARCHITECTURE LOCK

## Baseline
- **Branch**: `audit/recurring-billing-phase-c`
- **Baseline SHA**: `786992f3ece0c860570bb476db1aa76cdb2945b6`

## Route Architecture
- **Recommended Route**: `/admin/keuangan/tagihan/berulang`
- **Justification**: Existing tagihan route acts as a list view for individual invoices (`[id]` and `page.tsx`). Adding the complex recurring generator engine behind a query parameter `?tab=berulang` on the existing invoice list would create a dashboard maze and bloat the component. A dedicated route isolates the context safely.

## Navigation Placement
- **Location**: As a distinct primary action (button "Buat Massal/Berulang") located on the `/admin/keuangan/tagihan` page header, leading to the dedicated route. Alternatively, an explicit tab/link within the `KeuanganLayout` top navigation bar if visibility is paramount.
- **Recommended Label**: **Tagihan Berulang** (Avoids implying Cron/automation which belongs to Phase D).

## Page Information Architecture
- **Structure**: A single main page at `/admin/keuangan/tagihan/berulang` utilizing a horizontal tabbed layout (consistent with `/admin/keuangan/beasiswa` pattern) for different subsections:
  1. Konfigurasi (Config)
  2. Kewajiban Tagihan (Assignments)
  3. Simulasi & Generate (Dry Run & Execution)
  4. Riwayat Proses (Run History)
- **Detail Route**: `/admin/keuangan/tagihan/berulang/runs/[id]` for detailed run results.

## Recurring Config UX
- **Admin Editable Fields**: `isActive`, `dueDayOfMonth`.
- **Read-Only Context**: `feeType.name`, `billingFrequency`, `defaultAmount`.
- **Rules**: Only `MONTHLY` fee types can be configured. No amount editor exists at the recurring config level (amount is derived from fee type). The UI must explain validation errors without client-side overrides.

## Assignment Management UX
- **Columns**: Santri (Student), Tahun Ajaran (Academic Year), Jenis Tagihan (Fee Type), Mulai (Start Period), Selesai (End Period), Status, Dibuat, Aksi.
- **Actions**:
  - `Create`
  - `Void` (No physical delete).
- **Edit Pattern**: No direct edit for historical ranges. V1 requires Voiding the old assignment and creating a replacement to ensure auditability.

## Bulk Assignment UX
- **Filters**: Unit, Program, Kelas, Status Santri (Only used as selection helpers, NOT recurring eligibility sources).
- **Preview Output**: Shows selected students, existing active assignments (to prevent overlaps), valid new assignments.
- **Save Action**: Creates explicit rows in `finance_student_fee_assignments`. Does NOT silently ignore overlap conflicts; users must resolve them first.

## Dry Run UX
- **Inputs**: Academic Year, Fee Type, Period (YYYY-MM).
- **API**: Calls Phase B `dryRunRecurringBilling()` directly. No client-side recalculation.
- **Summary Cards**: Eligible, Akan Dibuat (Will Generate), Sudah Ada (Existing Invoice), Tidak Valid (Invalid).
- **Detail Table**: Santri, Assignment, Status, Alasan, Invoice Terkait.
- **Statuses**: `WILL_GENERATE`, `SKIPPED_EXISTING`, `INVALID`.
- **Constraint**: Must remain explicitly read-only.

## Preview Invalidation
- **UX Lock**: A dry-run result is intrinsically bound to the selector tuple (`academicYearId`, `feeTypeId`, `period`).
- **Rule**: If ANY selector changes, the previous preview is invalidated immediately. The "Generate" button becomes disabled until a new dry-run API call succeeds. Stale preview generation is strictly forbidden.

## Generate Confirmation
- **Modal Content**: Displays Academic Year, Fee Type, Period YYYY-MM, Total Will Generate, Total Existing/Skipped, Gross Amount per Santri, Due Date.
- **Constraints**: No client-provided amount overrides. No client-provided due date. User confirmation triggers the server-side Phase B service which revalidates the entire tuple.

## Run Processing UX
- **Chunk Default**: 50.
- **Flow**: Generate → Prepare/Run first chunk → Return status and counts.
- **Continuation**: If status is `PENDING`, UI displays a "Lanjutkan Proses" (Continue Processing) button.
- **Rule**: No uncontrolled client-side while-loops. No hammering the backend. Automation is strictly deferred to Phase D.

## Result Summary
- **Badges**:
  - `PENDING`: Menunggu
  - `RUNNING`: Diproses
  - `COMPLETED`: Selesai
  - `COMPLETED_WITH_ERRORS`: Selesai dengan Kendala
  - `FAILED`: Gagal
- **Counts**: Eligible, Dibuat (Generated), Dilewati (Skipped), Gagal (Failed).

## Run History
- **Columns**: Periode, Jenis Tagihan, Tahun Ajaran, Status, Eligible, Dibuat, Dilewati, Gagal, Dijalankan Oleh, Selesai Pada, Aksi.
- **Actions**:
  - `PENDING`: Start / Detail
  - `RUNNING`: Continue / Detail
  - `COMPLETED`: Detail / Jalankan Ulang (Run Again - explicitly states it will discover newly eligible assignments).
  - `COMPLETED_WITH_ERRORS`: Coba Lagi (Retry) / Detail
  - `FAILED`: Coba Lagi (Retry) / Detail

## Run Detail
- **Table**: Santri, Assignment, Invoice, Status, Error, Terakhir Diperbarui.
- **Invoice Link**: Clickable link to invoice detail if generated or skipped_existing.
- **Statuses**:
  - `PENDING`: Menunggu
  - `GENERATED`: Dibuat
  - `SKIPPED_EXISTING`: Sudah Ada
  - `FAILED`: Gagal

## Error Presentation
- **Rule**: No raw SQL errors exposed.
- **Mapping**:
  - `INVALID_RECURRING_CONFIG` → Konfigurasi tagihan berulang belum valid.
  - `INVALID_FEE_AMOUNT` → Nominal jenis tagihan belum valid.
  - `ASSIGNMENT_NOT_ELIGIBLE` → Assignment tidak berlaku untuk periode ini.
  - `STUDENT_NOT_FOUND` → Data santri tidak ditemukan.
  - `INVOICE_CREATE_FAILED` → Tagihan gagal dibuat.
  - `UNKNOWN_ERROR` → Terjadi kendala saat memproses tagihan.

## Permissions (RBAC)
- **Existing Config**: `finance.billing.view` and `finance.billing.manage` are already seeded in `scripts/bootstrap-finance-permissions.ts`.
- **View Permission (`finance.billing.view`)**: View config, view assignments, view run history, view run detail.
- **Manage Permission (`finance.billing.manage`)**: Update config, create/void assignment, bulk assignment, dry run, generate, continue, retry/rerun.

## API / Server Action Contract
- **Pattern**: Next.js 14 Server Actions (`'use server'`) via `app/admin/keuangan/tagihan/berulang/actions.ts` (following the `beasiswa` pattern).
- **Validation**: Zod schema parsing.
- **Auth**: `await requirePermission(...)` inside every action.
- **Note**: No amount/dueDate client authority.

## Pagination
- **Pattern**: Server-side pagination via Next.js `searchParams` (`?page=1`). 
- **Required for**: Assignments, Billing Run History, Run Items.
- **Default Limit**: 20 items per page (consistent with `beasiswa`).

## Loading / Empty / Error States
- **Loading**: Skeletons or spinners standard to the app.
- **Empty States**:
  - No config: "Belum ada konfigurasi tagihan berulang."
  - No assignments: "Belum ada santri yang memiliki kewajiban tagihan ini."
  - No runs: "Belum ada proses generate tagihan."

## Responsive Design
- Mobile, tablet, and desktop compatible.
- Data tables will utilize horizontal scrolling `overflow-x-auto` wrapped in Cards, or collapse into stacked layouts on mobile where applicable.

## Audit Logging
- **Service**: Existing `lib/db/queries/audit-logs.ts` and `audit.ts`.
- **Events**: Config changed, Assignment created, Assignment voided, Run generation/retry started.
- **Avoid**: Emitting `INVOICE_CREATED` within the generator UI because `createInvoiceDraft` already handles it.

## UI Test / UAT Matrix
1. Recurring page loads correctly.
2. View-only permission can view all tabs.
3. View-only cannot modify configs or assignments.
4. Manage permission can configure and assign.
5. Inactive config properly blocks dry-run and generation.
6. Valid config successfully enables dry-run.
7. Selector change explicitly invalidates the current preview.
8. Dry-run summary counts are perfectly accurate.
9. Existing manual invoice correctly appears as skipped.
10. Generate confirmation modal displays the correct totals.
11. Generate action strictly creates DRAFT invoices.
12. Generated amount is 100% server-controlled (via fee type default).
13. Chunk processing UX is visible and clear.
14. COMPLETED status displayed correctly.
15. COMPLETED_WITH_ERRORS status displayed correctly.
16. Retry action recovers failed items.
17. Run Again action successfully discovers new assignments.
18. Single assignment create works.
19. Overlap assignment is strictly rejected by the server.
20. Void assignment works.
21. Bulk assignment works and handles overlaps safely.
22. Already assigned student is handled safely in bulk UI.
23. Run history pagination functions correctly.
24. Run item pagination functions correctly.
25. Invoice links lead to the correct invoice detail view.
26. Safe Indonesian error messages are shown for business failures.
27. Mobile layout is fully usable.
28. Production hard safety maintained (mutations strictly isolated).

## Phase C Non-Goals
- Cron jobs
- Scheduled billing
- `billingDay` automation
- Automatic generation on page load
- Automatic invoice issue (`ISSUED` status)
- Payment gateway integrations (QRIS, VA)
- Notifications
- Late fee & proration
- Bank reconciliation & period closing

## Schema / Migration Required
- **Schema change**: NO
- **Migration required**: NO

## Blockers
- **Blockers**: NONE. Phase C UI/UX Architecture Lock is READY for implementation.

## Implementation Candidate (Phase C)
- **Status**: IMPLEMENTATION CANDIDATE
- **PHASE_C_RUNTIME_CANDIDATE_SHA**: `028285e`
- **PHASE_C_FEATURE_HEAD_SHA**: `6473566`
- **Preview URL**: `https://mahabbah-quran-otmg77nfc-krisnarefac-9550.vercel.app`
- **Preview SHA**: `6473566`
- **Preview READY**: YES
- **Permission UAT**: PASS
- **Config UAT**: PASS
- **Single Assignment UAT**: PASS
- **Bulk UAT**: PASS
- **Dry-Run UAT**: PASS
- **Preview Invalidation UAT**: PASS
- **Generate UAT**: PASS
- **Chunk UAT**: PASS
- **History/Detail UAT**: PASS
- **Responsive UAT**: PASS
- **Safe-Error UAT**: PASS
- **Fixture Cleanup**: PASS
- **Production Mutation**: NO
