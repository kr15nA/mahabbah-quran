# AUDIT: SYSTEM-FOUNDATION-001

## METRICS
- **BRANCH**: feature/system-foundation-001
- **COMMIT**: (Pending final push)
- **TYPECHECK**: PASS
- **BUILD**: PASS
- **DB MIGRATION**: PASS
- **DB TEST**: PASS (Verified programmatically via `test-academic-years.ts`)
- **SECURITY**: PASS (Admin-only enforcing isolated boundaries)
- **RESPONSIVE CODE**: PASS (Tailwind standard utility configuration)
- **VISUAL QA**: PENDING (Needs manual browser review)
- **REGRESSION**: PASS (No modifications to existing academic logic)
- **STATUS**: PASS WITH MINOR ISSUES (Awaiting visual QA)

## DESIGN & IMPLEMENTATION NOTES

### Why the Table is Needed
Prior to this task, the database operated without temporal boundaries (students and classes existed perpetually without a structured "period" anchor). A normalized `academic_years` table provides the structural foundation required for future teacher assignment and enrollment mapping, tracking "who is in what class *this year*".

### Schema Design
```typescript
academicYears (
  id, name, startDate, endDate, isActive, createdAt, updatedAt
)
```
The table uses `is_active` as a boolean flag.

### Active-Year Rule & Overlap Rule
- **Rule**: There can be at most **one** active academic year.
- **Enforcement**:
  - *Database Level*: A partial unique index (`idx_active_academic_year`) ensures `is_active = true` can only exist once across all rows.
  - *Application Level*: The `activateAcademicYear(id)` function performs a sequential swap (first updating all to `false`, then the target to `true`) due to Drizzle Neon-HTTP limitations with transactions. The sequential swap works efficiently and respects the DB constraint.
- Overlapping periods are not natively prevented at the DB level, but client-side validations block dates where `startDate >= endDate`.

### Migration Strategy
Migration was executed using `drizzle-kit generate` and `drizzle-kit push`. The migration successfully added the table and index. No pre-existing table was dropped, and count/integrity for `students` and `classes` remains unchanged.

### Historical-Data Handling
Per architectural guidelines, `academic_year_id` was **not** appended to existing tables (`attendance`, `learning_reports`, `hafalan_records`). Existing data continues to map its temporal context purely by its intrinsic timestamps, ensuring zero regression for older records.

### Future Relationships
- `Academic Year` → `Enrollment` → `Class Membership`
- `Academic Year` → `Teacher Assignment`
These relations will be handled in subsequent Foundation/Enrollment tasks.

### Known Limitations
- The Drizzle `@neondatabase/serverless` driver using HTTP lacks full distributed transaction support. Activation relies on sequential updates coupled with the partial unique index guard.
