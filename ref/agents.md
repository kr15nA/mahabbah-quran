# AGENTS.md
## Mahabbah Qur'an — Multi-Agent Build Playbook

This document defines the agent roles, their boundaries, handoff protocol, and the build order for the Mahabbah Qur'an platform. Every agent must read `claude.md` first. This file tells each agent **what** to build and **in what order**.

---

## 0. Agent Principles

1. **One agent, one layer.** An agent does not cross its defined boundary. The DB Agent does not write components. The UI Agent does not write SQL.
2. **Handoff is a written artifact.** An agent's output is a file (`.ts`, `.tsx`, `.md`). The next agent reads that file, not the conversation.
3. **Sequential, not parallel (within a layer).** Within each layer, tasks are sequential in the order listed. Across layers, DB → API → UI.
4. **Every agent reads `claude.md` before starting.**
5. **No agent improvises the schema.** The schema is fixed in `erd.md`. Any proposed change must go back to the PM agent for review before touching the DB.

---

## Agent Roster

| Agent ID | Name | Responsibility | Primary Files |
|----------|------|---------------|---------------|
| `AGENT-DB` | Database Agent | Schema, migrations, seed | `drizzle/`, `lib/db/` |
| `AGENT-AUTH` | Auth Agent | JWT, middleware, session | `lib/auth/`, `middleware.ts`, `app/api/auth/` |
| `AGENT-API` | API Agent | All API route handlers | `app/api/**/*.ts` (routes only, not queries) |
| `AGENT-QUERY` | Query Agent | All raw SQL query functions | `lib/db/queries/*.ts` |
| `AGENT-UI-GURU` | UI Agent — Guru | Guru-facing pages and components | `app/(guru)/`, `components/guru/` |
| `AGENT-UI-PARENT` | UI Agent — Parent | Parent-facing pages and components | `app/(orang-tua)/`, `components/orang-tua/` |
| `AGENT-UI-ADMIN` | UI Agent — Admin | Admin-facing pages and components | `app/(admin)/`, `components/admin/` |
| `AGENT-UI-SHARED` | UI Agent — Shared | Design system, shared components | `components/ui/`, `components/charts/`, `components/forms/`, `components/layout/` |
| `AGENT-AI` | AI Integration Agent | Claude API, report generation | `lib/ai/`, `app/api/learning-reports/[id]/ai/` |
| `AGENT-PDF` | PDF Agent | PDF rendering pipeline | `lib/pdf/`, `app/api/learning-reports/[id]/pdf/`, `app/internal/` |
| `AGENT-INFRA` | Infrastructure Agent | Config, env, Vercel, crons | `next.config.ts`, `vercel.json`, `middleware.ts`, `tailwind.config.ts` |
| `AGENT-PM` | PM / Review Agent | PRD/TRD/ERD updates, PR review | `*.md` documents, PR comments |

---

## Layer Execution Order

```
Phase 0: Foundation
  AGENT-INFRA  → project scaffold, config files, tailwind tokens
  AGENT-DB     → migration files + idempotent seed

Phase 1: Auth
  AGENT-AUTH   → session lib, middleware, login/logout API routes

Phase 2: Data Layer (run in parallel after Phase 1)
  AGENT-QUERY  → all query functions (one file per domain)

Phase 3: API Layer (depends on Phase 2)
  AGENT-API    → all API route handlers (one file per domain)

Phase 4: Shared UI (can start after Phase 0)
  AGENT-UI-SHARED → ui primitives, charts, forms, layout shells

Phase 5: Feature UI (depends on Phase 3 + Phase 4)
  AGENT-UI-GURU    → all Guru screens
  AGENT-UI-PARENT  → all Parent screens
  AGENT-UI-ADMIN   → all Admin screens

Phase 6: AI + PDF (depends on Phase 3)
  AGENT-AI   → report generator
  AGENT-PDF  → PDF renderer + internal print page
```

---

## AGENT-INFRA — Infrastructure Agent

### Scope
Project bootstrap and configuration. Runs first, blocks everyone else.

### Tasks (in order)

**Task INF-1 — Project Scaffold**
```
Create the Next.js 15 App Router project structure exactly as defined in trd.md §2.
Initialise with TypeScript strict mode. No src/ directory.
```

**Task INF-2 — Tailwind Configuration**
```
Configure Tailwind v4 with:
- Design tokens from prd.md §5 as CSS variables
- Inter font via next/font/google
- Custom animation: only fade-in (200ms) — no other motion
- No arbitrary value usage for colours — add them to the theme
```

**Task INF-3 — next.config.ts**
```ts
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.vercel-blob.com' },
    ],
  },
  experimental: {
    serverActions: { allowedOrigins: ['mahabbah-quran.vercel.app'] },
  },
}

export default nextConfig
```

**Task INF-4 — vercel.json**
As specified in `trd.md §14`. Include PDF function memory bump and nightly cron.

**Task INF-5 — Environment template**
Create `.env.example` with all required variables from `trd.md §13`.
Never create `.env.local` — that is never committed.

**Task INF-6 — package.json scripts**
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "db:generate": "drizzle-kit generate",
    "db:push": "drizzle-kit push",
    "db:seed": "tsx drizzle/seed.ts",
    "db:studio": "drizzle-kit studio"
  }
}
```

**Deliverable:** Pull request with scaffold files. No business logic.

---

## AGENT-DB — Database Agent

### Scope
Drizzle schema file, migration, idempotent seed. No application code.

### Dependency
AGENT-INFRA must complete INF-1 first.

### Tasks (in order)

**Task DB-1 — Drizzle schema**
Translate `erd.md §2` DDL into Drizzle schema format in `drizzle/schema.ts`.
Use `bigserial`, `varchar`, `boolean`, `date`, `timestamptz`. No enums.
Every table must match the ERD exactly — column names, types, constraints.

**Task DB-2 — drizzle.config.ts**
As specified in `trd.md §9.1`.

**Task DB-3 — Neon client singleton**
```ts
// lib/db/client.ts
import { neon, neonConfig } from '@neondatabase/serverless'
neonConfig.fetchConnectionCache = true
export const sql = neon(process.env.DATABASE_URL!)
```

**Task DB-4 — Migration**
Run `drizzle-kit generate` → `drizzle-kit push` against Neon.
Commit the generated migration files in `drizzle/migrations/`.

**Task DB-5 — Idempotent seed**
Implement `drizzle/seed.ts` as specified in `trd.md §9.2`.
Seed: 4 programs, 37 surahs (Juz 30 complete), 1 admin user, 3 teachers, 5 parents, 10 students, 1 week of attendance, 10 hafalan records, 4 tahsin records, 4 learning reports, 3 notifications.
Every INSERT must use `ON CONFLICT (id) DO NOTHING`.

**Deliverable:** `drizzle/`, `lib/db/client.ts`. All queries pass `npx tsx drizzle/seed.ts`.

---

## AGENT-AUTH — Auth Agent

### Scope
Session management, login/logout API routes, Edge Middleware.

### Dependency
AGENT-DB DB-3 (Neon client singleton).

### Tasks (in order)

**Task AUTH-1 — Session library**
Implement `lib/auth/session.ts` as specified in `trd.md §6.1`.

**Task AUTH-2 — Login API route**
```
POST /api/auth/login
Body: { email?: string, phone?: string, password: string }
- Calls getUserByEmail or getUserByPhone from lib/db/queries/users.ts
- Verifies bcrypt password
- Sets httpOnly cookie mq_session with JWT
- Returns { role } so client can redirect
```

**Task AUTH-3 — Logout API route**
```
POST /api/auth/logout
- Clears the mq_session cookie
- Returns 200
```

**Task AUTH-4 — Edge Middleware**
Implement `middleware.ts` as specified in `trd.md §6.2`.
Role-to-path map: guru→/guru, orang_tua→/orang-tua, admin→/admin.
Inject `x-user-id` and `x-user-role` headers for RSC pages.

**Task AUTH-5 — Login page**
`app/(auth)/login/page.tsx` — SSR page.
Client component `LoginForm` handles form state, calls POST `/api/auth/login`, redirects on success.
Design: Mahabbah Qur'an logo, role toggle (Guru / Orang Tua / Admin), email/phone field, password field, "Masuk" button.

**Deliverable:** Auth fully functional. Login → correct dashboard redirect. Unauthenticated → login redirect.

---

## AGENT-QUERY — Query Agent

### Scope
All raw SQL query functions in `lib/db/queries/`. No routes. No components.

### Dependency
AGENT-DB DB-3, DB-4 (schema live in Neon).

### Tasks (in order)

Work through domains in this order — each is a separate file:

**Task Q-1 — `lib/db/queries/users.ts`**
Functions: `getUserByEmail`, `getUserByPhone`, `getUserById`, `updateFcmToken`, `updateLastLogin`, `insertUser`, `softDeleteUser`

**Task Q-2 — `lib/db/queries/surahs.ts`**
Functions: `getAllSurahs`, `getSurahsByJuz(juz)`, `getSurahById`

**Task Q-3 — `lib/db/queries/programs.ts`**
Functions: `getAllPrograms`, `getProgramById`, `insertProgram`

**Task Q-4 — `lib/db/queries/classes.ts`**
Functions: `getClassesByTeacher(teacherId)`, `getClassById`, `getAllClasses`, `insertClass`, `updateClass`

**Task Q-5 — `lib/db/queries/students.ts`**
Functions: `getStudentsByTeacher`, `getStudentsByClass`, `getStudentById`, `searchStudents(query, filters)`, `insertStudent`, `updateStudent`, `softDeleteStudent`, `getAtRiskStudents`

`getAtRiskStudents` logic:
- Attendance < 70% in current month OR
- Hafalan score < 60 for last 3 sessions OR
- No learning report submitted in last 7 days

**Task Q-6 — `lib/db/queries/attendance.ts`**
Functions: `getAttendanceByClassDate(classId, date)`, `getAttendanceSummaryByStudent(studentId, month)`, `getMonthlyAttendanceStats(classId, months)`, `upsertAttendance(data)`

`getMonthlyAttendanceStats` returns 8 months of data for the progress chart.

**Task Q-7 — `lib/db/queries/hafalan.ts`**
Functions: `getHafalanByStudent(studentId, limit?)`, `getLastHafalanByStudent(studentId)`, `insertHafalanRecord(data)`, `getHafalanProgressChart(classId, months)`

**Task Q-8 — `lib/db/queries/tahsin.ts`**
Functions: `getTahsinByStudent(studentId, limit?)`, `insertTahsinRecord(data)`, `getTahsinAverageByStudent(studentId)`

**Task Q-9 — `lib/db/queries/learning-reports.ts`**
Functions: `getLearningReportsByTeacherDate(teacherId, date)`, `getLearningReportsByStudent(studentId, limit?)`, `getLearningReportById(id)`, `insertLearningReport(data)`, `updateLearningReport(id, data)`, `markReportSent(id)`, `getUnsentReportsCount(teacherId)`, `getDraftReportsByTeacher(teacherId)`

**Task Q-10 — `lib/db/queries/notifications.ts`**
Functions: `getNotificationsByUser(userId, page)`, `getUnreadCount(userId)`, `insertNotification(data)`, `markNotificationRead(id)`, `markAllRead(userId)`

**Task Q-11 — `lib/db/queries/student-parents.ts`**
Functions: `getParentsByStudent(studentId)`, `getChildrenByParent(parentId)`, `linkParentToStudent(data)`

### Output contract for every query function
- Named input type
- Named return type (or `null` for single-row lookups)
- JSDoc comment with the query's intent
- No `any`

**Deliverable:** 11 files, all functions typed, all passing TypeScript strict mode.

---

## AGENT-API — API Agent

### Scope
All route handlers in `app/api/`. Calls query functions. No SQL. No UI.

### Dependency
AGENT-QUERY all tasks complete. AGENT-AUTH AUTH-1 (session lib).

### Tasks (in order)

**Task API-1 — `/api/users`**
`GET` (admin only): list all users with role filter
`POST` (admin only): create user

**Task API-2 — `/api/students` and `/api/students/[id]`**
`GET /api/students`: teacher gets their students; admin gets all (with filters: program, class, status, search)
`POST /api/students`: admin only — create student
`GET /api/students/[id]`: any authenticated user with access to that student
`PATCH /api/students/[id]`: admin only
`DELETE /api/students/[id]`: admin only — soft delete

**Task API-3 — `/api/classes`**
`GET`: teacher gets their classes; admin gets all
`POST`: admin only

**Task API-4 — `/api/programs`**
`GET`: all authenticated users
`POST`: admin only

**Task API-5 — `/api/attendance`**
`GET`: with `?class_id=&date=` query params — returns roll call for class+date
`POST`: guru only — upsert attendance record (single or batch array)

**Task API-6 — `/api/hafalan`**
`GET`: with `?student_id=` — returns student's hafalan history
`POST`: guru only — create hafalan record

**Task API-7 — `/api/tahsin`**
`GET`: with `?student_id=`
`POST`: guru only — create tahsin record

**Task API-8 — `/api/learning-reports` and `/api/learning-reports/[id]`**
`GET /api/learning-reports`: teacher gets their reports (today or by date); parent gets their child's reports
`POST /api/learning-reports`: guru only — create report (draft)
`GET /api/learning-reports/[id]`: owner teacher or linked parent
`PATCH /api/learning-reports/[id]`: guru only — update draft
`POST /api/learning-reports/[id]/ai`: guru only — trigger AI generation
`GET /api/learning-reports/[id]/pdf`: teacher or parent — download PDF

**Task API-9 — `/api/notifications`**
`GET`: current user's notifications (paginated)
`PATCH /api/notifications/[id]/read`: mark single read
`PATCH /api/notifications/read-all`: mark all read

**Task API-10 — `/api/surahs`**
`GET`: all authenticated — full surah list (cached, rarely changes)

**Task API-11 — `/api/upload`**
`POST`: authenticated — upload file to Vercel Blob, return URL

**Deliverable:** All routes functional, returning correct status codes, validated with zod, guarded with session check.

---

## AGENT-UI-SHARED — Shared UI Agent

### Scope
Design system primitives, chart wrappers, shared form components, layout shells. Can run from Phase 0 (no DB dependency for component structure).

### Tasks (in order)

**Task UI-S-1 — Primitive components** (`components/ui/`)
Implement: `Button`, `Card`, `Badge`, `Input`, `Select`, `Modal`, `Skeleton`, `Pagination`, `Avatar`, `ProgressBar`, `ProgressRing`, `StarRating`

Every component:
- TypeScript props interface
- Tailwind classes using design tokens only
- No inline styles

`ProgressRing`: SVG circle, props `percent`, `size`, `color`. Renders completion arc.
`StarRating`: 5-star interactive or readonly, props `value`, `onChange?`, `readonly?`
`Badge`: colour variants — `success`, `warning`, `danger`, `neutral`, `primary`

**Task UI-S-2 — Chart components** (`components/charts/`)
All `"use client"`. All use recharts.

`LearningProgressChart` — 3-line chart: hafalan %, tahsin %, average score. 8-month x-axis. Legend at bottom. Props: `data: { month: string, hafalan: number, tahsin: number, score: number }[]`

`AttendanceBarChart` — grouped bar chart per month: hadir, izin, sakit, alfa. Props: `data: { month: string, hadir: number, izin: number, sakit: number, alfa: number }[]`

`HafalanTrendChart` — line chart, student hafalan score over time. Props: `data: { date: string, score: number }[]`

**Task UI-S-3 — Form components** (`components/forms/`)
All `"use client"`.

`AttendanceToggle` — 4 pill buttons: Hadir / Izin / Sakit / Alfa. Props: `value`, `onChange`
`HafalanForm` — surah select (searchable dropdown from surahs list), ayah start/end number inputs, type toggle Hafalan Baru / Muraja'ah
`TahsinForm` — 4 StarRating rows: Makhraj, Tajwid, Kelancaran, Ghunnah
`PenilaianForm` — 3 numeric inputs with /100 suffix: Hafalan, Tahsin, Adab
`TeacherNotesEditor` — TipTap editor, plain text, 200-char counter
`ReportInputForm` — orchestrates all sections above; submit calls `/api/learning-reports`

**Task UI-S-4 — Layout shells** (`components/layout/`)
All RSC unless noted.

`GuruSidebar` — vertical nav: Dashboard, Santri Saya, Absensi, Hafalan, Penilaian, Laporan, Kegiatan, Pengaturan. Logo at top, user info + Keluar at bottom.
`AdminSidebar` — vertical nav: Dashboard, Data Santri, Data Guru, Program, Kelas, Absensi, Hafalan, Tahsin, Penilaian, Laporan, Analitik, AI Mahabbah, Notifikasi, Pengaturan.
`ParentBottomNav` — `"use client"` — 4-tab mobile nav: Beranda, Anak Saya, Notifikasi, Akun
`TopBar` — page title, notification bell, user avatar. RSC.
`NotificationBell` — `"use client"` — shows unread count badge, opens notification dropdown on click.

**Deliverable:** All shared components with Storybook-style usage example in JSDoc.

---

## AGENT-UI-GURU — Guru UI Agent

### Scope
All Guru-facing pages and Guru-specific components.

### Dependency
AGENT-UI-SHARED all tasks. AGENT-API API-2 through API-8.

### Tasks (in order)

**Task UIG-1 — Dashboard** (`app/(guru)/dashboard/page.tsx`)
RSC. Fetches: `getDailySummary`, `getStudentsByTeacher`, chart data.
Components: `DailySummaryCard` (total / hadir / izin / alfa summary), `InputLaporanCTA` (gold button), `StudentCard` list (photo, name, class, last hafalan, ProgressRing), `LearningProgressChart`, quick stats grid, `QuickMenu` (6 icon links).

`DailySummaryCard` layout matches the mockup: 2×2 grid of stat tiles + INPUT LAPORAN button full width below.

**Task UIG-2 — Student List** (`app/(guru)/santri/page.tsx`)
RSC. Searchable list of teacher's students. Each row: avatar, name, class, last hafalan, progress %, status badge.

**Task UIG-3 — Input Laporan** (`app/(guru)/laporan/[studentId]/input/page.tsx`)
RSC shell + `"use client"` `ReportInputForm`.
RSC pre-fetches: student info, last hafalan record (for form pre-fill), surah list.
After submit: triggers `router.refresh()`. Shows `AIReportPanel` once report is saved as draft.

`AIReportPanel` — Client Component:
1. Shows "Buat Laporan dengan AI" button (gold CTA, disabled until draft saved)
2. On click: POST `/api/learning-reports/[id]/ai`
3. Shows loading state ("Sedang membuat laporan...")
4. On response: pre-fills TipTap editor with `ai_report_text`
5. Shows `ai_parent_advice` as a separate read-only section
6. "Edit Catatan", "Regenerate", "Setujui & Kirim" buttons
7. On "Setujui & Kirim": PATCH report status to `sent`, triggers FCM notification, `router.refresh()`

**Task UIG-4 — Attendance Page** (`app/(guru)/absensi/page.tsx`)
RSC. Date picker (client) → loads roll call for selected date. Each student row has `AttendanceToggle`.
Batch save: collects all student statuses, POST `/api/attendance` with array.

**Task UIG-5 — Laporan List** (`app/(guru)/laporan/page.tsx`)
RSC. Date-filtered list of submitted reports. Columns: student name, date, status badge (draft/sent), AI status, action buttons.

**Task UIG-6 — Hafalan Page** (`app/(guru)/hafalan/page.tsx`)
RSC. Student selector → shows that student's complete hafalan history in a timeline. Uses `HafalanTrendChart`.

**Deliverable:** All 6 Guru pages rendering correctly with real Neon data.

---

## AGENT-UI-PARENT — Parent UI Agent

### Scope
All Parent-facing pages and Parent-specific components. Mobile-first layout.

### Dependency
AGENT-UI-SHARED all tasks. AGENT-API API-8, API-9.

### Tasks (in order)

**Task UIP-1 — Parent Dashboard** (`app/(orang-tua)/beranda/page.tsx`)
RSC. Reads `x-user-id` from headers, calls `getChildrenByParent`.
For each child: progress %, attendance %, average score.
Components: `ChildProgressHeader` (child photo, name, class), `MetricCards` (3 stat cards with progress bars), `LatestReportCard` ("Baru" badge, teacher message preview, "Lihat Laporan" button), `MenuGrid` (6 icon shortcuts).

**Task UIP-2 — Report Detail** (`app/(orang-tua)/laporan/[id]/page.tsx`)
RSC. Full report view.
Components: student info header, kehadiran badge, hafalan section (surah + ayat range, type pill, score), tahsin section (4 StarRating readonly + adab score), teacher narrative, parent advice section, "Bagikan Laporan" button, "Download PDF" button (client, calls `/api/learning-reports/[id]/pdf`).

**Task UIP-3 — Report List** (`app/(orang-tua)/laporan/page.tsx`)
RSC. Chronological list of reports for this parent's child. Each row: date, teacher, hafalan summary, kehadiran badge, "Lihat" link.

**Task UIP-4 — Attendance View** (`app/(orang-tua)/absensi/page.tsx`)
RSC. Monthly calendar view showing attendance status per day. Summary: hadir count, izin count, sakit count, alfa count.

**Task UIP-5 — Notifications** (`app/(orang-tua)/notifikasi/page.tsx`)
RSC shell + client notification list. Paginated. Mark-as-read on tap. Uses `NotificationBell` component pattern.

**Deliverable:** Mobile-optimised screens (max-width 430px, bottom nav visible). All real data.

---

## AGENT-UI-ADMIN — Admin UI Agent

### Scope
All Admin-facing pages and Admin-specific components.

### Dependency
AGENT-UI-SHARED all tasks. AGENT-API all tasks.

### Tasks (in order)

**Task UIA-1 — Admin Dashboard** (`app/(admin)/dashboard/page.tsx`)
RSC. Summary cards: Total Santri, Santri Aktif, Guru count, Kelas count, Kehadiran Bulan Ini %.
`LearningProgressChart` (aggregate, all classes). `AttendanceBarChart` (monthly, institution-wide).
Report status row: sudah dikirim / menunggu review / belum dibuat (3 stat cells).
`AtRiskTable` — calls `getAtRiskStudents()`. Columns: Nama, Kelas, Masalah, Status. Each row has "Perlu Perhatian" badge.
`AIAnalysisPanel` — Client Component. Shows 3 quick-question chips. On click: POST `/api/ai/analyze` with the question + context data. Shows AI text response streamed back.

**Task UIA-2 — Data Santri** (`app/(admin)/santri/page.tsx`)
RSC. Paginated table (10/page).
Search bar (`"use client"` — debounced, updates URL params, triggers router.refresh).
Filters: Program dropdown, Kelas dropdown, Guru dropdown, Status dropdown (all URL params for SSR).
Columns: foto, nama, program, kelas, guru, progress %, kehadiran %, status badge.
"+ Tambah Santri" → opens `AddStudentModal` (Client Component, form → POST `/api/students`).

**Task UIA-3 — Student Detail** (`app/(admin)/santri/[id]/page.tsx`)
RSC. Full student profile: personal info, class info, parent info, full hafalan history, full attendance calendar, all learning reports list.

**Task UIA-4 — Guru Management** (`app/(admin)/guru/page.tsx`)
RSC. Table of teachers: name, email, phone, assigned classes, student count, reports sent this month.
Add Guru button → modal form → POST `/api/users`.

**Task UIA-5 — Kelas Management** (`app/(admin)/kelas/page.tsx`)
RSC. Table of classes: name, program, teacher, student count, active status.
Add Kelas modal → POST `/api/classes`.

**Task UIA-6 — Analytics** (`app/(admin)/analitik/page.tsx`)
RSC shell + client charts. Deeper analytics: hafalan distribution across surahs, attendance trend 12 months, score distribution histogram.

**Deliverable:** All Admin pages functioning. Data table search/filter works via URL params (SSR-safe, no client state).

---

## AGENT-AI — AI Integration Agent

### Scope
Anthropic Claude API integration for report generation and admin analysis.

### Dependency
AGENT-DB DB-3. AGENT-QUERY Q-9.

### Tasks (in order)

**Task AI-1 — Report Generator**
Implement `lib/ai/report-generator.ts` exactly as specified in `trd.md §11`.
Output: `{ reportText: string, parentAdvice: string }` — both in Bahasa Indonesia.
Prompt must produce JSON only (no markdown, no preamble).
Parse with `JSON.parse` — handle parse errors with a fallback: re-prompt once, then return error.

**Task AI-2 — Admin Analysis**
```ts
// lib/ai/institution-analyzer.ts
export async function analyzeInstitution(
  question: string,
  context: {
    totalStudents: number
    activeStudents: number
    avgAttendance: number
    atRiskStudents: { name: string; class: string; issue: string }[]
    avgHafalanScore: number
  }
): Promise<string>
```
Prompt: system role as "asisten analitik lembaga Rumah Tahfizh". Returns concise Indonesian text.

**Task AI-3 — API route for admin analysis**
```
POST /api/ai/analyze
Body: { question: string }
Role guard: admin only
Calls: institutionAnalyzer with live data snapshot
Returns: { answer: string }
```

**Deliverable:** AI report generating correctly. Admin analysis returning sensible answers to the 3 preset questions.

---

## AGENT-PDF — PDF Agent

### Scope
Server-side PDF generation and the internal print-only SSR page.

### Dependency
AGENT-QUERY Q-9. AGENT-UI-PARENT UIP-2 (for design reference).

### Tasks (in order)

**Task PDF-1 — Internal print page**
`app/internal/report-pdf/[id]/page.tsx`
RSC. No sidebar, no nav — print-safe layout only.
Sections: Mahabbah Qur'an letterhead, student info, all report sections styled for A4 print.
Tailwind `print:` utilities where needed. White background, black text for PDF rendering.
This page is not linked from the main app nav — it is fetched by Puppeteer only.

**Task PDF-2 — PDF renderer**
Implement `lib/pdf/renderer.ts` as specified in `trd.md §12`.

**Task PDF-3 — PDF API route**
`app/api/learning-reports/[id]/pdf/route.ts`:
1. Check session (teacher or linked parent of this student)
2. Call `renderReportPDF(id)` → Buffer
3. Upload to Vercel Blob with path `pdfs/report-{id}-{date}.pdf`
4. Return `NextResponse` with `Content-Type: application/pdf` and `Content-Disposition: attachment; filename="laporan-{studentName}-{date}.pdf"`

**Deliverable:** GET `/api/learning-reports/1/pdf` returns a valid, styled PDF of the seed report.

---

## AGENT-PM — PM / Review Agent

### Scope
Documentation, PR review, schema change requests.

### Tasks (ongoing)

**Task PM-1 — Schema change gating**
Any agent that identifies a gap between `erd.md` and the actual requirements must write a **Schema Change Request** in this format before any code is written:

```md
## Schema Change Request

**Requested by:** AGENT-{ID}
**Date:** {date}
**Table affected:** {table_name}
**Change:** {ADD COLUMN / ADD TABLE / MODIFY CONSTRAINT}
**Reason:** {why the current schema is insufficient}
**Proposed DDL:**
  ALTER TABLE ... ADD COLUMN ...;
  CREATE INDEX ...;
**Impact on existing queries:** {list affected query functions}
```

AGENT-PM reviews and either approves (updates `erd.md`) or rejects with alternative.

**Task PM-2 — PR review checklist**
Every PR is checked against `claude.md` iron rules before merge:
- [ ] No SQL outside `lib/db/queries/`
- [ ] No Drizzle ORM imports in app code
- [ ] No `"use client"` on page files
- [ ] Auth check first in every API route
- [ ] Zod validation in every POST/PATCH route
- [ ] No `any` types
- [ ] Design tokens only (no arbitrary Tailwind hex outside defined tokens)
- [ ] No hardcoded secrets

**Task PM-3 — Document updates**
When a feature is completed, update `prd.md` to mark the feature as ✅ built.
When a TRD decision changes, update `trd.md` with the change and rationale.

---

## Handoff Protocol

When an agent completes a task, it writes a completion note in this format:

```
TASK {TASK-ID} COMPLETE
Agent: AGENT-{ID}
Files produced:
  - path/to/file1.ts
  - path/to/file2.tsx
Notes: {any deviations from spec, decisions made, things the next agent needs to know}
Blockers for next agent: {none | list what the next agent must check}
```

This note is the handoff. The next agent reads it, then reads the files, then starts their task.

---

## Error Protocol

If an agent encounters a situation where:
- The schema doesn't have a needed column
- The PRD is ambiguous about behaviour
- Two rules in `claude.md` conflict for this case

The agent **stops**, writes an **Issue Report** to AGENT-PM, and waits:

```
ISSUE REPORT
Agent: AGENT-{ID}
Task: {TASK-ID}
Issue: {clear description of the conflict or gap}
Options considered:
  A) {option} — consequence: {consequence}
  B) {option} — consequence: {consequence}
Recommendation: {which option and why}
```

An agent never makes undocumented decisions that affect other agents' work.
