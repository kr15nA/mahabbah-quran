import { neon } from '@neondatabase/serverless'
import bcrypt from 'bcryptjs'
import * as dotenv from 'dotenv'
import { getDatabaseUrl } from '../lib/config/env'

dotenv.config({ path: '.env.local' })
dotenv.config()

const sql = neon(getDatabaseUrl())

async function seed() {
  console.log('🌱 Starting seed process...')

  // Ensure unique indexes exist for ON CONFLICT target columns
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS student_parents_unique ON student_parents (student_id, parent_id);`
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS learning_reports_unique_per_day ON learning_reports (student_id, report_date);`

  const passwordHash = await bcrypt.hash('Password123!', 10)

  // 1. Programs
  await sql`
    INSERT INTO programs (id, name, description) VALUES
      (1, 'Tahfizh Juz 30',  'Program hafalan Juz 30 (Juz ''Amma) untuk pemula'),
      (2, 'Tahfizh Juz 29',  'Program hafalan Juz 29 setelah menyelesaikan Juz 30'),
      (3, 'Tahsin Dasar',    'Program perbaikan tajwid dan makhraj sebelum hafalan'),
      (4, 'Tahfizh Full',    'Program hafalan Al-Qur''an 30 Juz')
    ON CONFLICT (id) DO NOTHING;
  `
  await sql`SELECT setval('programs_id_seq', (SELECT MAX(id) FROM programs));`

  // 2. Users
  await sql`
    INSERT INTO users (id, full_name, email, phone, password_hash, role, is_active) VALUES
      (1,  'Ustadz Aldi Solihin',   'aldi.solihin@mahabbahquran.id',  '081234560001', ${passwordHash}, 'guru',      TRUE),
      (2,  'Ustadzah Siti Rahmah',  'siti.rahmah@mahabbahquran.id',   '081234560002', ${passwordHash}, 'guru',      TRUE),
      (3,  'Ustadz Ahmad Fauzi',    'ahmad.fauzi@mahabbahquran.id',   '081234560003', ${passwordHash}, 'guru',      TRUE),
      (4,  'Admin Pembina',         'admin@mahabbahquran.id',          '081234560004', ${passwordHash}, 'admin',     TRUE),
      (5,  'Bapak Hendra Wijaya',   'hendra.wijaya@gmail.com',         '081234560005', ${passwordHash}, 'orang_tua', TRUE),
      (6,  'Ibu Nur Aini',          'nur.aini@gmail.com',              '081234560006', ${passwordHash}, 'orang_tua', TRUE),
      (7,  'Bapak Rizky Pratama',   'rizky.pratama@gmail.com',         '081234560007', ${passwordHash}, 'orang_tua', TRUE),
      (8,  'Ibu Dewi Susanti',      'dewi.susanti@gmail.com',          '081234560008', ${passwordHash}, 'orang_tua', TRUE),
      (9,  'Bapak Fajar Nugroho',   'fajar.nugroho@gmail.com',         '081234560009', ${passwordHash}, 'orang_tua', TRUE)
    ON CONFLICT (id) DO NOTHING;
  `
  await sql`SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));`

  // 3. Classes
  await sql`
    INSERT INTO classes (id, program_id, teacher_id, name, level, is_active) VALUES
      (1, 1, 1, 'Kelompok A', 'Juz 30', TRUE),
      (2, 1, 2, 'Kelompok B', 'Juz 30', TRUE),
      (3, 2, 3, 'Kelompok C', 'Juz 29', TRUE)
    ON CONFLICT (id) DO NOTHING;
  `
  await sql`SELECT setval('classes_id_seq', (SELECT MAX(id) FROM classes));`

  // 4. Students
  await sql`
    INSERT INTO students (id, class_id, full_name, nickname, gender, date_of_birth, enrollment_date, status) VALUES
      (1,  1, 'Ahmad Zaki Ramadhan',    'Ahmad',   'male',   '2015-03-12', '2024-01-15', 'active'),
      (2,  1, 'Fatimah Az-Zahra',       'Fatimah', 'female', '2015-07-22', '2024-01-15', 'active'),
      (3,  1, 'Yusuf Al-Amin',          'Yusuf',   'male',   '2014-11-05', '2024-01-15', 'active'),
      (4,  1, 'Aisyah Nur Hidayah',     'Aisyah',  'female', '2015-01-30', '2024-01-15', 'active'),
      (5,  2, 'Muhammad Raihan',        'Raihan',  'male',   '2015-09-18', '2024-02-01', 'active'),
      (6,  2, 'Khadijah Putri',         'Khadijah','female', '2014-06-10', '2024-02-01', 'active'),
      (7,  2, 'Ibrahim Hasan',          'Ibrahim', 'male',   '2015-04-25', '2024-02-01', 'active'),
      (8,  3, 'Maryam Sholihah',        'Maryam',  'female', '2013-08-14', '2023-07-01', 'active'),
      (9,  3, 'Abdullah Syauqi',        'Abdullah','male',   '2013-12-03', '2023-07-01', 'active'),
      (10, 3, 'Fulan bin Fulan',        'Fulan',   'male',   '2014-02-28', '2024-03-10', 'active')
    ON CONFLICT (id) DO NOTHING;
  `
  await sql`SELECT setval('students_id_seq', (SELECT MAX(id) FROM students));`

  // 5. Student Parents
  await sql`
    INSERT INTO student_parents (student_id, parent_id, relationship, is_primary) VALUES
      (1,  5, 'ayah',  TRUE),
      (2,  6, 'bunda', TRUE),
      (3,  7, 'ayah',  TRUE),
      (4,  8, 'bunda', TRUE),
      (5,  9, 'ayah',  TRUE),
      (6,  6, 'bunda', FALSE)
    ON CONFLICT (student_id, parent_id) DO NOTHING;
  `

  // 6. Surahs (Juz 30 complete, 78-114)
  await sql`
    INSERT INTO surahs (id, number, name_arabic, name_latin, name_translation, total_ayahs, juz_start, juz_end) VALUES
      (67,  67,  'الملك',       'Al-Mulk',       'Kerajaan',             30, 29, 29),
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
      (114,114,  'الناس',       'An-Nas',        'Manusia',               6, 30, 30)
    ON CONFLICT (id) DO NOTHING;
  `
  await sql`SELECT setval('surahs_id_seq', (SELECT MAX(id) FROM surahs));`

  // 7. Attendance
  await sql`
    INSERT INTO attendance (student_id, class_id, teacher_id, attendance_date, status) VALUES
      (1, 1, 1, '2026-09-01', 'hadir'),
      (2, 1, 1, '2026-09-01', 'hadir'),
      (3, 1, 1, '2026-09-01', 'izin'),
      (4, 1, 1, '2026-09-01', 'hadir'),
      (1, 1, 1, '2026-09-02', 'hadir'),
      (2, 1, 1, '2026-09-02', 'hadir'),
      (3, 1, 1, '2026-09-02', 'hadir'),
      (4, 1, 1, '2026-09-02', 'alfa'),
      (1, 1, 1, '2026-09-03', 'hadir'),
      (2, 1, 1, '2026-09-03', 'sakit'),
      (3, 1, 1, '2026-09-03', 'hadir'),
      (4, 1, 1, '2026-09-03', 'hadir'),
      (1, 1, 1, '2026-09-04', 'hadir'),
      (2, 1, 1, '2026-09-04', 'hadir'),
      (3, 1, 1, '2026-09-04', 'hadir'),
      (4, 1, 1, '2026-09-04', 'hadir'),
      (1, 1, 1, '2026-09-05', 'hadir'),
      (2, 1, 1, '2026-09-05', 'hadir'),
      (3, 1, 1, '2026-09-05', 'hadir'),
      (4, 1, 1, '2026-09-05', 'izin')
    ON CONFLICT (student_id, attendance_date) DO NOTHING;
  `

  // 8. Hafalan Records
  await sql`
    INSERT INTO hafalan_records (id, student_id, teacher_id, surah_id, session_date, ayah_start, ayah_end, type, score) VALUES
      (1,  1, 1, 78,  '2026-09-01', 1,  10, 'hafalan_baru', 88),
      (2,  1, 1, 79,  '2026-09-02', 1,  10, 'muraja_ah',    85),
      (3,  1, 1, 78,  '2026-09-03', 11, 20, 'hafalan_baru', 90),
      (4,  1, 1, 78,  '2026-09-04', 1,  10, 'hafalan_baru', 88),
      (5,  2, 1, 80,  '2026-09-01', 1,   8, 'hafalan_baru', 76),
      (6,  2, 1, 80,  '2026-09-04', 9,  16, 'hafalan_baru', 80),
      (7,  3, 1, 79,  '2026-09-02', 1,  15, 'hafalan_baru', 92),
      (8,  3, 1, 79,  '2026-09-04', 16, 25, 'hafalan_baru', 88),
      (9,  4, 1, 67,  '2026-09-01', 1,  10, 'muraja_ah',    70),
      (10, 4, 1, 67,  '2026-09-04', 1,  10, 'hafalan_baru', 72)
    ON CONFLICT (id) DO NOTHING;
  `
  await sql`SELECT setval('hafalan_records_id_seq', (SELECT MAX(id) FROM hafalan_records));`

  // 9. Tahsin Records
  await sql`
    INSERT INTO tahsin_records (id, student_id, teacher_id, session_date, makhraj_score, tajwid_score, kelancaran_score, ghunnah_score) VALUES
      (1, 1, 1, '2026-09-04', 4, 5, 4, 3),
      (2, 2, 1, '2026-09-04', 3, 4, 3, 4),
      (3, 3, 1, '2026-09-04', 5, 5, 4, 5),
      (4, 4, 1, '2026-09-04', 3, 3, 3, 2)
    ON CONFLICT (id) DO NOTHING;
  `
  await sql`SELECT setval('tahsin_records_id_seq', (SELECT MAX(id) FROM tahsin_records));`

  // 10. Learning Reports
  await sql`
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
      'Alhamdulillah, Ahmad menunjukkan perkembangan yang baik dalam hafalan Juz 30. Pada pertemuan ini, Ahmad berhasil menyetorkan QS. An-Naba ayat 1-10 dengan nilai 88/100.',
      'Latihan ghunnah dan muraja''ah minimal 10 menit setiap hari.',
      'sent',
      '2026-09-04 16:30:00+07'
    ),
    (
      2, 2, 1, '2026-09-04', 'hadir',
      6, 2,
      80, 76, 85,
      'Perlu memperbanyak muraja''ah surat sebelumnya.',
      'Fatimah telah menyetorkan QS. ''Abasa ayat 9-16. Tajwid cukup baik namun masih perlu memperkuat hafalan ayat-ayat sebelumnya.',
      'Bantu Fatimah muraja''ah QS. An-Naba dan An-Nazi''at setiap sore.',
      'sent',
      '2026-09-04 16:35:00+07'
    ),
    (
      3, 3, 1, '2026-09-04', 'hadir',
      8, 3,
      88, 92, 95,
      'Yusuf sangat bersemangat. Pertahankan!',
      'MasyaAllah, Yusuf menunjukkan kemajuan yang sangat baik. Berhasil menyetorkan QS. An-Nazi''at ayat 16-25 dengan tajwid yang sangat baik.',
      'Dukung semangat Yusuf dengan memberikan motivasi positif setiap hari.',
      'sent',
      '2026-09-04 16:38:00+07'
    ),
    (
      4, 4, 1, '2026-09-04', 'hadir',
      10, 4,
      72, 70, 82,
      'Aisyah perlu lebih banyak latihan di rumah.',
      'Aisyah telah berusaha dengan baik, namun hafalan QS. Al-Mulk masih perlu diperkuat. Beberapa ayat masih terbata-bata.',
      'Mohon dampingi Aisyah membaca Al-Qur''an minimal 15 menit setiap setelah sholat Maghrib.',
      'sent',
      '2026-09-04 16:42:00+07'
    )
    ON CONFLICT (id) DO NOTHING;
  `
  await sql`SELECT setval('learning_reports_id_seq', (SELECT MAX(id) FROM learning_reports));`

  // 11. Notifications
  await sql`
    INSERT INTO notifications (id, user_id, title, body, type, reference_type, reference_id) VALUES
      (1, 5, 'Laporan Pembelajaran Baru', 'Ustadz Aldi Solihin telah mengirimkan laporan pembelajaran untuk Ahmad.', 'report', 'learning_reports', 1),
      (2, 6, 'Laporan Pembelajaran Baru', 'Ustadz Aldi Solihin telah mengirimkan laporan pembelajaran untuk Fatimah.', 'report', 'learning_reports', 2),
      (3, 4, 'Ringkasan Hari Ini', '16 laporan berhasil dikirim ke orang tua hari ini. 2 laporan menunggu review.', 'system', NULL, NULL)
    ON CONFLICT (id) DO NOTHING;
  `
  await sql`SELECT setval('notifications_id_seq', (SELECT MAX(id) FROM notifications));`

  // 12. Permissions
  await sql`
    INSERT INTO permissions (code, name) VALUES
      ('finance.payment.view', 'View Payments'),
      ('finance.payment.manage', 'Manage Payments'),
      ('finance.payment.refund', 'Refund Payments'),
      ('finance.ziswaf.view', 'View ZISWAF Receipts'),
      ('finance.ziswaf.manage', 'Manage ZISWAF Receipts'),
      ('finance.ziswaf.refund', 'Refund ZISWAF Receipts'),
      ('academic.tasmi.read', 'Read Tasmi'),
      ('academic.tasmi.manage', 'Manage Tasmi')
    ON CONFLICT (code) DO NOTHING;
  `

  console.log('✅ Database seeding completed successfully!')
}

seed().catch(err => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
