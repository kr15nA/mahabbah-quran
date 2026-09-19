# TASMI-MODULE-001 — Tasmi Per Surat & Tasmi Sekali Duduk

## Domain Definition
Tasmi represents a formal recitation session/assessment. It is distinct from daily Hafalan/setoran. 
A Tasmi session can be evaluated based on two modes: `SURAH` or `JUZ_RANGE`.

## SURAH Semantics
- Mode: `SURAH`
- Meaning: V1 strictly implies a full Surah recitation (e.g. Al-Mulk full). No `ayah_start` or `ayah_end` fields are needed for V1 since partial tasmi can be evaluated as a future extension if required. 
- Constraint: Must reference the canonical `surahs` table (`surah_id` IS NOT NULL) and Juz range fields must be NULL.

## JUZ_RANGE Semantics
- Mode: `JUZ_RANGE`
- Meaning: Represents a contiguous sequence of Juz (e.g., Juz 1-5, Juz 29-30).
- Juz count is dynamically derived: `end_juz - start_juz + 1`.
- Constraint: `start_juz` and `end_juz` must be NOT NULL, between 1 and 30, with `start_juz <= end_juz`. `surah_id` must be NULL.

## Status Model
- `status`: Machine values `PASSED` | `NEEDS_REVIEW`
- UI mapping: "Lulus" / "Belum Lulus".

## Score Model
- `score`: `smallint`, nullable, scale 0-100.
- Consistent with existing Hafalan scores. Single overall score is sufficient for V1.

## Examiner Model
- `examiner_id`: References `users.id` (single examiner for V1). Authorization will ensure the user has appropriate permissions.

## Academic Context
- Consistent with existing academic records (`hafalanRecords`, `tahsinRecords`), `class_id` and `academic_year_id` are not stored directly on the session record to prevent redundancy; they are derived at query time from active enrollments based on `session_date`.

## Lifecycle and Audit
- Soft Delete: `NO`. Academic records in this project (like Hafalan and Tahsin) do not currently implement `deletedAt`. We will maintain consistent lifecycle semantics.
- `createdAt` and `updatedAt` timestamps will be present.
- Audit Log events: `TASMI_CREATE`, `TASMI_UPDATE`, `TASMI_DELETE`.

## Achievement Semantics
- Tasmi achievements are derived dynamically at the query layer.
- Only sessions with `PASSED` status count towards achievements.
- Highest PASSED single-sitting Juz range is calculated dynamically. 
- Multiple attempts for the same target are allowed.

## Authorization & RBAC
- Base permissions follow naming conventions (e.g. `academic.tasmi.read`, `academic.tasmi.manage` - if applicable). 
- Guru/Admin roles authorized via standard assignments.
- Parents have read-only access subject to active `studentParents` link (`canViewAcademic = true`).

## Database Schema Proposal

```typescript
export const tasmiSessions = pgTable('tasmi_sessions', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  studentId: bigint('student_id', { mode: 'number' }).notNull().references(() => students.id),
  examinerId: bigint('examiner_id', { mode: 'number' }).notNull().references(() => users.id),
  mode: varchar('mode', { length: 20 }).notNull(), // 'SURAH' | 'JUZ_RANGE'
  surahId: bigint('surah_id', { mode: 'number' }).references(() => surahs.id),
  startJuz: smallint('start_juz'),
  endJuz: smallint('end_juz'),
  sessionDate: date('session_date').notNull(),
  score: smallint('score'),
  status: varchar('status', { length: 20 }).notNull(), // 'PASSED' | 'NEEDS_REVIEW'
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  modeSurahCheck: check('tasmi_sessions_mode_surah_chk', sql`(${table.mode} = 'SURAH' AND ${table.surahId} IS NOT NULL AND ${table.startJuz} IS NULL AND ${table.endJuz} IS NULL) OR ${table.mode} != 'SURAH'`),
  modeJuzCheck: check('tasmi_sessions_mode_juz_chk', sql`(${table.mode} = 'JUZ_RANGE' AND ${table.surahId} IS NULL AND ${table.startJuz} IS NOT NULL AND ${table.endJuz} IS NOT NULL) OR ${table.mode} != 'JUZ_RANGE'`),
  juzBoundsCheck: check('tasmi_sessions_juz_bounds_chk', sql`${table.startJuz} >= 1 AND ${table.startJuz} <= 30 AND ${table.endJuz} >= 1 AND ${table.endJuz} <= 30 AND ${table.startJuz} <= ${table.endJuz} OR ${table.mode} != 'JUZ_RANGE'`),
  scoreBoundsCheck: check('tasmi_sessions_score_bounds_chk', sql`${table.score} >= 0 AND ${table.score} <= 100 OR ${table.score} IS NULL`),
  
  // Indexes
  studentDateIdx: index('idx_tasmi_student_date').on(table.studentId, table.sessionDate),
  modeIdx: index('idx_tasmi_mode').on(table.mode),
}))
```

## Future UI / Routing Integration
- **Admin**: `/admin/tasmi`
- **Guru**: `/guru/tasmi`
- **Parent**: Tasmi read-only tab or card in `/orang-tua/beranda` (Selected Child Dashboard C2.1).

## Test Strategy
- Ensure check constraints reject invalid states (e.g. JUZ_RANGE with surah_id).
- Test achievement derivation logic (e.g. failed attempts don't overwrite successful highest range).
- Test deterministic ordering (`session_date DESC, id DESC`).
- Ensure `requireStudentAccess` works securely for creation/reading.
