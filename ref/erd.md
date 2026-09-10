# Entity Relationship Document
## Mahabbah Qur'an — PostgreSQL Schema (Production-Ready)

> **Conventions**
> - All PKs: `BIGSERIAL` (auto-increment, no UUID overhead for high-write tables)
> - Enums replaced with `VARCHAR` + `CHECK` constraints (easier migrations, no ALTER TYPE lock)
> - Timestamps: `TIMESTAMPTZ` (timezone-aware)
> - Soft-delete via `deleted_at TIMESTAMPTZ NULL` on mutable domain tables
> - Index strategy: covers FKs, high-traffic WHERE / ORDER BY columns, partial indexes for common filters

---

## 1. ERD (Text Diagram)

```
users
  id ──────────────────┐
  role                 │
  full_name            │ (teacher_id, parent_id)
  ...                  │
                       │
programs               │         classes
  id ──────────┐       │           id ──────────────────┐
  name         │       └──────── teacher_id             │
               └──────────────── program_id             │
                                 ...                    │
                                                        │
students                                                │
  id ──────────┬──────────────── class_id ──────────────┘
  full_name    │
  ...          │
               │
  ┌────────────┼─────────────────────────────────────────────────────┐
  │            │                                                     │
  ▼            ▼                                                     ▼
student_parents  attendance           learning_reports
  student_id     student_id ─────────── student_id
  parent_id      teacher_id ─────────── teacher_id
  (→ users)      class_id               hafalan_record_id ──┐
                 status                 tahsin_record_id  ──┼──┐
                 ...                    ...                 │  │
                                                            │  │
surahs                    hafalan_records ◄─────────────────┘  │
  id ──────────────────── surah_id        student_id           │
  name_latin              teacher_id                           │
  total_ayahs             session_date                         │
  juz_start               type (baru/muraja)                   │
  juz_end                 score                                │
                                                               │
                          tahsin_records ◄────────────────────┘
                            student_id
                            teacher_id
                            makhraj_score … ghunnah_score

notifications
  user_id → users(id)
  reference_id (polymorphic: learning_reports / attendance)
```

---

## 2. Full DDL

```sql
-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;   -- trigram search on student names


-- ============================================================
-- TABLE: users
-- Stores all human actors: guru, orang_tua, admin.
-- role is a discriminator; no separate profile tables needed for MVP.
-- ============================================================
CREATE TABLE users (
  id                BIGSERIAL     PRIMARY KEY,
  full_name         VARCHAR(255)  NOT NULL,
  email             VARCHAR(255),
  phone             VARCHAR(20),
  password_hash     VARCHAR(255)  NOT NULL,
  role              VARCHAR(20)   NOT NULL
                      CHECK (role IN ('guru', 'orang_tua', 'admin')),
  avatar_url        TEXT,
  fcm_token         TEXT,                        -- Firebase push token
  is_active         BOOLEAN       NOT NULL DEFAULT TRUE,
  last_login_at     TIMESTAMPTZ,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,

  CONSTRAINT users_email_unique UNIQUE (email),
  CONSTRAINT users_phone_unique UNIQUE (phone),
  CONSTRAINT users_email_or_phone CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- High-traffic: login lookup
CREATE INDEX idx_users_email        ON users (email)  WHERE deleted_at IS NULL;
CREATE INDEX idx_users_phone        ON users (phone)  WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role_active  ON users (role)   WHERE is_active = TRUE AND deleted_at IS NULL;


-- ============================================================
-- TABLE: programs
-- e.g. "Tahfizh Juz 30", "Tahsin Dasar", "Tahfizh Juz 'Amma"
-- ============================================================
CREATE TABLE programs (
  id          BIGSERIAL     PRIMARY KEY,
  name        VARCHAR(100)  NOT NULL,
  description TEXT,
  is_active   BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);


-- ============================================================
-- TABLE: classes
-- One class belongs to one program and one lead teacher.
-- ============================================================
CREATE TABLE classes (
  id          BIGSERIAL     PRIMARY KEY,
  program_id  BIGINT        NOT NULL REFERENCES programs (id),
  teacher_id  BIGINT        NOT NULL REFERENCES users (id),
  name        VARCHAR(100)  NOT NULL,   -- "Kelompok A", "Kelompok B"
  level       VARCHAR(50),              -- "Juz 30", "Juz 29"
  is_active   BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_classes_teacher  ON classes (teacher_id) WHERE is_active = TRUE;
CREATE INDEX idx_classes_program  ON classes (program_id) WHERE is_active = TRUE;


-- ============================================================
-- TABLE: students (santri)
-- Core student entity. Linked to a class, optionally to a user
-- account (future: student self-service).
-- ============================================================
CREATE TABLE students (
  id              BIGSERIAL     PRIMARY KEY,
  user_id         BIGINT        REFERENCES users (id),   -- NULL until student has own login
  class_id        BIGINT        NOT NULL REFERENCES classes (id),
  full_name       VARCHAR(255)  NOT NULL,
  nickname        VARCHAR(100),
  photo_url       TEXT,
  date_of_birth   DATE,
  gender          VARCHAR(10)   CHECK (gender IN ('male', 'female')),
  enrollment_date DATE          NOT NULL,
  status          VARCHAR(20)   NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'inactive', 'graduated', 'transferred')),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

-- High-traffic: teacher loads their student list; admin searches names
CREATE INDEX idx_students_class         ON students (class_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_students_status        ON students (status)   WHERE deleted_at IS NULL;
CREATE INDEX idx_students_name_trgm     ON students USING GIN (full_name gin_trgm_ops);


-- ============================================================
-- TABLE: student_parents
-- Many-to-many: one student may have multiple parent accounts;
-- one parent may have multiple children.
-- ============================================================
CREATE TABLE student_parents (
  id              BIGSERIAL     PRIMARY KEY,
  student_id      BIGINT        NOT NULL REFERENCES students (id),
  parent_id       BIGINT        NOT NULL REFERENCES users (id),
  relationship    VARCHAR(30)   NOT NULL DEFAULT 'wali'
                    CHECK (relationship IN ('ayah', 'bunda', 'wali')),
  is_primary      BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT student_parents_unique UNIQUE (student_id, parent_id)
);

CREATE INDEX idx_student_parents_parent   ON student_parents (parent_id);
CREATE INDEX idx_student_parents_student  ON student_parents (student_id);


-- ============================================================
-- TABLE: surahs
-- Reference table for all 114 surahs.
-- Seeded once; never updated by application code.
-- ============================================================
CREATE TABLE surahs (
  id                BIGSERIAL     PRIMARY KEY,
  number            SMALLINT      NOT NULL UNIQUE,
  name_arabic       VARCHAR(100)  NOT NULL,
  name_latin        VARCHAR(100)  NOT NULL,
  name_translation  VARCHAR(150),
  total_ayahs       SMALLINT      NOT NULL,
  juz_start         SMALLINT      NOT NULL,
  juz_end           SMALLINT      NOT NULL
);

CREATE INDEX idx_surahs_juz ON surahs (juz_start, juz_end);


-- ============================================================
-- TABLE: attendance
-- One record per student per calendar date.
-- UNIQUE enforces no double-entry.
-- ============================================================
CREATE TABLE attendance (
  id              BIGSERIAL     PRIMARY KEY,
  student_id      BIGINT        NOT NULL REFERENCES students (id),
  class_id        BIGINT        NOT NULL REFERENCES classes (id),
  teacher_id      BIGINT        NOT NULL REFERENCES users (id),
  attendance_date DATE          NOT NULL,
  status          VARCHAR(10)   NOT NULL
                    CHECK (status IN ('hadir', 'izin', 'sakit', 'alfa')),
  notes           TEXT,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT attendance_unique_per_day UNIQUE (student_id, attendance_date)
);

-- Most-queried patterns:
--   "all attendance for class X in month Y"  → (class_id, attendance_date)
--   "student's attendance history"            → (student_id, attendance_date)
--   "daily roll-call for teacher"             → (teacher_id, attendance_date)
CREATE INDEX idx_attendance_class_date    ON attendance (class_id, attendance_date);
CREATE INDEX idx_attendance_student_date  ON attendance (student_id, attendance_date);
CREATE INDEX idx_attendance_teacher_date  ON attendance (teacher_id, attendance_date);
-- Partial: quick count of non-hadir for at-risk detection
CREATE INDEX idx_attendance_non_hadir     ON attendance (student_id, attendance_date)
  WHERE status IN ('izin', 'sakit', 'alfa');


-- ============================================================
-- TABLE: hafalan_records
-- One record per hafalan session (could be multiple per day if
-- student attends multiple sessions, but typically one).
-- ============================================================
CREATE TABLE hafalan_records (
  id            BIGSERIAL     PRIMARY KEY,
  student_id    BIGINT        NOT NULL REFERENCES students (id),
  teacher_id    BIGINT        NOT NULL REFERENCES users (id),
  surah_id      BIGINT        NOT NULL REFERENCES surahs (id),
  session_date  DATE          NOT NULL,
  ayah_start    SMALLINT      NOT NULL,
  ayah_end      SMALLINT      NOT NULL,
  type          VARCHAR(20)   NOT NULL
                  CHECK (type IN ('hafalan_baru', 'muraja_ah')),
  score         SMALLINT      CHECK (score BETWEEN 0 AND 100),
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT hafalan_ayah_order CHECK (ayah_end >= ayah_start)
);

CREATE INDEX idx_hafalan_student_date  ON hafalan_records (student_id, session_date);
CREATE INDEX idx_hafalan_teacher_date  ON hafalan_records (teacher_id, session_date);
CREATE INDEX idx_hafalan_surah         ON hafalan_records (surah_id);


-- ============================================================
-- TABLE: tahsin_records
-- Pronunciation / recitation quality, 4 dimensions rated 1–5.
-- ============================================================
CREATE TABLE tahsin_records (
  id                BIGSERIAL   PRIMARY KEY,
  student_id        BIGINT      NOT NULL REFERENCES students (id),
  teacher_id        BIGINT      NOT NULL REFERENCES users (id),
  session_date      DATE        NOT NULL,
  makhraj_score     SMALLINT    CHECK (makhraj_score BETWEEN 1 AND 5),
  tajwid_score      SMALLINT    CHECK (tajwid_score BETWEEN 1 AND 5),
  kelancaran_score  SMALLINT    CHECK (kelancaran_score BETWEEN 1 AND 5),
  ghunnah_score     SMALLINT    CHECK (ghunnah_score BETWEEN 1 AND 5),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tahsin_student_date ON tahsin_records (student_id, session_date);
CREATE INDEX idx_tahsin_teacher_date ON tahsin_records (teacher_id, session_date);


-- ============================================================
-- TABLE: learning_reports
-- Master record for each daily report submission.
-- Links attendance + hafalan + tahsin into one shareable unit.
-- ai_report_text is the Claude-generated narrative draft.
-- ============================================================
CREATE TABLE learning_reports (
  id                  BIGSERIAL     PRIMARY KEY,
  student_id          BIGINT        NOT NULL REFERENCES students (id),
  teacher_id          BIGINT        NOT NULL REFERENCES users (id),
  report_date         DATE          NOT NULL,
  attendance_status   VARCHAR(10)   NOT NULL
                        CHECK (attendance_status IN ('hadir', 'izin', 'sakit', 'alfa')),
  hafalan_record_id   BIGINT        REFERENCES hafalan_records (id),
  tahsin_record_id    BIGINT        REFERENCES tahsin_records (id),
  hafalan_score       SMALLINT      CHECK (hafalan_score BETWEEN 0 AND 100),
  tahsin_score        SMALLINT      CHECK (tahsin_score BETWEEN 0 AND 100),
  adab_score          SMALLINT      CHECK (adab_score BETWEEN 0 AND 100),
  teacher_notes       VARCHAR(200),
  ai_report_text      TEXT,         -- AI-generated narrative (Claude)
  ai_parent_advice    TEXT,         -- AI-generated saran untuk orang tua
  status              VARCHAR(20)   NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'sent', 'reviewed')),
  sent_to_parent_at   TIMESTAMPTZ,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- One report per student per date
  CONSTRAINT learning_reports_unique_per_day UNIQUE (student_id, report_date)
);

-- High-traffic queries:
--   teacher sees pending/sent for today          → (teacher_id, report_date)
--   parent loads child's report history          → (student_id, report_date)
--   admin reviews unsent reports                 → (status) partial
--   at-risk detection: no report > 7 days        → (student_id, report_date)
CREATE INDEX idx_lr_teacher_date   ON learning_reports (teacher_id, report_date);
CREATE INDEX idx_lr_student_date   ON learning_reports (student_id, report_date DESC);
CREATE INDEX idx_lr_status_draft   ON learning_reports (teacher_id, report_date)
  WHERE status = 'draft';
CREATE INDEX idx_lr_sent_date      ON learning_reports (student_id, sent_to_parent_at)
  WHERE status = 'sent';


-- ============================================================
-- TABLE: notifications
-- Fan-out after report is sent or attendance is marked.
-- reference_type + reference_id = soft polymorphic FK.
-- ============================================================
CREATE TABLE notifications (
  id              BIGSERIAL     PRIMARY KEY,
  user_id         BIGINT        NOT NULL REFERENCES users (id),
  title           VARCHAR(255)  NOT NULL,
  body            TEXT          NOT NULL,
  type            VARCHAR(30)   NOT NULL
                    CHECK (type IN ('report', 'attendance', 'system', 'reminder')),
  reference_type  VARCHAR(50),   -- 'learning_reports' | 'attendance'
  reference_id    BIGINT,
  is_read         BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notif_user_unread ON notifications (user_id, created_at DESC)
  WHERE is_read = FALSE;
CREATE INDEX idx_notif_user_all    ON notifications (user_id, created_at DESC);
```

---

## 3. Seed Data (Realistic — Indonesian Context)

```sql
-- ============================================================
-- SEED: programs
-- ============================================================
INSERT INTO programs (id, name, description) VALUES
  (1, 'Tahfizh Juz 30',  'Program hafalan Juz 30 (Juz ''Amma) untuk pemula'),
  (2, 'Tahfizh Juz 29',  'Program hafalan Juz 29 setelah menyelesaikan Juz 30'),
  (3, 'Tahsin Dasar',    'Program perbaikan tajwid dan makhraj sebelum hafalan'),
  (4, 'Tahfizh Full',    'Program hafalan Al-Qur''an 30 Juz');

SELECT setval('programs_id_seq', 4);


-- ============================================================
-- SEED: users (3 guru, 1 admin, 5 orang tua)
-- Password hash = bcrypt('Password123!') — replace in prod
-- ============================================================
INSERT INTO users (id, full_name, email, phone, password_hash, role, is_active) VALUES
  -- Guru
  (1,  'Ustadz Aldi Solihin',   'aldi.solihin@mahabbahquran.id',  '081234560001', '$2b$12$hashedpassword1', 'guru',      TRUE),
  (2,  'Ustadzah Siti Rahmah',  'siti.rahmah@mahabbahquran.id',   '081234560002', '$2b$12$hashedpassword2', 'guru',      TRUE),
  (3,  'Ustadz Ahmad Fauzi',    'ahmad.fauzi@mahabbahquran.id',   '081234560003', '$2b$12$hashedpassword3', 'guru',      TRUE),
  -- Admin
  (4,  'Admin Pembina',         'admin@mahabbahquran.id',          '081234560004', '$2b$12$hashedpassword4', 'admin',     TRUE),
  -- Orang Tua
  (5,  'Bapak Hendra Wijaya',   'hendra.wijaya@gmail.com',         '081234560005', '$2b$12$hashedpassword5', 'orang_tua', TRUE),
  (6,  'Ibu Nur Aini',          'nur.aini@gmail.com',              '081234560006', '$2b$12$hashedpassword6', 'orang_tua', TRUE),
  (7,  'Bapak Rizky Pratama',   'rizky.pratama@gmail.com',         '081234560007', '$2b$12$hashedpassword7', 'orang_tua', TRUE),
  (8,  'Ibu Dewi Susanti',      'dewi.susanti@gmail.com',          '081234560008', '$2b$12$hashedpassword8', 'orang_tua', TRUE),
  (9,  'Bapak Fajar Nugroho',   'fajar.nugroho@gmail.com',         '081234560009', '$2b$12$hashedpassword9', 'orang_tua', TRUE);

SELECT setval('users_id_seq', 9);


-- ============================================================
-- SEED: classes
-- ============================================================
INSERT INTO classes (id, program_id, teacher_id, name, level, is_active) VALUES
  (1, 1, 1, 'Kelompok A', 'Juz 30', TRUE),  -- Ustadz Aldi → 4 santri
  (2, 1, 2, 'Kelompok B', 'Juz 30', TRUE),  -- Ustadzah Siti → 3 santri
  (3, 2, 3, 'Kelompok C', 'Juz 29', TRUE);  -- Ustadz Fauzi → 3 santri

SELECT setval('classes_id_seq', 3);


-- ============================================================
-- SEED: students (10 santri across 3 classes)
-- ============================================================
INSERT INTO students (id, class_id, full_name, nickname, gender, date_of_birth, enrollment_date, status) VALUES
  -- Kelompok A (Ustadz Aldi)
  (1,  1, 'Ahmad Zaki Ramadhan',    'Ahmad',   'male',   '2015-03-12', '2024-01-15', 'active'),
  (2,  1, 'Fatimah Az-Zahra',       'Fatimah', 'female', '2015-07-22', '2024-01-15', 'active'),
  (3,  1, 'Yusuf Al-Amin',          'Yusuf',   'male',   '2014-11-05', '2024-01-15', 'active'),
  (4,  1, 'Aisyah Nur Hidayah',     'Aisyah',  'female', '2015-01-30', '2024-01-15', 'active'),
  -- Kelompok B (Ustadzah Siti)
  (5,  2, 'Muhammad Raihan',        'Raihan',  'male',   '2015-09-18', '2024-02-01', 'active'),
  (6,  2, 'Khadijah Putri',         'Khadijah','female', '2014-06-10', '2024-02-01', 'active'),
  (7,  2, 'Ibrahim Hasan',          'Ibrahim', 'male',   '2015-04-25', '2024-02-01', 'active'),
  -- Kelompok C (Ustadz Fauzi)
  (8,  3, 'Maryam Sholihah',        'Maryam',  'female', '2013-08-14', '2023-07-01', 'active'),
  (9,  3, 'Abdullah Syauqi',        'Abdullah','male',   '2013-12-03', '2023-07-01', 'active'),
  (10, 3, 'Fulan bin Fulan',        'Fulan',   'male',   '2014-02-28', '2024-03-10', 'active');

SELECT setval('students_id_seq', 10);


-- ============================================================
-- SEED: student_parents
-- ============================================================
INSERT INTO student_parents (student_id, parent_id, relationship, is_primary) VALUES
  (1,  5, 'ayah',  TRUE),   -- Ahmad → Bapak Hendra
  (2,  6, 'bunda', TRUE),   -- Fatimah → Ibu Nur Aini
  (3,  7, 'ayah',  TRUE),   -- Yusuf → Bapak Rizky
  (4,  8, 'bunda', TRUE),   -- Aisyah → Ibu Dewi
  (5,  9, 'ayah',  TRUE),   -- Raihan → Bapak Fajar
  (6,  6, 'bunda', FALSE);  -- Khadijah juga anak Ibu Nur Aini (kakak Fatimah)


-- ============================================================
-- SEED: surahs (sample — Juz 30, An-Naba to An-Nas)
-- Full 114 surahs should be loaded from a migration file.
-- ============================================================
INSERT INTO surahs (id, number, name_arabic, name_latin, name_translation, total_ayahs, juz_start, juz_end) VALUES
  (78,  78,  'النبأ',       'An-Naba',       'Berita Besar',        40, 30, 30),
  (79,  79,  'النازعات',    'An-Nazi''at',   'Malaikat yang Mencabut',46,30, 30),
  (80,  80,  'عبس',         'Abasa',         'Ia Bermuka Masam',     42, 30, 30),
  (81,  81,  'التكوير',     'At-Takwir',     'Penggulung',           29, 30, 30),
  (82,  82,  'الانفطار',    'Al-Infithar',   'Terbelah',             19, 30, 30),
  (83,  83,  'المطففين',    'Al-Muthaffifin','Orang-Orang yang Curang',36,30,30),
  (84,  84,  'الانشقاق',    'Al-Inshiqaq',   'Terbelahnya Langit',   25, 30, 30),
  (85,  85,  'البروج',      'Al-Buruj',      'Gugusan Bintang',      22, 30, 30),
  (86,  86,  'الطارق',      'Ath-Thariq',    'Yang Datang di Malam Hari',17,30,30),
  (87,  87,  'الأعلى',      'Al-A''la',      'Yang Paling Tinggi',   19, 30, 30),
  (88,  88,  'الغاشية',     'Al-Ghashiyah',  'Hari Pembalasan',      26, 30, 30),
  (89,  89,  'الفجر',       'Al-Fajr',       'Fajar',                30, 30, 30),
  (90,  90,  'البلد',       'Al-Balad',      'Negeri',               20, 30, 30),
  (91,  91,  'الشمس',       'Ash-Shams',     'Matahari',             15, 30, 30),
  (92,  92,  'الليل',       'Al-Lail',       'Malam',                21, 30, 30),
  (93,  93,  'الضحى',       'Adh-Dhuha',     'Waktu Dhuha',          11, 30, 30),
  (94,  94,  'الشرح',       'Al-Inshirah',   'Lapang Dada',           8, 30, 30),
  (95,  95,  'التين',       'At-Tin',        'Buah Tin',              8, 30, 30),
  (96,  96,  'العلق',       'Al-Alaq',       'Segumpal Darah',       19, 30, 30),
  (97,  97,  'القدر',       'Al-Qadr',       'Kemuliaan',             5, 30, 30),
  (98,  98,  'البينة',      'Al-Bayyinah',   'Bukti yang Nyata',      8, 30, 30),
  (99,  99,  'الزلزلة',     'Az-Zalzalah',   'Guncangan',             8, 30, 30),
  (100,100,  'العاديات',    'Al-Adiyat',     'Kuda Perang',          11, 30, 30),
  (101,101,  'القارعة',     'Al-Qari''ah',   'Hari Kiamat',          11, 30, 30),
  (102,102,  'التكاثر',     'At-Takatsur',   'Bermegah-Megahan',      8, 30, 30),
  (103,103,  'العصر',       'Al-Ashr',       'Masa',                  3, 30, 30),
  (104,104,  'الهمزة',      'Al-Humazah',    'Pengumpat',             9, 30, 30),
  (105,105,  'الفيل',       'Al-Fil',        'Gajah',                 5, 30, 30),
  (106,106,  'قريش',        'Quraisy',       'Suku Quraisy',          4, 30, 30),
  (107,107,  'الماعون',     'Al-Ma''un',     'Barang-Barang yang Berguna',7,30,30),
  (108,108,  'الكوثر',      'Al-Kautsar',    'Nikmat yang Berlimpah', 3, 30, 30),
  (109,109,  'الكافرون',    'Al-Kafirun',    'Orang-Orang Kafir',     6, 30, 30),
  (110,110,  'النصر',       'An-Nashr',      'Pertolongan',           3, 30, 30),
  (111,111,  'المسد',       'Al-Masad',      'Gejolak Api',           5, 30, 30),
  (112,112,  'الإخلاص',     'Al-Ikhlas',     'Ikhlas',                4, 30, 30),
  (113,113,  'الفلق',       'Al-Falaq',      'Waktu Subuh',           5, 30, 30),
  (114,114,  'الناس',       'An-Nas',        'Manusia',               6, 30, 30);

SELECT setval('surahs_id_seq', 114);


-- ============================================================
-- SEED: attendance (week of Sep 1–5, 2026, Kelompok A)
-- ============================================================
INSERT INTO attendance (student_id, class_id, teacher_id, attendance_date, status) VALUES
  -- 1 Sep
  (1, 1, 1, '2026-09-01', 'hadir'),
  (2, 1, 1, '2026-09-01', 'hadir'),
  (3, 1, 1, '2026-09-01', 'izin'),
  (4, 1, 1, '2026-09-01', 'hadir'),
  -- 2 Sep
  (1, 1, 1, '2026-09-02', 'hadir'),
  (2, 1, 1, '2026-09-02', 'hadir'),
  (3, 1, 1, '2026-09-02', 'hadir'),
  (4, 1, 1, '2026-09-02', 'alfa'),
  -- 3 Sep
  (1, 1, 1, '2026-09-03', 'hadir'),
  (2, 1, 1, '2026-09-03', 'sakit'),
  (3, 1, 1, '2026-09-03', 'hadir'),
  (4, 1, 1, '2026-09-03', 'hadir'),
  -- 4 Sep
  (1, 1, 1, '2026-09-04', 'hadir'),
  (2, 1, 1, '2026-09-04', 'hadir'),
  (3, 1, 1, '2026-09-04', 'hadir'),
  (4, 1, 1, '2026-09-04', 'hadir'),
  -- 5 Sep
  (1, 1, 1, '2026-09-05', 'hadir'),
  (2, 1, 1, '2026-09-05', 'hadir'),
  (3, 1, 1, '2026-09-05', 'hadir'),
  (4, 1, 1, '2026-09-05', 'izin');


-- ============================================================
-- SEED: hafalan_records (Ahmad's recent sessions)
-- ============================================================
INSERT INTO hafalan_records (id, student_id, teacher_id, surah_id, session_date, ayah_start, ayah_end, type, score) VALUES
  (1,  1, 1, 78,  '2026-09-01', 1,  10, 'hafalan_baru', 88),  -- Ahmad: An-Naba 1-10
  (2,  1, 1, 79,  '2026-09-02', 1,  10, 'muraja_ah',    85),  -- Ahmad: An-Nazi'at muraja'ah
  (3,  1, 1, 78,  '2026-09-03', 11, 20, 'hafalan_baru', 90),  -- Ahmad: An-Naba 11-20
  (4,  1, 1, 78,  '2026-09-04', 1,  10, 'hafalan_baru', 88),  -- Ahmad: An-Naba 1-10 (report day)
  -- Fatimah
  (5,  2, 1, 80,  '2026-09-01', 1,   8, 'hafalan_baru', 76),  -- Fatimah: Abasa 1-8
  (6,  2, 1, 80,  '2026-09-04', 9,  16, 'hafalan_baru', 80),
  -- Yusuf
  (7,  3, 1, 79,  '2026-09-02', 1,  15, 'hafalan_baru', 92),  -- Yusuf: An-Nazi'at 1-15
  (8,  3, 1, 79,  '2026-09-04', 16, 25, 'hafalan_baru', 88),
  -- Aisyah
  (9,  4, 1, 67,  '2026-09-01', 1,  10, 'muraja_ah',    70),  -- Aisyah: Al-Mulk (Juz 29)
  (10, 4, 1, 67,  '2026-09-04', 1,  10, 'hafalan_baru', 72);

SELECT setval('hafalan_records_id_seq', 10);


-- ============================================================
-- SEED: tahsin_records (Sep 4 session — matches the UI mockup)
-- ============================================================
INSERT INTO tahsin_records (id, student_id, teacher_id, session_date, makhraj_score, tajwid_score, kelancaran_score, ghunnah_score) VALUES
  (1, 1, 1, '2026-09-04', 4, 5, 4, 3),  -- Ahmad: Makhraj 4/5, Tajwid 5/5, Kelancaran 4/5, Ghunnah 3/5
  (2, 2, 1, '2026-09-04', 3, 4, 3, 4),  -- Fatimah
  (3, 3, 1, '2026-09-04', 5, 5, 4, 5),  -- Yusuf: high performer
  (4, 4, 1, '2026-09-04', 3, 3, 3, 2);  -- Aisyah: needs attention

SELECT setval('tahsin_records_id_seq', 4);


-- ============================================================
-- SEED: learning_reports (Sep 4, 2026 — matches UI mockup)
-- ============================================================
INSERT INTO learning_reports (
  id, student_id, teacher_id, report_date, attendance_status,
  hafalan_record_id, tahsin_record_id,
  hafalan_score, tahsin_score, adab_score,
  teacher_notes, ai_report_text, ai_parent_advice, status, sent_to_parent_at
) VALUES
(
  1, 1, 1, '2026-09-04', 'hadir',
  4, 1,
  88, 85, 90,
  'Masih perlu latihan ghunnah.',
  'Alhamdulillah, Ahmad menunjukkan perkembangan yang baik dalam hafalan Juz 30. '
  'Pada pertemuan ini, Ahmad berhasil menyetorkan QS. An-Naba ayat 1-10 dengan nilai 88/100. '
  'Bacaan masih perlu meningkatkan ketepatan ghunnah.',
  'Latihan ghunnah dan muraja''ah minimal 10 menit setiap hari.',
  'sent',
  '2026-09-04 16:30:00+07'
),
(
  2, 2, 1, '2026-09-04', 'hadir',
  6, 2,
  80, 76, 85,
  'Perlu memperbanyak muraja''ah surat sebelumnya.',
  'Fatimah telah menyetorkan QS. ''Abasa ayat 9-16. Tajwid cukup baik namun masih perlu '
  'memperkuat hafalan ayat-ayat sebelumnya agar tidak terlupakan.',
  'Bantu Fatimah muraja''ah QS. An-Naba dan An-Nazi''at setiap sore.',
  'sent',
  '2026-09-04 16:35:00+07'
),
(
  3, 3, 1, '2026-09-04', 'hadir',
  8, 3,
  88, 92, 95,
  'Yusuf sangat bersemangat. Pertahankan!',
  'MasyaAllah, Yusuf menunjukkan kemajuan yang sangat baik. Berhasil menyetorkan QS. '
  'An-Nazi''at ayat 16-25 dengan tajwid yang sangat baik. Adab dalam belajar sangat terpuji.',
  'Dukung semangat Yusuf dengan memberikan motivasi positif setiap hari.',
  'sent',
  '2026-09-04 16:38:00+07'
),
(
  4, 4, 1, '2026-09-04', 'hadir',
  10, 4,
  72, 70, 82,
  'Aisyah perlu lebih banyak latihan di rumah.',
  'Aisyah telah berusaha dengan baik, namun hafalan QS. Al-Mulk masih perlu diperkuat. '
  'Beberapa ayat masih terbata-bata dan tajwid perlu ditingkatkan terutama pada mad dan waqaf.',
  'Mohon dampingi Aisyah membaca Al-Qur''an minimal 15 menit setiap setelah sholat Maghrib.',
  'sent',
  '2026-09-04 16:42:00+07'
);

SELECT setval('learning_reports_id_seq', 4);


-- ============================================================
-- SEED: notifications
-- ============================================================
INSERT INTO notifications (user_id, title, body, type, reference_type, reference_id) VALUES
  -- Orang tua Ahmad notified
  (5, 'Laporan Pembelajaran Baru',
   'Ustadz Aldi Solihin telah mengirimkan laporan pembelajaran untuk Ahmad.',
   'report', 'learning_reports', 1),
  -- Orang tua Fatimah notified
  (6, 'Laporan Pembelajaran Baru',
   'Ustadz Aldi Solihin telah mengirimkan laporan pembelajaran untuk Fatimah.',
   'report', 'learning_reports', 2),
  -- Admin system
  (4, 'Ringkasan Hari Ini',
   '16 laporan berhasil dikirim ke orang tua hari ini. 2 laporan menunggu review.',
   'system', NULL, NULL);
```

---

## 4. Index Summary

| Index Name | Table | Columns | Type | Reason |
|---|---|---|---|---|
| `idx_users_email` | users | email | BTree (partial: deleted_at IS NULL) | Login lookup |
| `idx_users_phone` | users | phone | BTree (partial: deleted_at IS NULL) | Login via HP |
| `idx_users_role_active` | users | role | BTree (partial: active & not deleted) | Admin list teachers |
| `idx_classes_teacher` | classes | teacher_id | BTree (partial: active) | Teacher loads their classes |
| `idx_classes_program` | classes | program_id | BTree (partial: active) | Program drill-down |
| `idx_students_class` | students | class_id | BTree (partial: not deleted) | Class roster load (high freq) |
| `idx_students_status` | students | status | BTree (partial: not deleted) | Filter active students |
| `idx_students_name_trgm` | students | full_name | GIN trigram | Admin search by name |
| `idx_student_parents_parent` | student_parents | parent_id | BTree | Parent loads their children |
| `idx_student_parents_student` | student_parents | student_id | BTree | Lookup parent for notification |
| `idx_surahs_juz` | surahs | juz_start, juz_end | BTree | Filter surahs by Juz |
| `idx_attendance_class_date` | attendance | class_id, date | BTree | Roll-call for class |
| `idx_attendance_student_date` | attendance | student_id, date | BTree | Student history |
| `idx_attendance_teacher_date` | attendance | teacher_id, date | BTree | Teacher daily view |
| `idx_attendance_non_hadir` | attendance | student_id, date | Partial (non-hadir) | At-risk detection |
| `idx_hafalan_student_date` | hafalan_records | student_id, date | BTree | Student hafalan history |
| `idx_hafalan_teacher_date` | hafalan_records | teacher_id, date | BTree | Teacher's today sessions |
| `idx_hafalan_surah` | hafalan_records | surah_id | BTree | Filter by surah |
| `idx_tahsin_student_date` | tahsin_records | student_id, date | BTree | Tahsin trend chart |
| `idx_tahsin_teacher_date` | tahsin_records | teacher_id, date | BTree | Today's tahsin input |
| `idx_lr_teacher_date` | learning_reports | teacher_id, date | BTree | Teacher's report list |
| `idx_lr_student_date` | learning_reports | student_id, date DESC | BTree | Parent history (newest first) |
| `idx_lr_status_draft` | learning_reports | teacher_id, date | Partial (draft) | Unsent report badge count |
| `idx_lr_sent_date` | learning_reports | student_id, sent_at | Partial (sent) | Parent last received report |
| `idx_notif_user_unread` | notifications | user_id, created_at DESC | Partial (unread) | Notification bell count |
| `idx_notif_user_all` | notifications | user_id, created_at DESC | BTree | Notification history page |

---

## 5. FK Dependency Map

```
programs ──────────────────────────────┐
                                       ▼
users (guru) ──────────────────────► classes
                                       │
                          ┌────────────┘
                          ▼
                       students ◄─────────────── student_parents ──► users (orang_tua)
                          │
          ┌───────────────┼───────────────────┐
          ▼               ▼                   ▼
      attendance    hafalan_records      tahsin_records
       (FK: student,  (FK: student,       (FK: student,
         teacher,       teacher,            teacher)
         class)         surah)
                          │                   │
                          └─────────┬─────────┘
                                    ▼
                             learning_reports
                              (FK: student,
                                teacher,
                                hafalan_record,
                                tahsin_record)

users (any role) ◄────────── notifications
```

---

## 6. Key Design Decisions

| Decision | Rationale |
|---|---|
| `BIGSERIAL` over `UUID` | Lower storage (8 vs 16 bytes), faster BTree joins, sequential inserts are cache-friendly. UUID only needed if multi-database sync is required. |
| `VARCHAR + CHECK` over `ENUM` | Adding/removing values requires only a `CHECK` constraint change, not `ALTER TYPE` which locks the table in Postgres < 12. |
| Separate `hafalan_records` and `tahsin_records` | Normalised so each can be queried for trend analytics independently. `learning_reports` links them by FK rather than embedding JSON. |
| `UNIQUE (student_id, attendance_date)` | Prevents duplicate attendance entries at the DB level, not just application level. |
| `UNIQUE (student_id, report_date)` | One report per student per day rule enforced in DB. |
| Partial indexes on `deleted_at IS NULL` | Avoids scanning soft-deleted rows on every query; keeps indexes lean. |
| `pg_trgm` on student `full_name` | Enables `ILIKE '%Ahm%'` style search without full-text overhead — perfect for the admin search bar. |
| Polymorphic `reference_type + reference_id` in notifications | Avoids a notification FK per entity type; acceptable because notifications are append-only and never joined back to source. |
