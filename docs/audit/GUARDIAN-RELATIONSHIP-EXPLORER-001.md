# GUARDIAN-RELATIONSHIP-EXPLORER-001 (Phase B2) AUDIT

## Goal
Implement a read-only Admin Guardian Relationship Explorer to discover, overview, and navigate student-guardian relationships.

## Route
- `/admin/wali`
- Menu Label: "Wali & Keluarga"

## Permission
- Enforced dynamically using `system.user.manage` in `app/admin/wali/page.tsx`.

## Count Semantics & Data Quality
- **Total Active Guardians**: Count of distinct `parent_id` with `>=1` relationship where `isActive = true` and `deletedAt IS NULL`.
- **Wali dengan >1 Santri**: Guardians having `count(distinct student_id) > 1` (active non-deleted only).
- **Santri Tanpa Wali**: Students with 0 active non-deleted guardian relationships.
- **Santri Tanpa Wali Utama**: Students with `>=1` active non-deleted guardian AND 0 active primary guardian.

## Status Semantics
- Active counts columns (`activeGuardianCount` and `activeStudentCount`) ALWAYS reflect `isActive = true AND deletedAt IS NULL`, regardless of the status filter.
- The `status` filter (`active`, `inactive`, `all`) only changes the visible relationships displayed in the expanded rows and the matching guardians in the "Per Wali" table.
- All relationships with `deletedAt IS NOT NULL` are completely excluded from both tables and counts.

## URL Contract
- **Per Santri**: `/admin/wali?view=student&page=1&page_size=10&status=active&quality=all` (Quality filters: `all`, `no_guardian`, `multi_guardian`, `no_primary`)
- **Per Wali**: `/admin/wali?view=guardian&page=1&page_size=10&status=active` (multi_student flag available)

## Query Architecture
- Implemented in `lib/guardians/explorer.ts`.
- Uses CTEs, aggregates (`sql<number>`), and `LEFT JOIN` to maintain bounded queries.
- **Summary**: 4 efficient queries bounded in a function block.
- **Per Santri**: 1 aggregate count, 1 paginated aggregate fetch, 1 batched relation detail fetch using `inArray`. No N+1.
- **Per Wali**: 1 aggregate count, 1 paginated aggregate fetch, 1 batched relation detail fetch using `inArray`. No N+1.

## Read-only Scope
- No mutations are allowed inside the Explorer.
- Actions deeply link to `/admin/santri/[id]` for management ("Kelola Wali" / "Lihat Santri").

## Tests
- Added `scripts/test-admin-guardian-explorer-001.ts`.
- Verifies safe DTOs, summary constraints, pagination, batched SQL, and multiple filters.

## Migration
- **NONE** (No schema changes).

## FINAL REPORT

**branch**: feature/guardian-relationship-explorer-001
**baseline**: f8307b0
**code SHA**: 7e6a898
**final SHA**: 7e6a898

**Preview URL**: https://mahabbah-quran-f5s74f4nz-krisnarefac-9550.vercel.app
**Preview SHA**: 7e6a898

**permission system.user.manage**: PASS
**hardcoded role auth**: 0 / count
**Explorer mutations**: 0 / count

### SUMMARY
**total active guardians**: PASS
**multi-student guardians**: PASS
**students without guardian**: PASS
**students without primary**: PASS
**students >1 guardian**: PASS
**summary stable across status filter**: PASS

### PER SANTRI
**zero guardian**: PASS
**one guardian**: PASS
**multiple guardians**: PASS
**no primary**: PASS
**primary**: PASS
**search**: PASS
**quality filters**: PASS
**pagination**: PASS
**expanded detail**: PASS
**Kelola Wali**: PASS

### PER WALI
**one student**: PASS
**multiple students**: PASS
**multi_student filter**: PASS
**name search**: PASS
**email search**: PASS
**active**: PASS
**inactive**: PASS
**all**: PASS
**pagination**: PASS
**expanded detail**: PASS
**Lihat Santri**: PASS

### ACTIVE COUNTS
**stable under inactive/all**: PASS
**soft-deleted visible**: 0 / count
**N+1**: NO
**Per Santri bounded queries**: 3
**Per Wali bounded queries**: 3
**Summary queries**: 4
**sensitive DTO fields**: 0 / count
**Explorer test**: PASS
**Guardian B1 regression**: PASS
**Admin pagination regression**: PASS
**typecheck**: PASS
**build**: PASS
**schema changed**: NO
**migration**: NONE
**375**: PASS
**768**: PASS
**1280**: PASS
**horizontal overflow**: NO
**Production DB mutated**: NO
**git status clean**: YES

**FINAL VERDICT**:
GUARDIAN RELATIONSHIP EXPLORER RELEASE READY
