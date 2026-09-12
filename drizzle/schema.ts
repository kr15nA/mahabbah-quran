import {
  pgTable,
  bigserial,
  bigint,
  varchar,
  text,
  boolean,
  date,
  timestamp,
  smallint,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const users = pgTable('users', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: varchar('role', { length: 20 }).notNull(), // 'guru' | 'orang_tua' | 'admin'
  avatarUrl: text('avatar_url'),
  fcmToken: text('fcm_token'),
  isActive: boolean('is_active').notNull().default(true),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

export const programs = pgTable('programs', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const classes = pgTable('classes', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  programId: bigint('program_id', { mode: 'number' }).notNull().references(() => programs.id),
  teacherId: bigint('teacher_id', { mode: 'number' }).notNull().references(() => users.id),
  name: varchar('name', { length: 100 }).notNull(),
  level: varchar('level', { length: 50 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const students = pgTable('students', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  userId: bigint('user_id', { mode: 'number' }).references(() => users.id),
  classId: bigint('class_id', { mode: 'number' }).notNull().references(() => classes.id),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  nickname: varchar('nickname', { length: 100 }),
  photoUrl: text('photo_url'),
  dateOfBirth: date('date_of_birth'),
  gender: varchar('gender', { length: 10 }),
  enrollmentDate: date('enrollment_date').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

export const studentParents = pgTable('student_parents', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  studentId: bigint('student_id', { mode: 'number' }).notNull().references(() => students.id),
  parentId: bigint('parent_id', { mode: 'number' }).notNull().references(() => users.id),
  relationship: varchar('relationship', { length: 30 }).notNull().default('wali'),
  isPrimary: boolean('is_primary').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const surahs = pgTable('surahs', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  number: smallint('number').notNull().unique(),
  nameArabic: varchar('name_arabic', { length: 100 }).notNull(),
  nameLatin: varchar('name_latin', { length: 100 }).notNull(),
  nameTranslation: varchar('name_translation', { length: 150 }),
  totalAyahs: smallint('total_ayahs').notNull(),
  juzStart: smallint('juz_start').notNull(),
  juzEnd: smallint('juz_end').notNull(),
})

export const attendance = pgTable('attendance', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  studentId: bigint('student_id', { mode: 'number' }).notNull().references(() => students.id),
  classId: bigint('class_id', { mode: 'number' }).notNull().references(() => classes.id),
  teacherId: bigint('teacher_id', { mode: 'number' }).notNull().references(() => users.id),
  attendanceDate: date('attendance_date').notNull(),
  status: varchar('status', { length: 10 }).notNull(), // 'hadir' | 'izin' | 'sakit' | 'alfa'
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const hafalanRecords = pgTable('hafalan_records', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  studentId: bigint('student_id', { mode: 'number' }).notNull().references(() => students.id),
  teacherId: bigint('teacher_id', { mode: 'number' }).notNull().references(() => users.id),
  surahId: bigint('surah_id', { mode: 'number' }).notNull().references(() => surahs.id),
  sessionDate: date('session_date').notNull(),
  ayahStart: smallint('ayah_start').notNull(),
  ayahEnd: smallint('ayah_end').notNull(),
  type: varchar('type', { length: 20 }).notNull(), // 'hafalan_baru' | 'muraja_ah'
  score: smallint('score'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const tahsinRecords = pgTable('tahsin_records', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  studentId: bigint('student_id', { mode: 'number' }).notNull().references(() => students.id),
  teacherId: bigint('teacher_id', { mode: 'number' }).notNull().references(() => users.id),
  sessionDate: date('session_date').notNull(),
  makhrajScore: smallint('makhraj_score'),
  tajwidScore: smallint('tajwid_score'),
  kelancaranScore: smallint('kelancaran_score'),
  ghunnahScore: smallint('ghunnah_score'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const learningReports = pgTable('learning_reports', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  studentId: bigint('student_id', { mode: 'number' }).notNull().references(() => students.id),
  teacherId: bigint('teacher_id', { mode: 'number' }).notNull().references(() => users.id),
  reportDate: date('report_date').notNull(),
  attendanceStatus: varchar('attendance_status', { length: 10 }).notNull(),
  hafalanRecordId: bigint('hafalan_record_id', { mode: 'number' }).references(() => hafalanRecords.id),
  tahsinRecordId: bigint('tahsin_record_id', { mode: 'number' }).references(() => tahsinRecords.id),
  hafalanScore: smallint('hafalan_score'),
  tahsinScore: smallint('tahsin_score'),
  adabScore: smallint('adab_score'),
  teacherNotes: varchar('teacher_notes', { length: 200 }),
  aiReportText: text('ai_report_text'),
  aiParentAdvice: text('ai_parent_advice'),
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  sentToParentAt: timestamp('sent_to_parent_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const notifications = pgTable('notifications', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  userId: bigint('user_id', { mode: 'number' }).notNull().references(() => users.id),
  title: varchar('title', { length: 255 }).notNull(),
  body: text('body').notNull(),
  type: varchar('type', { length: 30 }).notNull(),
  referenceType: varchar('reference_type', { length: 50 }),
  referenceId: bigint('reference_id', { mode: 'number' }),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const reportShares = pgTable('report_shares', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  reportId: bigint('report_id', { mode: 'number' }).notNull().references(() => learningReports.id, { onDelete: 'cascade' }),
  creatorId: bigint('creator_id', { mode: 'number' }).notNull().references(() => users.id, { onDelete: 'restrict' }),
  tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  lastAccessedAt: timestamp('last_accessed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  tokenHashIdx: index('idx_report_shares_token_hash').on(table.tokenHash)
}))

export const academicYears = pgTable('academic_years', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(), // e.g., "2026/2027"
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  isActive: boolean('is_active').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  activeYearIdx: uniqueIndex('idx_active_academic_year').on(table.isActive).where(sql`is_active = true`)
}))

export const enrollments = pgTable('enrollments', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  studentId: bigint('student_id', { mode: 'number' }).notNull().references(() => students.id),
  academicYearId: bigint('academic_year_id', { mode: 'number' }).notNull().references(() => academicYears.id),
  classId: bigint('class_id', { mode: 'number' }).notNull().references(() => classes.id),
  enrollmentDate: date('enrollment_date').notNull().defaultNow(),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  studentYearIdx: uniqueIndex('idx_enrollments_student_year').on(table.studentId, table.academicYearId)
}))

export const teacherAssignments = pgTable('teacher_assignments', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  academicYearId: bigint('academic_year_id', { mode: 'number' }).notNull().references(() => academicYears.id),
  classId: bigint('class_id', { mode: 'number' }).notNull().references(() => classes.id),
  teacherId: bigint('teacher_id', { mode: 'number' }).notNull().references(() => users.id),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  yearClassIdx: uniqueIndex('idx_teacher_assignments_year_class').on(table.academicYearId, table.classId)
}))
