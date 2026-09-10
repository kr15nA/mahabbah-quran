# Technical Requirements Document (TRD)
## Mahabbah Qur'an — Next.js SSR Platform
**Version 1.0 | September 2026**

---

## 1. Platform Decision & Rationale

### 1.1 No SPA. SSR-First, Always.

All pages are **Next.js 15 App Router with React Server Components (RSC) by default**.
The UI mockups (HTML/JSX references) are design references only — they are **never** the deliverable.
Every route must be a proper server-rendered page unless a specific interactive widget demands a Client Component.

| Concern | Decision |
|---------|----------|
| Initial load performance | SSR renders full HTML; parent on 4G sees content in < 2s |
| SEO (dashboard meta, public pages) | Server-rendered `<head>` with dynamic OG tags per page |
| Data freshness | Server fetches on every request; no stale SPA state |
| Auth guard | Middleware-level redirect before any JS ships to browser |
| Interactive widgets (charts, forms, drag-drop) | `"use client"` scoped to the leaf component only |

### 1.2 Deployment

| Target | Platform |
|--------|----------|
| Web App (all roles) | **Vercel** — Edge Middleware for auth, ISR for static pages |
| Database | **Neon PostgreSQL Serverless** (`ap-southeast-1`) |
| File & Image Storage | **Vercel Blob Storage** (avatars, report PDFs, exports) |
| AI Report Generation | **Anthropic Claude API** (`claude-sonnet-4-6`) via server action |
| Push Notifications | **Firebase Cloud Messaging** (FCM) via server-side SDK |
| PDF Generation | `@sparticuz/chromium` + `puppeteer-core` on Vercel Function |

---

## 2. Repository Structure

```
mahabbah-quran/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx                  # SSR login page
│   │   └── layout.tsx
│   ├── (guru)/
│   │   ├── layout.tsx                    # Guru shell — sidebar, topbar
│   │   ├── dashboard/
│   │   │   └── page.tsx                  # SSR — daily summary + student list
│   │   ├── santri/
│   │   │   ├── page.tsx                  # SSR — full student list
│   │   │   └── [id]/
│   │   │       └── page.tsx              # SSR — student detail + history
│   │   ├── laporan/
│   │   │   ├── page.tsx                  # SSR — report list
│   │   │   └── [studentId]/
│   │   │       └── input/
│   │   │           └── page.tsx          # SSR shell + "use client" form
│   │   ├── absensi/
│   │   │   └── page.tsx
│   │   ├── hafalan/
│   │   │   └── page.tsx
│   │   └── penilaian/
│   │       └── page.tsx
│   ├── (orang-tua)/
│   │   ├── layout.tsx                    # Parent mobile shell — bottom nav
│   │   ├── beranda/
│   │   │   └── page.tsx                  # SSR — child progress dashboard
│   │   ├── laporan/
│   │   │   ├── page.tsx                  # SSR — report list
│   │   │   └── [id]/
│   │   │       └── page.tsx              # SSR — full report detail
│   │   ├── hafalan/page.tsx
│   │   ├── absensi/page.tsx
│   │   └── notifikasi/page.tsx
│   ├── (admin)/
│   │   ├── layout.tsx                    # Admin shell — full sidebar
│   │   ├── dashboard/
│   │   │   └── page.tsx                  # SSR — KPI cards + charts shell
│   │   ├── santri/
│   │   │   ├── page.tsx                  # SSR — paginated data table
│   │   │   └── [id]/page.tsx
│   │   ├── guru/
│   │   │   └── page.tsx
│   │   ├── kelas/
│   │   │   └── page.tsx
│   │   ├── program/
│   │   │   └── page.tsx
│   │   └── analitik/
│   │       └── page.tsx
│   └── api/
│       ├── auth/
│       │   ├── login/route.ts
│       │   ├── logout/route.ts
│       │   └── refresh/route.ts
│       ├── users/
│       │   └── route.ts
│       ├── students/
│       │   ├── route.ts
│       │   └── [id]/route.ts
│       ├── classes/
│       │   └── route.ts
│       ├── programs/
│       │   └── route.ts
│       ├── attendance/
│       │   └── route.ts
│       ├── hafalan/
│       │   └── route.ts
│       ├── tahsin/
│       │   └── route.ts
│       ├── learning-reports/
│       │   ├── route.ts
│       │   └── [id]/
│       │       ├── route.ts
│       │       ├── ai/route.ts           # POST → Claude generation
│       │       └── pdf/route.ts          # GET → PDF download
│       ├── notifications/
│       │   └── route.ts
│       ├── surahs/
│       │   └── route.ts
│       └── upload/
│           └── route.ts                  # Vercel Blob upload handler
├── lib/
│   ├── db/
│   │   ├── client.ts                     # Neon pool singleton
│   │   └── queries/
│   │       ├── users.ts                  # ALL raw SQL for users domain
│   │       ├── students.ts               # ALL raw SQL for students domain
│   │       ├── classes.ts
│   │       ├── programs.ts
│   │       ├── attendance.ts
│   │       ├── hafalan.ts
│   │       ├── tahsin.ts
│   │       ├── learning-reports.ts
│   │       ├── notifications.ts
│   │       └── surahs.ts
│   ├── auth/
│   │   ├── session.ts                    # JWT sign / verify
│   │   └── middleware.ts                 # Role-based route guard
│   ├── ai/
│   │   └── report-generator.ts           # Claude API call — report + advice
│   ├── pdf/
│   │   └── renderer.ts                   # Puppeteer PDF generation
│   ├── fcm/
│   │   └── notify.ts                     # FCM push sender
│   └── blob/
│       └── upload.ts                     # Vercel Blob wrapper
├── components/
│   ├── ui/                               # Reusable primitives
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── StarRating.tsx
│   │   ├── ProgressRing.tsx
│   │   ├── ProgressBar.tsx
│   │   ├── Avatar.tsx
│   │   ├── Modal.tsx
│   │   ├── Skeleton.tsx
│   │   └── Pagination.tsx
│   ├── charts/                           # "use client" — recharts wrappers
│   │   ├── LearningProgressChart.tsx
│   │   ├── AttendanceBarChart.tsx
│   │   └── HafalanTrendChart.tsx
│   ├── forms/                            # "use client" — form sections
│   │   ├── AttendanceToggle.tsx
│   │   ├── HafalanForm.tsx
│   │   ├── TahsinForm.tsx
│   │   ├── PenilaianForm.tsx
│   │   ├── TeacherNotesEditor.tsx        # TipTap rich-text
│   │   └── ReportInputForm.tsx           # Orchestrates all sections
│   ├── guru/
│   │   ├── DailySummaryCard.tsx
│   │   ├── StudentCard.tsx
│   │   ├── StudentListTable.tsx
│   │   ├── QuickStatsGrid.tsx
│   │   └── AIReportPanel.tsx             # "use client" — AI draft + edit
│   ├── orang-tua/
│   │   ├── ChildProgressHeader.tsx
│   │   ├── MetricCards.tsx
│   │   ├── LatestReportCard.tsx
│   │   └── ReportDetail.tsx
│   ├── admin/
│   │   ├── KPICards.tsx
│   │   ├── AtRiskTable.tsx
│   │   ├── AIAnalysisPanel.tsx
│   │   ├── StudentDataTable.tsx
│   │   └── ReportStatusRow.tsx
│   └── layout/
│       ├── GuruSidebar.tsx
│       ├── AdminSidebar.tsx
│       ├── ParentBottomNav.tsx
│       ├── TopBar.tsx
│       └── NotificationBell.tsx
├── drizzle/
│   ├── drizzle.config.ts
│   ├── schema.ts                         # Schema definitions for migrate only
│   └── seed.ts                           # Idempotent seed script
├── middleware.ts                         # Edge middleware — auth + role routing
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

---

## 3. The Iron Rules (Non-Negotiable)

These rules apply to every file in this repository. Any PR that violates them is rejected.

### Rule 1 — No raw SQL in components or API routes
```
❌ WRONG — query inside route handler
   app/api/students/route.ts:
     const result = await sql`SELECT * FROM students WHERE ...`

✅ CORRECT — route calls a query function
   app/api/students/route.ts:
     import { getStudentsByClass } from '@/lib/db/queries/students'
     const rows = await getStudentsByClass(classId)
```

### Rule 2 — Drizzle for migrations and seed only
Drizzle is installed for `drizzle-kit push` / `drizzle-kit migrate` and the `drizzle/seed.ts` script.
It is **never imported outside** `drizzle/` — no `db.select()`, no `db.insert()`, no schema imports in application code.

```
❌ WRONG
   import { db } from '@/drizzle/client'
   import { students } from '@/drizzle/schema'
   const rows = await db.select().from(students).where(...)

✅ CORRECT
   import { getStudentsByClass } from '@/lib/db/queries/students'
   const rows = await getStudentsByClass(classId)
```

### Rule 3 — RSC by default, "use client" at the leaf
Server Components fetch data and pass serialisable props to Client Components.
Client Components hold only interaction state (form inputs, modal open, chart hover).

```
❌ WRONG — page fetches inside a client component
   'use client'
   export default function DashboardPage() {
     const [data, setData] = useState(null)
     useEffect(() => { fetch('/api/...').then(...) }, [])
   }

✅ CORRECT — page is RSC, chart is the only client component
   // app/(guru)/dashboard/page.tsx  (RSC — no "use client")
   import { getDailySummary } from '@/lib/db/queries/attendance'
   import { LearningProgressChart } from '@/components/charts/LearningProgressChart'

   export default async function DashboardPage() {
     const summary = await getDailySummary(teacherId)
     return <LearningProgressChart data={summary.chartData} />
   }
```

### Rule 4 — No Drizzle ORM in API routes, only Neon SQL pool
```ts
// lib/db/client.ts
import { neon } from '@neondatabase/serverless'
export const sql = neon(process.env.DATABASE_URL!)
```

Every query function in `lib/db/queries/*.ts` uses `sql` tagged template literals directly.

### Rule 5 — No SPA navigation patterns
- No client-side `fetch` to load page data (use RSC + `revalidatePath` / `revalidateTag`).
- Forms use `<form action={serverAction}>` or API route POST + `router.refresh()`.
- Navigation uses `<Link>` (Next.js), never `router.push` for initial data loads.

### Rule 6 — Vercel Blob for all binary assets
No base64 in DB. No local `/public` uploads. All user-uploaded files (avatars, exported PDFs) go through `lib/blob/upload.ts` → Vercel Blob → URL stored in DB column.

### Rule 7 — All secrets in environment variables
No hardcoded keys. Vercel project env is the source of truth.

---

## 4. Database Layer

### 4.1 Neon Client Singleton

```ts
// lib/db/client.ts
import { neon, neonConfig } from '@neondatabase/serverless'

neonConfig.fetchConnectionCache = true  // reuse connections across invocations

export const sql = neon(process.env.DATABASE_URL!)
```

### 4.2 Query File Contract

Each file in `lib/db/queries/` must:
1. Import only `sql` from `@/lib/db/client`
2. Export typed async functions — input params typed, return typed
3. Never throw bare DB errors to callers — wrap in a typed result or re-throw with context
4. Use `$1`-style params (Neon handles parameterisation automatically via tagged templates)

```ts
// lib/db/queries/students.ts
import { sql } from '@/lib/db/client'

export type StudentRow = {
  id: number
  full_name: string
  nickname: string | null
  photo_url: string | null
  class_id: number
  class_name: string
  program_name: string
  status: string
  hafalan_progress: number   -- computed: % of juz completed
  last_surah_latin: string | null
  last_ayah_end: number | null
}

export async function getStudentsByTeacher(teacherId: number): Promise<StudentRow[]> {
  const rows = await sql`
    SELECT
      s.id,
      s.full_name,
      s.nickname,
      s.photo_url,
      s.class_id,
      c.name          AS class_name,
      p.name          AS program_name,
      s.status,
      COALESCE(
        ROUND(
          (COUNT(DISTINCT hr.id) FILTER (WHERE hr.type = 'hafalan_baru')::numeric
           / NULLIF(p.total_ayahs_target, 0)) * 100
        , 0), 0
      )               AS hafalan_progress,
      sr.name_latin   AS last_surah_latin,
      hr_last.ayah_end AS last_ayah_end
    FROM students s
    JOIN classes c      ON c.id = s.class_id
    JOIN programs p     ON p.id = c.program_id
    LEFT JOIN hafalan_records hr      ON hr.student_id = s.id
    LEFT JOIN LATERAL (
      SELECT surah_id, ayah_end
      FROM hafalan_records
      WHERE student_id = s.id
      ORDER BY session_date DESC, id DESC
      LIMIT 1
    ) hr_last ON TRUE
    LEFT JOIN surahs sr ON sr.id = hr_last.surah_id
    WHERE c.teacher_id = ${teacherId}
      AND s.deleted_at IS NULL
      AND s.status = 'active'
    GROUP BY s.id, c.name, p.name, sr.name_latin, hr_last.ayah_end
    ORDER BY s.full_name
  `
  return rows as StudentRow[]
}

export async function getStudentById(id: number): Promise<StudentRow | null> {
  const rows = await sql`
    SELECT s.*, c.name AS class_name, p.name AS program_name
    FROM students s
    JOIN classes c   ON c.id = s.class_id
    JOIN programs p  ON p.id = c.program_id
    WHERE s.id = ${id}
      AND s.deleted_at IS NULL
    LIMIT 1
  `
  return (rows[0] as StudentRow) ?? null
}

export async function insertStudent(data: {
  class_id: number
  full_name: string
  nickname?: string
  gender?: string
  date_of_birth?: string
  enrollment_date: string
  photo_url?: string
}): Promise<number> {
  const rows = await sql`
    INSERT INTO students (class_id, full_name, nickname, gender, date_of_birth, enrollment_date, photo_url)
    VALUES (${data.class_id}, ${data.full_name}, ${data.nickname ?? null},
            ${data.gender ?? null}, ${data.date_of_birth ?? null},
            ${data.enrollment_date}, ${data.photo_url ?? null})
    RETURNING id
  `
  return (rows[0] as { id: number }).id
}
```

### 4.3 Query File Index

| File | Exported Functions |
|------|--------------------|
| `users.ts` | `getUserByEmail`, `getUserByPhone`, `getUserById`, `updateFcmToken`, `updateLastLogin`, `insertUser`, `softDeleteUser` |
| `students.ts` | `getStudentsByTeacher`, `getStudentsByClass`, `getStudentById`, `searchStudents`, `insertStudent`, `updateStudent`, `softDeleteStudent`, `getAtRiskStudents` |
| `classes.ts` | `getClassesByTeacher`, `getClassById`, `getAllClasses`, `insertClass`, `updateClass` |
| `programs.ts` | `getAllPrograms`, `getProgramById`, `insertProgram` |
| `attendance.ts` | `getAttendanceByClassDate`, `getAttendanceSummaryByStudent`, `getMonthlyAttendanceStats`, `upsertAttendance` |
| `hafalan.ts` | `getHafalanByStudent`, `getLastHafalanByStudent`, `insertHafalanRecord`, `getHafalanProgressChart` |
| `tahsin.ts` | `getTahsinByStudent`, `insertTahsinRecord`, `getTahsinAverageByStudent` |
| `learning-reports.ts` | `getLearningReportsByTeacherDate`, `getLearningReportsByStudent`, `getLearningReportById`, `insertLearningReport`, `updateLearningReport`, `markReportSent`, `getUnsentReportsCount`, `getAtRiskReportFlags` |
| `notifications.ts` | `getNotificationsByUser`, `getUnreadCount`, `insertNotification`, `markNotificationRead`, `markAllRead` |
| `surahs.ts` | `getAllSurahs`, `getSurahsByJuz`, `getSurahById` |

---

## 5. API Route Contract

### 5.1 Pattern

Every `app/api/{model}/route.ts`:
1. Parses and validates request body (use `zod`)
2. Extracts `userId` and `role` from session (via `lib/auth/session.ts`)
3. Calls one or more query functions from `lib/db/queries/`
4. Returns `NextResponse.json(payload, { status })`
5. Never writes SQL

```ts
// app/api/students/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth/session'
import { getStudentsByTeacher, insertStudent } from '@/lib/db/queries/students'

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const students = await getStudentsByTeacher(session.userId)
  return NextResponse.json({ data: students })
}

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const schema = z.object({
    class_id:        z.number().int().positive(),
    full_name:       z.string().min(2).max(255),
    nickname:        z.string().max(100).optional(),
    gender:          z.enum(['male', 'female']).optional(),
    date_of_birth:   z.string().optional(),
    enrollment_date: z.string(),
  })
  const parsed = schema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const id = await insertStudent(parsed.data)
  return NextResponse.json({ data: { id } }, { status: 201 })
}
```

### 5.2 AI Report Route

```ts
// app/api/learning-reports/[id]/ai/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getLearningReportById } from '@/lib/db/queries/learning-reports'
import { generateAIReport } from '@/lib/ai/report-generator'
import { updateLearningReport } from '@/lib/db/queries/learning-reports'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession(req)
  if (!session || session.role !== 'guru')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const report = await getLearningReportById(Number(params.id))
  if (!report) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { reportText, parentAdvice } = await generateAIReport(report)

  await updateLearningReport(report.id, {
    ai_report_text:  reportText,
    ai_parent_advice: parentAdvice,
  })

  return NextResponse.json({ data: { reportText, parentAdvice } })
}
```

### 5.3 PDF Route

```ts
// app/api/learning-reports/[id]/pdf/route.ts
// Uses @sparticuz/chromium + puppeteer-core on Vercel
// Renders /internal/report-pdf/[id] (an SSR page) to PDF bytes
// Streams back as application/pdf with Content-Disposition: attachment
```

### 5.4 Upload Route

```ts
// app/api/upload/route.ts
import { put } from '@vercel/blob'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file') as File
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

  const blob = await put(`uploads/${session.userId}/${file.name}`, file, {
    access: 'public',
    contentType: file.type,
  })

  return NextResponse.json({ url: blob.url })
}
```

---

## 6. Auth Architecture

### 6.1 Session Token (JWT — httpOnly cookie)

```ts
// lib/auth/session.ts
import { SignJWT, jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

export type SessionPayload = {
  userId: number
  role: 'guru' | 'orang_tua' | 'admin'
  exp: number
}

export async function createSession(payload: Omit<SessionPayload, 'exp'>): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(SECRET)
}

export async function getSession(req: Request): Promise<SessionPayload | null> {
  const token = req.headers.get('cookie')
    ?.split(';')
    .find(c => c.trim().startsWith('mq_session='))
    ?.split('=')[1]

  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as SessionPayload
  } catch {
    return null
  }
}
```

### 6.2 Edge Middleware

```ts
// middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const ROLE_PREFIXES: Record<string, string[]> = {
  guru:       ['/guru'],
  orang_tua:  ['/orang-tua'],
  admin:      ['/admin'],
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Public routes
  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  const token = req.cookies.get('mq_session')?.value
  if (!token) return NextResponse.redirect(new URL('/login', req.url))

  try {
    const SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)
    const { payload } = await jwtVerify(token, SECRET)
    const role = payload.role as string

    // Role-path guard
    const allowed = ROLE_PREFIXES[role] ?? []
    if (!allowed.some(prefix => pathname.startsWith(prefix))) {
      return NextResponse.redirect(new URL(`/${role.replace('_', '-')}/dashboard`, req.url))
    }

    // Inject userId header for RSC pages
    const res = NextResponse.next()
    res.headers.set('x-user-id', String(payload.userId))
    res.headers.set('x-user-role', role)
    return res
  } catch {
    return NextResponse.redirect(new URL('/login', req.url))
  }
}

export const config = {
  matcher: ['/(guru|orang-tua|admin)/:path*', '/api/((?!auth).*)'],
}
```

---

## 7. Component Architecture

### 7.1 RSC / Client Split Rules

| Component Type | Rule | Example |
|---|---|---|
| Page (`page.tsx`) | Always RSC | Fetches data server-side, passes to children |
| Layout (`layout.tsx`) | Always RSC | Reads session header, renders sidebar |
| Data display | RSC preferred | `StudentCard`, `MetricCards`, `ReportDetail` |
| Chart | Must be Client | `LearningProgressChart` wraps recharts |
| Form | Must be Client | `ReportInputForm`, `AttendanceToggle` |
| Modal | Client | Uses state for open/close |
| Rich-text editor | Client | TipTap |
| Drag-and-drop | Client | `dnd-kit` for student reorder / rank |
| PDF download button | Client | triggers `/api/learning-reports/[id]/pdf` |

### 7.2 Data Flow Pattern

```
page.tsx (RSC)
  └── calls lib/db/queries/*.ts directly (no fetch, no useEffect)
        └── passes serialised data as props to:
              ├── Server sub-components (static display)
              └── Client sub-components (interactive)
                    └── on mutation: calls /api/*/route.ts via fetch()
                          └── route calls lib/db/queries/*.ts
                                └── returns JSON
                                      └── component calls router.refresh()
                                            └── RSC re-renders with fresh DB data
```

### 7.3 Key Shared Components

#### `ProgressRing.tsx` (Client)
SVG circular progress indicator — used on every student card.
Props: `percent: number`, `size?: number`, `color?: string`

#### `StarRating.tsx` (Client)
Interactive or read-only star rating 1–5.
Props: `value: number`, `onChange?: (v: number) => void`, `readonly?: boolean`

#### `Skeleton.tsx` (Server-safe)
Loading state placeholders for Suspense boundaries.

#### `AIReportPanel.tsx` (Client)
Handles AI generation UX:
1. "Buat Laporan dengan AI" button → POST `/api/learning-reports/[id]/ai`
2. Streaming text display (SSE or polling)
3. TipTap editor pre-filled with AI draft
4. "Regenerate" button, "Setujui & Kirim" button

#### `TeacherNotesEditor.tsx` (Client)
TipTap minimal config: bold, italic, paragraph only. 200-char counter.

#### `ReportInputForm.tsx` (Client)
Orchestrates all 5 form sections. Uses `useReducer` for local form state.
On submit: POST to `/api/learning-reports` → `router.refresh()`.

---

## 8. Third-Party Dependencies

| Package | Version | Usage | Notes |
|---------|---------|-------|-------|
| `next` | 15.x | Core framework | App Router, RSC, Middleware |
| `react` | 19.x | UI | RSC + Client Components |
| `@neondatabase/serverless` | latest | DB client | `neon()` tagged template |
| `drizzle-orm` | latest | Migrations & seed only | Never used in app code |
| `drizzle-kit` | latest | `drizzle-kit push` / `migrate` | CLI only |
| `zod` | 3.x | Request validation | All API routes |
| `jose` | 5.x | JWT sign/verify | Edge-compatible |
| `recharts` | 2.x | Charts | Wrapped in client components |
| `@dnd-kit/core` | latest | Drag-and-drop | Student reorder, kanban-style views |
| `@dnd-kit/sortable` | latest | Sortable lists | |
| `@tiptap/react` | 2.x | Rich-text editor | Teacher notes, AI report editing |
| `@tiptap/starter-kit` | 2.x | TipTap base | Bold, italic, paragraph |
| `xlsx` | 0.18.x | Export to Excel | Admin data export |
| `@sparticuz/chromium` | latest | PDF generation | Vercel-compatible Chromium |
| `puppeteer-core` | latest | PDF generation | Headless render → PDF bytes |
| `@vercel/blob` | latest | File storage | Avatars, PDFs |
| `firebase-admin` | 12.x | FCM push | Server SDK only |
| `bcryptjs` | 2.x | Password hashing | Login / registration |
| `tailwindcss` | 4.x | Styling | Utility-first CSS |
| `clsx` | latest | Class merging | Conditional classes |
| `date-fns` | 3.x | Date formatting | Indonesian locale |

---

## 9. Drizzle — Migrations & Seed Only

### 9.1 drizzle.config.ts

```ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './drizzle/schema.ts',
  out: './drizzle/migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
```

### 9.2 Seed Script (Idempotent)

```ts
// drizzle/seed.ts
// Run: npx tsx drizzle/seed.ts
// Safe to run multiple times — uses ON CONFLICT DO NOTHING

import { neon } from '@neondatabase/serverless'
const sql = neon(process.env.DATABASE_URL!)

async function seed() {
  // Programs
  await sql`
    INSERT INTO programs (id, name, description)
    VALUES
      (1, 'Tahfizh Juz 30', 'Program hafalan Juz 30'),
      (2, 'Tahfizh Juz 29', 'Program hafalan Juz 29'),
      (3, 'Tahsin Dasar',   'Program perbaikan tajwid')
    ON CONFLICT (id) DO NOTHING
  `

  // Surahs — full 114 rows (abbreviated here)
  await sql`
    INSERT INTO surahs (id, number, name_arabic, name_latin, name_translation, total_ayahs, juz_start, juz_end)
    VALUES
      (78, 78, 'النبأ', 'An-Naba', 'Berita Besar', 40, 30, 30),
      (114,114,'الناس', 'An-Nas',  'Manusia',       6, 30, 30)
    ON CONFLICT (id) DO NOTHING
  `

  // Seed admin user (password: Admin123!)
  await sql`
    INSERT INTO users (id, full_name, email, password_hash, role)
    VALUES (1, 'Admin Pembina', 'admin@mahabbahquran.id', '$2b$12$...', 'admin')
    ON CONFLICT (id) DO NOTHING
  `

  console.log('Seed complete')
}

seed().catch(console.error)
```

### 9.3 Migration Commands

```bash
# Generate migration from schema changes
npx drizzle-kit generate

# Push migration to Neon
npx drizzle-kit push

# Run seed
npx tsx drizzle/seed.ts
```

---

## 10. Performance Strategy

### 10.1 Server-Side (Neon / API)

| Pattern | Implementation |
|---------|----------------|
| Connection pooling | `neonConfig.fetchConnectionCache = true` |
| Serverless cold start | Edge Middleware (no cold start); API routes on Vercel Functions (Node.js runtime) |
| Query N+1 prevention | All list queries use JOIN, not sequential selects |
| Heavy aggregations | Materialized views for monthly stats (refresh nightly via cron) |
| At-risk detection | Single SQL query with FILTER + LATERAL, not application-level loop |

### 10.2 Client-Side

| Pattern | Implementation |
|---------|----------------|
| Page-level streaming | `<Suspense>` boundaries with `<Skeleton>` per section |
| Chart lazy load | Charts are Client Components, rendered after RSC shell lands |
| Image optimisation | `next/image` with Vercel Blob URLs; auto WebP/AVIF |
| Font | `next/font/google` — Inter, preloaded, no layout shift |
| Bundle size | Client Components kept minimal; recharts, dnd-kit, TipTap only loaded on pages that need them |
| Cache strategy | `fetch` cache tags per model; `revalidateTag('students')` on mutation |

### 10.3 Caching Tags

| Tag | Invalidated by |
|-----|----------------|
| `students` | POST/PATCH/DELETE `/api/students` |
| `attendance` | POST `/api/attendance` |
| `hafalan` | POST `/api/hafalan` |
| `learning-reports` | POST/PATCH `/api/learning-reports` |
| `notifications` | POST `/api/notifications` |

---

## 11. AI Report Generation

```ts
// lib/ai/report-generator.ts
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export type ReportInput = {
  student_name: string
  class_name: string
  session_date: string
  attendance_status: string
  surah_latin: string
  ayah_start: number
  ayah_end: number
  hafalan_type: string    // 'hafalan_baru' | 'muraja_ah'
  hafalan_score: number
  tahsin_score: number
  adab_score: number
  makhraj: number
  tajwid: number
  kelancaran: number
  ghunnah: number
  teacher_notes: string
}

export async function generateAIReport(
  input: ReportInput
): Promise<{ reportText: string; parentAdvice: string }> {
  const prompt = `
Kamu adalah asisten guru tahfizh. Tulis laporan pembelajaran santri yang singkat, hangat, dan informatif dalam Bahasa Indonesia untuk orang tua santri.

Data sesi:
- Santri: ${input.student_name} (${input.class_name})
- Tanggal: ${input.session_date}
- Kehadiran: ${input.attendance_status}
- Hafalan: QS. ${input.surah_latin} ayat ${input.ayah_start}-${input.ayah_end} (${input.hafalan_type === 'hafalan_baru' ? 'Hafalan Baru' : "Muraja'ah"})
- Nilai Hafalan: ${input.hafalan_score}/100, Tahsin: ${input.tahsin_score}/100, Adab: ${input.adab_score}/100
- Tahsin: Makhraj ${input.makhraj}/5, Tajwid ${input.tajwid}/5, Kelancaran ${input.kelancaran}/5, Ghunnah ${input.ghunnah}/5
- Catatan guru: ${input.teacher_notes}

Balas HANYA dalam format JSON berikut (tanpa markdown):
{
  "reportText": "<2-3 paragraf narasi laporan untuk orang tua>",
  "parentAdvice": "<1 kalimat saran praktis untuk orang tua mendampingi di rumah>"
}
`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = (message.content[0] as { text: string }).text.trim()
  const parsed = JSON.parse(text)
  return { reportText: parsed.reportText, parentAdvice: parsed.parentAdvice }
}
```

---

## 12. PDF Generation

```ts
// lib/pdf/renderer.ts
// Renders the internal SSR page /internal/report-pdf/[id]
// to a PDF buffer using Puppeteer + Sparticuz Chromium.
// Called only from app/api/learning-reports/[id]/pdf/route.ts
//
// The page /internal/report-pdf/[id] is a clean SSR page
// styled for print (no nav, no sidebar) — same data, print-safe CSS.

import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'

export async function renderReportPDF(reportId: number): Promise<Buffer> {
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  })

  const page = await browser.newPage()
  const url = `${process.env.NEXT_PUBLIC_BASE_URL}/internal/report-pdf/${reportId}`
  await page.goto(url, { waitUntil: 'networkidle0' })

  const pdf = await page.pdf({
    format: 'A4',
    margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
    printBackground: true,
  })

  await browser.close()
  return Buffer.from(pdf)
}
```

---

## 13. Environment Variables

```bash
# .env.local
DATABASE_URL=postgresql://...@...neon.tech/mahabbah?sslmode=require
JWT_SECRET=<64-char random string>
ANTHROPIC_API_KEY=sk-ant-...
BLOB_READ_WRITE_TOKEN=vercel_blob_...
FIREBASE_SERVICE_ACCOUNT=<base64-encoded JSON>
NEXT_PUBLIC_BASE_URL=https://mahabbah-quran.vercel.app
```

---

## 14. Vercel Configuration

```json
// vercel.json
{
  "functions": {
    "app/api/learning-reports/[id]/pdf/route.ts": {
      "memory": 1024,
      "maxDuration": 30
    },
    "app/api/learning-reports/[id]/ai/route.ts": {
      "maxDuration": 25
    }
  },
  "crons": [
    {
      "path": "/api/cron/refresh-stats",
      "schedule": "0 1 * * *"
    }
  ]
}
```
