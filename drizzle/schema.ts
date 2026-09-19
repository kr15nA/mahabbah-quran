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
  unique,
  jsonb,
  check,
  AnyPgColumn,
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
  name: varchar('name', { length: 100 }).notNull(),
  level: varchar('level', { length: 50 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const students = pgTable('students', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  userId: bigint('user_id', { mode: 'number' }).references(() => users.id), // For optional student login
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
  
  // Capabilities
  canViewAcademic: boolean('can_view_academic').notNull().default(false),
  canViewFinance: boolean('can_view_finance').notNull().default(false),
  canReceiveNotification: boolean('can_receive_notification').notNull().default(false),
  canManageLearning: boolean('can_manage_learning').notNull().default(false),
  
  // Lifecycle
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  activePairUnq: uniqueIndex('student_parents_active_pair_unq').on(table.studentId, table.parentId).where(sql`${table.isActive} = TRUE AND ${table.deletedAt} IS NULL`),
  activePrimaryUnq: uniqueIndex('student_parents_active_primary_unq').on(table.studentId).where(sql`${table.isPrimary} = TRUE AND ${table.isActive} = TRUE AND ${table.deletedAt} IS NULL`),
}))

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
}, (table) => ({
  uniqueAttendance: unique('attendance_unique_per_day').on(table.studentId, table.attendanceDate)
}))

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
  modeCheck: check('tasmi_sessions_mode_chk', sql`${table.mode} IN ('SURAH', 'JUZ_RANGE')`),
  statusCheck: check('tasmi_sessions_status_chk', sql`${table.status} IN ('PASSED', 'NEEDS_REVIEW')`),
  modePayloadCheck: check(
    'tasmi_sessions_mode_payload_chk',
    sql`(${table.mode} = 'SURAH' AND ${table.surahId} IS NOT NULL AND ${table.startJuz} IS NULL AND ${table.endJuz} IS NULL) OR (${table.mode} = 'JUZ_RANGE' AND ${table.surahId} IS NULL AND ${table.startJuz} IS NOT NULL AND ${table.endJuz} IS NOT NULL)`
  ),
  juzBoundsCheck: check(
    'tasmi_sessions_juz_bounds_chk',
    sql`${table.mode} != 'JUZ_RANGE' OR (${table.startJuz} BETWEEN 1 AND 30 AND ${table.endJuz} BETWEEN 1 AND 30 AND ${table.startJuz} <= ${table.endJuz})`
  ),
  scoreBoundsCheck: check('tasmi_sessions_score_bounds_chk', sql`${table.score} IS NULL OR (${table.score} >= 0 AND ${table.score} <= 100)`),
  studentDateIdx: index('idx_tasmi_student_date').on(table.studentId, table.sessionDate),
  modeIdx: index('idx_tasmi_mode').on(table.mode),
}))

export const learningReports = pgTable('learning_reports', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  studentId: bigint('student_id', { mode: 'number' }).notNull().references(() => students.id),
  classId: bigint('class_id', { mode: 'number' }).references(() => classes.id, { onDelete: 'set null' }),
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

/**
 * Audit Log — append-only record of administrative mutations.
 *
 * - actor_user_id: always sourced from authenticated server session, never from client input.
 *   FK uses ON DELETE SET NULL so audit records survive actor soft/hard deletion.
 * - action: one of the typed AuditAction constants (CREATE, UPDATE, DELETE, etc.)
 * - entity_type: one of the typed AuditEntityType constants (USER, CLASS, etc.)
 * - old_values / new_values: JSONB diff; sensitive fields (password_hash, etc.) must be stripped before write.
 * - metadata: arbitrary extra context (e.g. academic_year_id, class_id) in JSONB.
 * - No updated_at — this table is strictly append-only; rows must never be updated or deleted.
 */
export const auditLogs = pgTable('audit_logs', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  actorUserId: bigint('actor_user_id', { mode: 'number' }).references(() => users.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 50 }).notNull(),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: bigint('entity_id', { mode: 'number' }),
  oldValues: jsonb('old_values'),
  newValues: jsonb('new_values'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  createdAtIdx: index('idx_audit_logs_created_at').on(table.createdAt),
  actorIdx:     index('idx_audit_logs_actor').on(table.actorUserId),
  entityIdx:    index('idx_audit_logs_entity').on(table.entityType, table.entityId),
}))


// ==========================================
// EXTENSIBLE RBAC
// ==========================================

export const roles = pgTable('roles', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(), // e.g. 'FINANCE_ADMIN'
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const permissions = pgTable('permissions', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  code: varchar('code', { length: 100 }).notNull().unique(), // e.g. 'finance.payment.manage'
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const rolePermissions = pgTable('role_permissions', {
  roleId: bigint('role_id', { mode: 'number' }).notNull().references(() => roles.id, { onDelete: 'cascade' }),
  permissionId: bigint('permission_id', { mode: 'number' }).notNull().references(() => permissions.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: uniqueIndex('idx_role_permissions_pk').on(table.roleId, table.permissionId)
}))

export const userRoles = pgTable('user_roles', {
  userId: bigint('user_id', { mode: 'number' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: bigint('role_id', { mode: 'number' }).notNull().references(() => roles.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  pk: uniqueIndex('idx_user_roles_pk').on(table.userId, table.roleId)
}))

// ==========================================
// NUMBER SEQUENCES
// ==========================================

export const financeNumberSequences = pgTable('finance_number_sequences', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  documentType: varchar('document_type', { length: 20 }).notNull(), // INV, PAY, ZIS, OUT, JRN
  year: smallint('year').notNull(),
  lastNumber: bigint('last_number', { mode: 'number' }).notNull().default(0),
}, (table) => ({
  docYearIdx: uniqueIndex('idx_finance_seq_doc_year').on(table.documentType, table.year)
}))

// ==========================================
// CORE FINANCE
// ==========================================

export const financeFunds = pgTable('finance_funds', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  fundType: varchar('fund_type', { length: 50 }).notNull(), // ACADEMIC, ZAKAT, WAKAF, etc.
  restrictionType: varchar('restriction_type', { length: 20 }).notNull(), // RESTRICTED, UNRESTRICTED
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const financeCategories = pgTable('finance_categories', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(), // INCOME, EXPENSE
  domain: varchar('domain', { length: 50 }).notNull(), // ACADEMIC, ZISWAF, OPERASIONAL
  ziswafType: varchar('ziswaf_type', { length: 50 }), // ZAKAT, INFAQ, SEDEKAH, WAKAF, DONATION, OTHER
  defaultAccountId: bigint('default_account_id', { mode: 'number' }).references((): AnyPgColumn => financeAccounts.id, { onDelete: 'restrict' }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  ziswafTypeCheck: check('finance_categories_ziswaf_type_chk', sql`${table.ziswafType} IN ('ZAKAT', 'INFAQ', 'SEDEKAH', 'WAKAF', 'DONATION', 'OTHER') OR ${table.ziswafType} IS NULL`)
}))

export const financeCategoryFunds = pgTable('finance_category_funds', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  categoryId: bigint('category_id', { mode: 'number' }).notNull().references(() => financeCategories.id, { onDelete: 'cascade' }),
  fundId: bigint('fund_id', { mode: 'number' }).notNull().references(() => financeFunds.id, { onDelete: 'cascade' }),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  catFundIdx: uniqueIndex('idx_finance_cat_fund').on(table.categoryId, table.fundId),
  singleDefaultIdx: uniqueIndex('idx_finance_cat_fund_single_default').on(table.categoryId).where(sql`${table.isDefault} = true`)
}))

export const financeAccounts = pgTable('finance_accounts', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  accountType: varchar('account_type', { length: 20 }).notNull(), // ASSET, LIABILITY, EQUITY, INCOME, EXPENSE
  assetSubtype: varchar('asset_subtype', { length: 20 }), // CASH, BANK, RECEIVABLE, OTHER_ASSET (only if accountType=ASSET)
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  assetSubtypeChk: check('finance_accounts_asset_subtype_chk', sql`${table.accountType} = 'ASSET' OR ${table.assetSubtype} IS NULL`)
}))

// ==========================================
// LEDGER
// ==========================================

export const financeJournalEntries = pgTable('finance_journal_entries', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  journalNumber: varchar('journal_number', { length: 50 }).notNull().unique(),
  transactionDate: date('transaction_date').notNull(),
  description: text('description').notNull(),
  sourceType: varchar('source_type', { length: 50 }).notNull(), // PAYMENT, DISBURSEMENT, ZISWAF_RECEIPT, REVERSAL
  sourceId: bigint('source_id', { mode: 'number' }).notNull(),
  sourceEvent: varchar('source_event', { length: 50 }).notNull(), // e.g. CONFIRM, POST
  status: varchar('status', { length: 20 }).notNull(), // POSTED, REVERSED
  createdBy: bigint('created_by', { mode: 'number' }).references(() => users.id, { onDelete: 'set null' }),
  postedBy: bigint('posted_by', { mode: 'number' }).references(() => users.id, { onDelete: 'set null' }),
  postedAt: timestamp('posted_at', { withTimezone: true }).notNull().defaultNow(),
  reversalOfId: bigint('reversal_of_id', { mode: 'number' }).references((): AnyPgColumn => financeJournalEntries.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  sourceUniqIdx: uniqueIndex('idx_finance_journal_source').on(table.sourceType, table.sourceId, table.sourceEvent),
  reversalUniqIdx: uniqueIndex('idx_finance_journal_reversal_uniq').on(table.reversalOfId).where(sql`${table.reversalOfId} IS NOT NULL`),
  statusCheck: check('finance_journal_entries_status_chk', sql`${table.status} IN ('POSTED', 'REVERSED')`),
}))

export const financeJournalLines = pgTable('finance_journal_lines', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  journalEntryId: bigint('journal_entry_id', { mode: 'number' }).notNull().references(() => financeJournalEntries.id, { onDelete: 'cascade' }),
  accountId: bigint('account_id', { mode: 'number' }).notNull().references(() => financeAccounts.id, { onDelete: 'restrict' }),
  fundId: bigint('fund_id', { mode: 'number' }).references(() => financeFunds.id, { onDelete: 'restrict' }),
  debit: bigint('debit', { mode: 'bigint' }).notNull().default(sql`0`),
  credit: bigint('credit', { mode: 'bigint' }).notNull().default(sql`0`),
  description: text('description'),
}, (table) => ({
  positiveAmounts: check('finance_journal_lines_positive_amounts_chk', sql`${table.debit} >= 0 AND ${table.credit} >= 0`),
  exclusiveAmounts: check('finance_journal_lines_exclusive_amounts_chk', sql`(${table.debit} > 0 AND ${table.credit} = 0) OR (${table.credit} > 0 AND ${table.debit} = 0)`),
}))

// ==========================================
// ACADEMIC BILLING
// ==========================================

export const financeFeeTypes = pgTable('finance_fee_types', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  defaultFundId: bigint('default_fund_id', { mode: 'number' }).references(() => financeFunds.id, { onDelete: 'set null' }),
  categoryId: bigint('category_id', { mode: 'number' }).notNull().references(() => financeCategories.id, { onDelete: 'restrict' }),
  receivableAccountId: bigint('receivable_account_id', { mode: 'number' }).notNull().references(() => financeAccounts.id, { onDelete: 'restrict' }),
  incomeAccountId: bigint('income_account_id', { mode: 'number' }).notNull().references(() => financeAccounts.id, { onDelete: 'restrict' }),
  defaultAmount: bigint('default_amount', { mode: 'bigint' }),
  billingFrequency: varchar('billing_frequency', { length: 20 }).notNull().default('ONE_TIME'), // ONE_TIME, MONTHLY, CUSTOM
  isActive: boolean('is_active').notNull().default(true),
}, (table) => ({
  freqCheck: check('finance_fee_types_freq_chk', sql`${table.billingFrequency} IN ('ONE_TIME', 'MONTHLY', 'CUSTOM')`),
  amountCheck: check('finance_fee_types_amount_chk', sql`${table.defaultAmount} > 0 OR ${table.defaultAmount} IS NULL`)
}))

export const financeInvoices = pgTable('finance_invoices', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  invoiceNumber: varchar('invoice_number', { length: 50 }).notNull().unique(),
  studentId: bigint('student_id', { mode: 'number' }).notNull().references(() => students.id, { onDelete: 'restrict' }),
  academicYearId: bigint('academic_year_id', { mode: 'number' }).notNull().references(() => academicYears.id, { onDelete: 'restrict' }),
  feeTypeId: bigint('fee_type_id', { mode: 'number' }).notNull().references(() => financeFeeTypes.id, { onDelete: 'restrict' }),
  period: varchar('period', { length: 50 }),
  description: text('description'),
  amount: bigint('amount', { mode: 'bigint' }).notNull(),
  dueDate: date('due_date').notNull(),
  issuedAt: timestamp('issued_at', { withTimezone: true }),
  status: varchar('status', { length: 20 }).notNull().default('DRAFT'), // DRAFT, ISSUED, PARTIALLY_PAID, PAID, CANCELLED
  createdBy: bigint('created_by', { mode: 'number' }).references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  amountCheck: check('finance_invoices_amount_chk', sql`${table.amount} > 0`),
  statusCheck: check('finance_invoices_status_chk', sql`${table.status} IN ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED')`),
  monthlyDuplicateIdx: uniqueIndex('idx_finance_invoices_monthly_dup').on(table.studentId, table.academicYearId, table.feeTypeId, table.period).where(sql`${table.period} IS NOT NULL`)
}))

// ==========================================
// ACADEMIC PAYMENTS
// ==========================================

export const financePayments = pgTable('finance_payments', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  paymentNumber: varchar('payment_number', { length: 50 }).notNull().unique(),
  studentId: bigint('student_id', { mode: 'number' }).notNull().references(() => students.id, { onDelete: 'restrict' }),
  amount: bigint('amount', { mode: 'bigint' }).notNull(),
  paymentDate: date('payment_date').notNull(),
  paymentMethod: varchar('payment_method', { length: 50 }).notNull(), // CASH, BANK_TRANSFER, QRIS, OTHER
  destinationAccountId: bigint('destination_account_id', { mode: 'number' }).references(() => financeAccounts.id, { onDelete: 'restrict' }),
  referenceNumber: varchar('reference_number', { length: 100 }),
  notes: text('notes'),
  status: varchar('status', { length: 20 }).notNull().default('PENDING'), // PENDING, CONFIRMED, CANCELLED, REFUNDED
  receivedBy: bigint('received_by', { mode: 'number' }).references(() => users.id, { onDelete: 'set null' }),
  confirmedBy: bigint('confirmed_by', { mode: 'number' }).references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  amountCheck: check('finance_payments_amount_chk', sql`${table.amount} > 0`),
  statusCheck: check('finance_payments_status_chk', sql`${table.status} IN ('PENDING', 'CONFIRMED', 'CANCELLED', 'REFUNDED')`),
}))

export const financePaymentAllocations = pgTable('finance_payment_allocations', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  paymentId: bigint('payment_id', { mode: 'number' }).notNull().references(() => financePayments.id, { onDelete: 'cascade' }),
  invoiceId: bigint('invoice_id', { mode: 'number' }).notNull().references(() => financeInvoices.id, { onDelete: 'cascade' }),
  allocatedAmount: bigint('allocated_amount', { mode: 'bigint' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  amountCheck: check('finance_payment_allocations_amount_chk', sql`${table.allocatedAmount} > 0`),
}))

// ==========================================
// ZISWAF
// ==========================================

export const financeParties = pgTable('finance_parties', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  address: text('address'),
  partyType: varchar('party_type', { length: 50 }).notNull(), // MUZAKKI, MUNFIQ, MUTASHADDIQ, WAKIF, DONOR, INSTITUTION, ANONYMOUS, OTHER
  userId: bigint('user_id', { mode: 'number' }).references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const financeCampaigns = pgTable('finance_campaigns', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  domain: varchar('domain', { length: 50 }).notNull(), // ZISWAF, ACADEMIC, GENERAL
  defaultFundId: bigint('default_fund_id', { mode: 'number' }).references(() => financeFunds.id, { onDelete: 'set null' }),
  startDate: date('start_date'),
  endDate: date('end_date'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const ziswafReceipts = pgTable('ziswaf_receipts', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  receiptNumber: varchar('receipt_number', { length: 50 }).notNull().unique(),
  partyId: bigint('party_id', { mode: 'number' }).references(() => financeParties.id, { onDelete: 'restrict' }), // null for anonymous
  ziswafType: varchar('ziswaf_type', { length: 50 }).notNull(), // ZAKAT, INFAQ, SEDEKAH, WAKAF, DONATION, OTHER
  categoryId: bigint('category_id', { mode: 'number' }).notNull().references(() => financeCategories.id, { onDelete: 'restrict' }),
  amount: bigint('amount', { mode: 'bigint' }).notNull(),
  receivedDate: date('received_date').notNull(),
  paymentMethod: varchar('payment_method', { length: 50 }).notNull(),
  destinationAccountId: bigint('destination_account_id', { mode: 'number' }).notNull().references(() => financeAccounts.id, { onDelete: 'restrict' }),
  referenceNumber: varchar('reference_number', { length: 100 }),
  notes: text('notes'),
  status: varchar('status', { length: 20 }).notNull().default('DRAFT'), // DRAFT, CONFIRMED, CANCELLED, REFUNDED
  receivedBy: bigint('received_by', { mode: 'number' }).references(() => users.id, { onDelete: 'set null' }),
  confirmedBy: bigint('confirmed_by', { mode: 'number' }).references(() => users.id, { onDelete: 'set null' }),
  campaignId: bigint('campaign_id', { mode: 'number' }).references(() => financeCampaigns.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  amountCheck: check('ziswaf_receipts_amount_chk', sql`${table.amount} > 0`),
  statusCheck: check('ziswaf_receipts_status_chk', sql`${table.status} IN ('DRAFT', 'CONFIRMED', 'CANCELLED', 'REFUNDED')`),
}))

export const ziswafReceiptAllocations = pgTable('ziswaf_receipt_allocations', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  receiptId: bigint('receipt_id', { mode: 'number' }).notNull().references(() => ziswafReceipts.id, { onDelete: 'cascade' }),
  fundId: bigint('fund_id', { mode: 'number' }).notNull().references(() => financeFunds.id, { onDelete: 'restrict' }),
  amount: bigint('amount', { mode: 'bigint' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  amountCheck: check('ziswaf_receipt_allocations_amount_chk', sql`${table.amount} > 0`),
}))

// ==========================================
// DISBURSEMENTS
// ==========================================

export const financeDisbursements = pgTable('finance_disbursements', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  disbursementNumber: varchar('disbursement_number', { length: 50 }).notNull().unique(),
  fundId: bigint('fund_id', { mode: 'number' }).notNull().references(() => financeFunds.id, { onDelete: 'restrict' }),
  categoryId: bigint('category_id', { mode: 'number' }).notNull().references(() => financeCategories.id, { onDelete: 'restrict' }),
  paymentAccountId: bigint('payment_account_id', { mode: 'number' }).references(() => financeAccounts.id, { onDelete: 'restrict' }),
  amount: bigint('amount', { mode: 'bigint' }).notNull(),
  transactionDate: date('transaction_date').notNull(),
  description: text('description').notNull(),
  beneficiaryName: varchar('beneficiary_name', { length: 255 }),
  status: varchar('status', { length: 50 }).notNull().default('DRAFT'), // DRAFT, PENDING_APPROVAL, APPROVED, PAID, CANCELLED
  requestedBy: bigint('requested_by', { mode: 'number' }).references(() => users.id, { onDelete: 'set null' }),
  approvedBy: bigint('approved_by', { mode: 'number' }).references(() => users.id, { onDelete: 'set null' }),
  paidBy: bigint('paid_by', { mode: 'number' }).references(() => users.id, { onDelete: 'set null' }),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  amountCheck: check('finance_disbursements_amount_chk', sql`${table.amount} > 0`),
  statusCheck: check('finance_disbursements_status_chk', sql`${table.status} IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PAID', 'CANCELLED', 'REVERSED')`),
}))
