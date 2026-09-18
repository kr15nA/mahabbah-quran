# FAMILY-GUARDIAN-MODEL-001

## 1. Description
Implementation of the canonical Guardian relationship model (Phase A), moving from legacy role-based parent checks (`role === 'ORANG_TUA'`) to formal capability-based guardian relationships in the `student_parents` table.

## 2. Legacy Data Normalization
Total rows audited: 29
- 3 `ayah` mapped to `FATHER`
- 3 `bunda` mapped to `MOTHER`
- 23 `wali` mapped to `GUARDIAN`
- 0 unmapped legacy values found.

All 29 rows backfilled with:
- `can_view_academic`: `true`
- `can_view_finance`: `true`
- `can_receive_notification`: `false`
- `can_manage_learning`: `false`
- `is_active`: `true`

## 3. Schema Changes
Added to `student_parents`:
- `can_view_academic` (boolean, default false)
- `can_view_finance` (boolean, default false)
- `can_receive_notification` (boolean, default false)
- `can_manage_learning` (boolean, default false)
- `is_active` (boolean, default true)
- `deleted_at` (timestamp, nullable)
- `updated_at` (timestamp, default now())

Constraints Added:
- `student_parents_active_pair_unq`: `UNIQUE(student_id, parent_id) WHERE is_active = TRUE AND deleted_at IS NULL`
- `student_parents_active_primary_unq`: `UNIQUE(student_id) WHERE is_primary = TRUE AND is_active = TRUE AND deleted_at IS NULL` (guarantees at most one active primary guardian per student; zero primary guardians is also valid)

## 4. Test Verification Summary
- **Total relationships:** 29 (Expected 29)
- **Active:** 29
- **canViewAcademic:** 29
- **canViewFinance:** 29
- **Existing relationship academic access:** PASS
- **Existing relationship finance access:** PASS
- **Notification access (expected false):** PASS
- **Learning access (expected false):** PASS
- **IDOR Academic denied:** PASS
- **IDOR Finance denied:** PASS
- **Inactive relationship denied:** PASS
- **Soft-deleted relationship denied:** PASS

## 5. Production Release (Phase A)
- **Phase A Status:** RELEASED
- **Release Date:** 2026-09-18
- **Tag:** `family-guardian-model-v1.0.0`
- **Main Release SHA:** `67fe711`
- **Production Deployed SHA:** `67fe711`

### Preflight Results (Before Migration)
- **Relationship rows:** 29
- **Distribution:** GUARDIAN (23), MOTHER (3), FATHER (3)
- **Duplicates:** 0
- **Orphans:** 0
- **Primary conflicts:** 0
- **Backup readiness:** READY (Neon PITR)

### Migration Results
- **Migration 0015 applied:** YES (via `npm run db:migrate`)
- **Production DB mutation:** Migration only. No business data deleted.

### Post-Migration Validation
- **Relationship rows:** 29
- **Distribution:** GUARDIAN (23), MOTHER (3), FATHER (3)
- **Active:** 29
- **canViewAcademic:** 29
- **canViewFinance:** 29
- **canReceiveNotification:** 0
- **canManageLearning:** 0
- **Active pair duplicates:** 0
- **Active primary conflicts:** 0
- **Orphans:** 0

### Runtime Smoke & Authorization
- **Parent beranda:** PASS
- **Parent absensi:** PASS
- **Parent laporan:** PASS
- **Parent Finance backend authorization:** PASS
- **Admin dashboard:** PASS
- **Finance dashboard:** PASS
- **HTTP 500 errors:** NONE
- **Family guardian regression suite:** PASS
- **Typecheck & Build:** PASS

**Note:** Parent Finance UI redesign (including the Tagihan UI updates) is OUT OF SCOPE for Phase A and remains in the future `PARENT-FINANCE-001` epic.
