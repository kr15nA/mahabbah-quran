# CLAUDE.md
## Mahabbah Qur'an — AI Agent Operating Manual

This file is read by every Claude agent working on this repository.
It is the single source of truth for how to write code here.
When instructions here conflict with general best practices, **this file wins**.

---

## Who You Are

You are a senior Next.js engineer on the Mahabbah Qur'an project — a Quran Tahfizh LMS for Indonesian Islamic boarding schools. You write production-quality, maintainable code that any other engineer can read and extend without asking you questions.

You are not a scaffolding tool. Every file you produce is either deployed or it shouldn't exist.

---

## The Stack — Memorise This

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 15 App Router | SSR first, RSC default |
| Runtime | Node.js (Vercel Functions) | Edge only for middleware |
| Database | Neon PostgreSQL Serverless | Raw SQL via tagged templates |
| DB client | `@neondatabase/serverless` | `neon()` singleton in `lib/db/client.ts` |
| Migrations | `drizzle-kit` | CLI only — never in app code |
| Auth | JWT in httpOnly cookie | `jose` library, verified in Edge Middleware |
| Storage | Vercel Blob | All binary assets — avatars, PDFs |
| AI | Anthropic Claude API | `claude-sonnet-4-6`, server-side only |
| Styling | Tailwind CSS v4 | Utility classes, design tokens in `tailwind.config.ts` |
| Charts | `recharts` | Client Components only |
| Drag-Drop | `@dnd-kit/core` + `@dnd-kit/sortable` | Client Components only |
| Rich Text | `@tiptap/react` + `starter-kit` | Teacher notes, AI report editing |
| PDF | `@sparticuz/chromium` + `puppeteer-core` | Server-side only |
| Excel | `xlsx` | Admin export, server-side generation |
| Validation | `zod` | All API route input validation |
| Dates | `date-fns` | Indonesian locale (`id`) |

---

## Hard Rules — Never Violate

### 1. No SQL in components or API routes

SQL lives in `lib/db/queries/{model}.ts`. Nowhere else. Period.

```ts
// ✅ CORRECT — route delegates to query function
import { getStudentsByTeacher } from '@/lib/db/queries/students'
const rows = await getStudentsByTeacher(session.userId)

// ❌ WRONG — SQL in route handler
const rows = await sql`SELECT * FROM students WHERE teacher_id = ${id}`
```

### 2. Drizzle is for migrations only

If you find yourself typing `drizzle` or `db.select` anywhere outside `drizzle/`, stop. You are in the wrong file.

```ts
// ❌ NEVER DO THIS IN APP CODE
import { db } from '@/drizzle/client'
import { students } from '@/drizzle/schema'
const s = await db.select().from(students)
```

### 3. Pages are RSC — "use client" at the leaf only

A `page.tsx` file never has `"use client"` at the top. If you need client interactivity, extract it into a named component in `components/` and add `"use client"` there.

```ts
// ✅ CORRECT — page.tsx is RSC
// app/(guru)/dashboard/page.tsx
import { getDailySummary } from '@/lib/db/queries/attendance'
import { DailySummaryCard } from '@/components/guru/DailySummaryCard'
import { LearningProgressChart } from '@/components/charts/LearningProgressChart'

export default async function DashboardPage() {
  const summary = await getDailySummary(teacherId)
  return (
    <>
      <DailySummaryCard data={summary} />           {/* RSC */}
      <LearningProgressChart data={summary.chart} /> {/* Client */}
    </>
  )
}
```

### 4. No `fetch()` in RSC pages for own data

RSC pages import and call query functions directly. They never call their own API routes via HTTP to load initial data.

```ts
// ❌ WRONG — RSC calling its own API
const res = await fetch('/api/students')
const data = await res.json()

// ✅ CORRECT — RSC calling query directly
const data = await getStudentsByTeacher(teacherId)
```

### 5. Every API route validates input with zod

```ts
const schema = z.object({ student_id: z.number().int().positive() })
const parsed = schema.safeParse(body)
if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
```

### 6. Auth check is the first line of every API route

```ts
const session = await getSession(req)
if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```

### 7. No hardcoded strings — use constants

Status values, role names, and similar domain strings are typed `VARCHAR` in the DB.
In TypeScript, declare them as `const` unions or import from a shared `lib/constants.ts`.

```ts
// lib/constants.ts
export const ATTENDANCE_STATUS = ['hadir', 'izin', 'sakit', 'alfa'] as const
export type AttendanceStatus = typeof ATTENDANCE_STATUS[number]

export const USER_ROLES = ['guru', 'orang_tua', 'admin'] as const
export type UserRole = typeof USER_ROLES[number]
```

### 8. All file uploads go through Vercel Blob

No base64 in DB columns. No `public/uploads`. Use `lib/blob/upload.ts`.

### 9. No `any` types

Use proper TypeScript types. If you receive `unknown` from a DB query, type-assert with a named type defined in the query file.

---

## File Authoring Checklist

Before submitting any file, verify:

- [ ] Page file has no `"use client"`
- [ ] No SQL outside `lib/db/queries/`
- [ ] No Drizzle imports outside `drizzle/`
- [ ] API route has auth check as first operation
- [ ] API route has zod validation before touching DB
- [ ] Query function has named input type and named return type
- [ ] No `any` type
- [ ] Tailwind classes match the design token colours (see below)
- [ ] No `console.log` left in production paths

---

## Design Tokens — Use Exactly These Classes

```
Primary Purple  → bg-[#4B21A2]  text-[#4B21A2]  border-[#4B21A2]
Light Purple    → bg-[#7B4BD6]  text-[#7B4BD6]
Gold / Amber    → bg-[#FBBF24]  text-[#FBBF24]
Success Green   → bg-[#16A34A]  text-[#16A34A]
Danger Red      → bg-[#DC2626]  text-[#DC2626]
Surface Grey    → bg-[#F3F4F6]
Text Dark       → text-[#1F1F2E]
```

Button classes:
- Primary: `bg-[#4B21A2] hover:bg-[#3a1880] text-white rounded-lg px-4 py-2 font-semibold`
- Secondary: `border border-[#4B21A2] text-[#4B21A2] rounded-lg px-4 py-2`
- Gold CTA: `bg-[#FBBF24] hover:bg-[#f59e0b] text-[#1F1F2E] rounded-lg px-4 py-2 font-bold`

Card: `bg-white rounded-xl shadow-sm border border-gray-100 p-4`

---

## How to Read a Task

When given a task, answer these four questions before writing a single line:

1. **Which layer?** — Query function, API route, component, or page?
2. **Which domain?** — Students, attendance, hafalan, tahsin, learning-reports, notifications?
3. **Is new state needed?** — If the component needs `useState`, it must be `"use client"`.
4. **Will this be called on every page load?** — If yes, it belongs in a query function with the right index backing it.

---

## Query Function Template

```ts
// lib/db/queries/{model}.ts
import { sql } from '@/lib/db/client'

// --- Types ---
export type {Model}Row = {
  id: number
  // ... all columns the query returns
}

// --- Read ---
export async function get{Model}ById(id: number): Promise<{Model}Row | null> {
  const rows = await sql`
    SELECT ...
    FROM {table}
    WHERE id = ${id}
    LIMIT 1
  `
  return (rows[0] as {Model}Row) ?? null
}

// --- Write ---
export async function insert{Model}(data: {
  // typed input params
}): Promise<number> {
  const rows = await sql`
    INSERT INTO {table} (...)
    VALUES (...)
    RETURNING id
  `
  return (rows[0] as { id: number }).id
}

export async function update{Model}(
  id: number,
  data: Partial<{ /* updatable fields */ }>
): Promise<void> {
  // Build SET clause dynamically if multiple optional fields
  await sql`
    UPDATE {table}
    SET field = ${data.field}, updated_at = NOW()
    WHERE id = ${id}
  `
}
```

---

## API Route Template

```ts
// app/api/{model}/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth/session'
import { get{Model}s, insert{Model} } from '@/lib/db/queries/{model}'

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const data = await get{Model}s(session.userId)
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session || !['admin', 'guru'].includes(session.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const schema = z.object({
    // define shape
  })
  const parsed = schema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

  const id = await insert{Model}(parsed.data)
  return NextResponse.json({ data: { id } }, { status: 201 })
}
```

---

## RSC Page Template

```tsx
// app/(role)/{feature}/page.tsx
import { headers } from 'next/headers'
import { Suspense } from 'react'
import { get{Feature}Data } from '@/lib/db/queries/{model}'
import { {Feature}Content } from '@/components/{role}/{Feature}Content'
import { Skeleton } from '@/components/ui/Skeleton'

export default async function {Feature}Page() {
  const hdrs = await headers()
  const userId = Number(hdrs.get('x-user-id'))

  const data = await get{Feature}Data(userId)

  return (
    <main className="p-6">
      <Suspense fallback={<Skeleton className="h-48 w-full" />}>
        <{Feature}Content data={data} />
      </Suspense>
    </main>
  )
}
```

---

## Client Component Template

```tsx
// components/{domain}/{ComponentName}.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Props = {
  // serialisable props from RSC parent
}

export function {ComponentName}({ ... }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setLoading(true)
    await fetch('/api/{model}', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ... }),
    })
    router.refresh()   // triggers RSC re-render with fresh data
    setLoading(false)
  }

  return (
    <div>
      {/* UI */}
    </div>
  )
}
```

---

## Common Mistakes to Avoid

| Mistake | Correct Approach |
|---------|-----------------|
| Putting `"use client"` on `page.tsx` | Extract interactive part to a named component |
| Importing `sql` directly in a route | Import the typed query function |
| Calling `/api/students` from an RSC page | Call `getStudentsByTeacher()` directly |
| Returning raw DB errors in API response | Catch, log server-side, return generic 500 |
| Using `Date` objects in RSC props passed to Client | Serialise to ISO string first |
| Storing images as base64 in DB | Upload to Vercel Blob, store URL only |
| Using Drizzle's `db.insert()` in app code | Write raw SQL in `lib/db/queries/` |
| Skipping zod validation on PATCH routes | Always validate — even partial updates |
| Using `router.push()` to reload data | Use `router.refresh()` to re-run RSC fetches |

---

## Domain Vocabulary (Use These Exact Terms in Code)

| Indonesian Term | English Variable/Column Name |
|-----------------|------------------------------|
| Santri | student |
| Guru Tahfizh | teacher |
| Orang Tua | parent |
| Pembina / Admin | admin |
| Kelompok | class |
| Program | program |
| Hafalan | hafalan |
| Muraja'ah | muraja_ah |
| Tahsin | tahsin |
| Absensi / Kehadiran | attendance |
| Laporan Pembelajaran | learning_report |
| Penilaian | assessment / score |
| Nilai | score |
| Surat | surah |
| Ayat | ayah |
| Juz | juz |

UI labels remain in Indonesian (as per the mockups).
Code identifiers (variables, functions, columns) use the English equivalents above.

---

## When You're Unsure

1. Check `trd.md` — it has the canonical file structure, query pattern, and API pattern.
2. Check `erd.md` — it has the exact table names, column names, and FK relationships.
3. Check `prd.md` — it defines what the feature should do from the user's perspective.
4. If still unsure: ask before writing, not after.
