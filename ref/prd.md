# Product Requirements Document
## Mahabbah Qur'an — Quran Tahfizh Learning Management System
**Yayasan Rumah Tahfizh Mahabbah Qur'an Indonesia**

---

## 1. Overview

### 1.1 Product Vision
Mahabbah Qur'an is a multi-role digital platform that manages the learning journey of Quran memorization (tahfizh) students across teachers, parents, and administrators — replacing paper-based or WhatsApp-based report workflows with a structured, AI-assisted system.

### 1.2 Problem Statement
- Teachers (Guru Tahfizh) record daily hafalan progress, attendance, and tahsin scores manually with no centralised history.
- Parents receive informal or inconsistent updates about their child's progress.
- Administrators (Pembina/Admin) have no real-time visibility into class performance, attendance gaps, or low-performing students.
- Generating narrative learning reports is time-consuming for teachers.

### 1.3 Goals
| Goal | Success Metric |
|------|----------------|
| Streamline daily report input for teachers | ≤ 3 minutes per student report |
| Give parents real-time progress visibility | Parent dashboard active weekly |
| Enable admin oversight with analytics | Admin reviews AI-flagged students weekly |
| Reduce report generation effort with AI | AI report accepted with ≤ 1 edit cycle |

---

## 2. User Roles

### 2.1 Guru Tahfizh (Teacher)
Teachers handle one or more classes (kelompok). Each day they record attendance, hafalan (new memorisation or muraja'ah), tahsin scores, assessment scores, and written notes for every present student. They can generate an AI-drafted narrative report and send it to parents.

### 2.2 Orang Tua (Parent/Guardian)
Parents view their child's progress: hafalan percentage, attendance rate, average scores, and the detailed learning report sent by the teacher. They receive push notifications when a new report is published.

### 2.3 Admin / Pembina
Administrators oversee the whole institution. They manage students, teachers, programs, and classes; monitor aggregate analytics; review un-sent reports; and use an AI analysis panel to surface at-risk students.

---

## 3. Feature Scope — MVP

### 3.1 Authentication & Roles
- Login via email or phone number + password.
- Three roles: `guru`, `orang_tua`, `admin`. Role determined at account creation.
- Password reset by admin or via verified phone OTP.
- Persistent session (JWT, 30-day refresh).

### 3.2 Dashboard — Guru
- Daily summary card: total students, hadir / izin / sakit / alfa counts.
- CTA button: **Input Laporan** (primary action).
- Student list with last hafalan position, class group, and progress ring (% of Juz completed).
- Learning progress line chart: hafalan %, tahsin %, average score over the last 8 months.
- Quick stats: overall hafalan %, tahsin %, attendance %, average score.
- Recent report notification (latest report sent badge).
- Quick menu: Hafalan, Absensi, Nilai, Tahsin, Laporan, Perkembangan.

### 3.3 Input Laporan Santri
Form sections (per student per session):
1. **Kehadiran** — toggle: Hadir / Izin / Sakit / Alfa.
2. **Hafalan Baru** — Surah picker, ayah start, ayah end, type toggle: Hafalan Baru / Muraja'ah.
3. **Penilaian** — numeric input: Hafalan /100, Tahsin /100, Adab /100.
4. **Tahsin** (scale 1–5 stars each): Makhraj, Tajwid, Kelancaran, Ghunnah.
5. **Catatan Guru** — free-text, max 200 characters.
6. **AI Report** — "Buat Laporan dengan AI" button triggers AI narrative draft. Teacher can edit, regenerate, approve & send.

### 3.4 Dashboard — Orang Tua (Mobile)
- Greeting with child's photo.
- Key metrics: hafalan progress %, attendance % (this month), average score + category label.
- Progress bars per metric.
- Latest learning report card with "Baru" badge; button to view full report.
- Menu: Hafalan, Absensi, Nilai, Tahsin, Laporan, Perkembangan.
- Bottom nav: Beranda, Anak Saya, Notifikasi, Akun.

### 3.5 Detail Laporan (Parent View)
- Student info header: name, class, date, teacher name.
- Kehadiran status badge.
- Hafalan section: surah + ayat range, type (Hafalan Baru / Muraja'ah), score.
- Tahsin section: star ratings per dimension, adab score + category label.
- Teacher notes (narrative).
- Saran untuk Orang Tua (AI-generated advice for parent).
- Share button, Download PDF button.

### 3.6 Dashboard — Admin / Pembina
- Summary cards: Total Santri, Santri Aktif, Guru count, Kelas count, Kehadiran Bulan Ini %.
- Hafalan progress chart (line, monthly, overlaid by Juz group).
- Attendance bar chart (monthly).
- Laporan Guru stats: sudah dikirim, menunggu review, belum dibuat.
- **Santri Perlu Perhatian** table: name, class, issue type, status — surfaced by AI analysis.
- **Analisis dengan AI** panel: quick-question prompts answered by AI from the database.

### 3.7 Data Santri (Admin)
- Searchable, filterable table: foto, nama, program, kelas, guru, progress %, kehadiran %, status.
- Filters: Program, Kelas, Guru, Status.
- Add Student button (+ Tambah Santri).
- Paginated: 10 rows per page.

### 3.8 Notifications
- Push notification on: new learning report published, attendance marked, system announcements.
- In-app notification bell with unread count badge.

---

## 4. Feature Scope — Post-MVP

| Feature | Notes |
|---------|-------|
| Student self-service app | Santri can record own muraja'ah |
| Parent-teacher messaging | In-app chat thread per student |
| Quran audio recitation upload | Teacher attaches audio clip to session |
| Programme certificates | Auto-generated PDF on Juz completion |
| Multi-branch / multi-yayasan | Tenant-level isolation |
| Payment & SPP management | Monthly fee billing for parents |

---

## 5. Design System

| Token | Value |
|-------|-------|
| Primary Purple | `#4B21A2` |
| Light Purple | `#7B4BD6` |
| Gold / Amber | `#FBBF24` |
| Background White | `#FFFFFF` |
| Surface Grey | `#F3F4F6` |
| Text Dark | `#1F1F2E` |
| Success Green | `#16A34A` |
| Danger Red | `#DC2626` |

- Typography: Inter (UI), decorated Arabic-adjacent motifs for branding elements.
- Border radius: cards 12px, buttons 8px, chips 20px.
- Motion: subtle fade-in on report load; no decorative scroll animations.

---

## 6. User Stories (Key Flows)

### Guru — Daily Report
```
As a Guru Tahfizh,
I want to record a student's attendance, hafalan, tahsin, and scores in one form,
So that parents receive an accurate and timely learning report every session.
```
**Acceptance Criteria:**
- Form pre-fills today's date and the student's last hafalan position.
- All five sections must be completed (or kehadiran = Alfa/Izin/Sakit to skip hafalan sections).
- "Buat Laporan dengan AI" is enabled only after form is complete.
- AI draft renders in ≤ 10 seconds.
- Sending report triggers push notification to the linked parent account.

### Parent — View Progress
```
As an Orang Tua,
I want to see my child's latest learning report and overall progress,
So that I can support them at home with the right focus areas.
```
**Acceptance Criteria:**
- Dashboard loads in ≤ 2 seconds on 4G.
- Progress % matches the teacher's recorded data (no stale cache > 5 min).
- Tapping "Lihat Laporan" opens the full report with teacher notes and AI advice.

### Admin — At-Risk Detection
```
As an Admin/Pembina,
I want to see which students are flagged by the AI as needing attention,
So that I can intervene before a student falls significantly behind.
```
**Acceptance Criteria:**
- AI flags students with: attendance < 70% this month, hafalan score < 60 for 3 consecutive sessions, or no report submitted for > 7 days.
- Table shows student name, class, issue type, and recommended action.
- Admin can click through to the student's full record.

---

## 7. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| API response time (p95) | < 500 ms |
| Mobile load time (first paint) | < 2 s on 4G |
| Uptime | 99.5% monthly |
| Data residency | Indonesia (Supabase ap-southeast-1) |
| Authentication | JWT + refresh token, bcrypt passwords |
| AI report generation | Anthropic Claude API (claude-sonnet-4-6) |
| PDF generation | Server-side via Puppeteer or wkhtmltopdf |
| Push notifications | Firebase Cloud Messaging (FCM) |

---

## 8. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend (Web) | Next.js 14 (App Router) |
| Frontend (Mobile) | React Native (Expo) |
| Backend / API | Next.js API Routes or Fastify |
| Database | PostgreSQL (Supabase) |
| Auth | Supabase Auth |
| Storage | Supabase Storage (avatars, PDFs) |
| AI Reports | Anthropic Claude API |
| Push Notifications | Firebase Cloud Messaging |
| Hosting | Vercel (web), Expo EAS (mobile) |

---

## 9. Out of Scope (MVP)
- Payment processing / SPP billing
- Video streaming / recitation audio
- Multi-language (MVP is Indonesian only)
- Offline-first mobile (basic connectivity assumed)
- Custom role permissions beyond 3 fixed roles
