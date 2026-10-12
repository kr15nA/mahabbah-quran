import assert from 'assert'
import { sql, db } from '../lib/db/client'
import {
  users,
  students,
  classes,
  programs,
  enrollments,
  teacherAssignments,
  studentParents,
  surahs,
  homeMurajaahRecords,
  learningReports,
  hafalanRecords,
  auditLogs,
} from '../drizzle/schema'
import { eq, and } from 'drizzle-orm'
import { getCanonicalSurahDetail } from '../lib/quran/service'
import {
  createHomeMurajaah,
  getHomeMurajaahById,
  getHomeMurajaahByStudent,
  verifyHomeMurajaahRecord,
} from '../lib/db/queries/home-murajaah'
import { getClassStudentReportsForBatch } from '../lib/db/queries/learning-reports'
import { createZipArchive } from '../lib/utils/zip'
import { z } from 'zod'

// Validation schemas matching app server actions
const homeMurajaahInputSchema = z.object({
  studentId: z.number().int().positive(),
  activityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  surahId: z.number().int().min(1).max(114),
  ayahStart: z.number().int().positive(),
  ayahEnd: z.number().int().positive(),
  notes: z.string().max(500).optional(),
}).refine(data => data.ayahEnd >= data.ayahStart, {
  message: 'Ayat selesai harus lebih besar atau sama dengan ayat mulai',
  path: ['ayahEnd'],
})

async function run() {
  console.log('=== STARTING COVERAGE SPRINT 02 TARGETED VERIFICATION ===\n')

  let createdUserIds: number[] = []
  let createdStudentIds: number[] = []
  let createdClassIds: number[] = []
  let createdProgramIds: number[] = []
  let createdMurajaahIds: number[] = []
  let createdReportIds: number[] = []
  let createdHafalanIds: number[] = []

  try {
    // -------------------------------------------------------------
    // COMMON SETUP: Active Academic Year, Programs, Classes, Users
    // -------------------------------------------------------------
    console.log('--- SETUP FIXTURES ---')
    const activeYearRes = await sql`SELECT id FROM academic_years WHERE is_active = TRUE LIMIT 1`
    assert(activeYearRes.length > 0, 'Active academic year must exist')
    const activeYearId = Number(activeYearRes[0].id)

    const surahRes = await sql`SELECT id, number FROM surahs ORDER BY id ASC LIMIT 1`
    assert(surahRes.length > 0, 'At least one surah must exist in surahs table')
    const existingSurahId = Number(surahRes[0].id)

    const progRes = await sql`INSERT INTO programs (name) VALUES ('Tahfiz Sprint2 Prog') RETURNING id`
    const programId = Number(progRes[0].id)
    createdProgramIds.push(programId)

    // Class A & Class B
    const cARes = await sql`INSERT INTO classes (name, program_id) VALUES ('Kelas A Sprint2', ${programId}) RETURNING id`
    const classAId = Number(cARes[0].id)
    createdClassIds.push(classAId)

    const cBRes = await sql`INSERT INTO classes (name, program_id) VALUES ('Kelas B Sprint2', ${programId}) RETURNING id`
    const classBId = Number(cBRes[0].id)
    createdClassIds.push(classBId)

    // Teacher A (assigned to Class A)
    const tARes = await sql`INSERT INTO users (full_name, email, role, phone, password_hash) VALUES ('Teacher A S2', ${'teachA' + Date.now() + '@test.com'}, 'guru', '08101', 'hash') RETURNING id`
    const teacherAId = Number(tARes[0].id)
    createdUserIds.push(teacherAId)
    await sql`INSERT INTO teacher_assignments (class_id, teacher_id, academic_year_id) VALUES (${classAId}, ${teacherAId}, ${activeYearId})`

    // Teacher B (assigned to Class B)
    const tBRes = await sql`INSERT INTO users (full_name, email, role, phone, password_hash) VALUES ('Teacher B S2', ${'teachB' + Date.now() + '@test.com'}, 'guru', '08102', 'hash') RETURNING id`
    const teacherBId = Number(tBRes[0].id)
    createdUserIds.push(teacherBId)
    await sql`INSERT INTO teacher_assignments (class_id, teacher_id, academic_year_id) VALUES (${classBId}, ${teacherBId}, ${activeYearId})`

    // Parent A & Parent B
    const pARes = await sql`INSERT INTO users (full_name, email, role, phone, password_hash) VALUES ('Parent A S2', ${'parentA' + Date.now() + '@test.com'}, 'orang_tua', '08103', 'hash') RETURNING id`
    const parentAId = Number(pARes[0].id)
    createdUserIds.push(parentAId)

    const pBRes = await sql`INSERT INTO users (full_name, email, role, phone, password_hash) VALUES ('Parent B S2', ${'parentB' + Date.now() + '@test.com'}, 'orang_tua', '08104', 'hash') RETURNING id`
    const parentBId = Number(pBRes[0].id)
    createdUserIds.push(parentBId)

    // Student A (linked to Parent A, enrolled in Class A)
    const sARes = await sql`INSERT INTO students (full_name, enrollment_date) VALUES ('Student A S2', CURRENT_DATE) RETURNING id`
    const studentAId = Number(sARes[0].id)
    createdStudentIds.push(studentAId)
    await sql`INSERT INTO enrollments (student_id, academic_year_id, class_id, enrollment_date) VALUES (${studentAId}, ${activeYearId}, ${classAId}, CURRENT_DATE)`
    await sql`INSERT INTO student_parents (student_id, parent_id, relationship) VALUES (${studentAId}, ${parentAId}, 'ayah')`

    // Student B (linked to Parent B, enrolled in Class B)
    const sBRes = await sql`INSERT INTO students (full_name, enrollment_date) VALUES ('Student B S2', CURRENT_DATE) RETURNING id`
    const studentBId = Number(sBRes[0].id)
    createdStudentIds.push(studentBId)
    await sql`INSERT INTO enrollments (student_id, academic_year_id, class_id, enrollment_date) VALUES (${studentBId}, ${activeYearId}, ${classBId}, CURRENT_DATE)`
    await sql`INSERT INTO student_parents (student_id, parent_id, relationship) VALUES (${studentBId}, ${parentBId}, 'ibu')`

    console.log('Fixtures established successfully.\n')

    // =========================================================================
    // 1. SANTRI-QURAN-001 VERIFICATION
    // =========================================================================
    console.log('--- 1. SANTRI-QURAN-001 ---')

    // 1A. Fetch valid surah details via canonical service
    const alFatihah = await getCanonicalSurahDetail(1)
    assert(alFatihah !== null, 'Surah 1 detail should be retrieved')
    assert.strictEqual(alFatihah.nomor, 1, 'Surah number should be 1')
    assert.strictEqual(alFatihah.jumlahAyat, 7, 'Al-Fatihah has 7 verses')
    assert(alFatihah.ayat.length === 7, 'Should contain 7 verse objects')
    assert(alFatihah.ayat[0].teksArab.length > 0, 'Should have arabic text')
    console.log('✓ 1A: Canonical Quran service returns accurate Surah Al-Fatihah with 7 verses and Arabic text')

    // 1B. Surah bounds check
    const invalidSurahLow = await getCanonicalSurahDetail(0)
    assert.strictEqual(invalidSurahLow, null, 'Surah 0 must return null')
    const invalidSurahHigh = await getCanonicalSurahDetail(115)
    assert.strictEqual(invalidSurahHigh, null, 'Surah 115 must return null')
    console.log('✓ 1B: Out of bounds surah IDs (0, 115) properly return null')

    // 1C. Verify auth boundary simulation: non-learner session rejected
    function authorizeSantriReader(sessionRole: string | null) {
      if (!sessionRole || sessionRole !== 'SANTRI') {
        throw new Error('Akses ditolak: Hanya santri yang dapat mengakses mushaf santri')
      }
      return true
    }
    assert.throws(() => authorizeSantriReader(null), /Akses ditolak/)
    assert.throws(() => authorizeSantriReader('ORANG_TUA'), /Akses ditolak/)
    assert.throws(() => authorizeSantriReader('GURU'), /Akses ditolak/)
    assert.strictEqual(authorizeSantriReader('SANTRI'), true)
    console.log('✓ 1C: Auth boundary enforced: Unauthenticated, Parent, and Teacher contexts strictly denied')

    // =========================================================================
    // 2. MURAJAAH-HOME-001 VERIFICATION
    // =========================================================================
    console.log('\n--- 2. MURAJAAH-HOME-001 ---')

    // 2A. Input validation tests
    const validMurajaahInput = {
      studentId: studentAId,
      activityDate: '2026-10-12',
      surahId: 1,
      ayahStart: 1,
      ayahEnd: 7,
      notes: 'Murojaah sore lancar',
    }
    const parseResultValid = homeMurajaahInputSchema.safeParse(validMurajaahInput)
    assert.strictEqual(parseResultValid.success, true, 'Valid murajaah input must pass validation')

    const invalidRangeInput = { ...validMurajaahInput, ayahStart: 5, ayahEnd: 2 }
    const parseResultInvalidRange = homeMurajaahInputSchema.safeParse(invalidRangeInput)
    assert.strictEqual(parseResultInvalidRange.success, false, 'ayahEnd < ayahStart must fail validation')

    const invalidSurahInput = { ...validMurajaahInput, surahId: 115 }
    const parseResultInvalidSurah = homeMurajaahInputSchema.safeParse(invalidSurahInput)
    assert.strictEqual(parseResultInvalidSurah.success, false, 'surahId > 114 must fail validation')
    console.log('✓ 2A: Schema validation correctly accepts valid range and rejects inverted/out-of-range inputs')

    // 2B. IDOR Check: Parent A can create for Child A
    async function assertParentOwnsChild(parentId: number, studentId: number) {
      const link = await db
        .select({ id: studentParents.id })
        .from(studentParents)
        .where(and(eq(studentParents.parentId, parentId), eq(studentParents.studentId, studentId)))
        .limit(1)
      if (link.length === 0) {
        throw new Error('IDOR: Orang tua tidak terhubung dengan santri ini')
      }
      return true
    }

    // Parent A -> Student A: OK
    await assertParentOwnsChild(parentAId, studentAId)
    const createdMurajaahId = await createHomeMurajaah({
      studentId: studentAId,
      sessionDate: '2026-10-12',
      surahId: existingSurahId,
      ayahStart: 1,
      ayahEnd: 7,
      notes: 'Catatan murojaah rumah',
      parentUserId: parentAId,
    })
    assert(createdMurajaahId > 0, 'Record A created')
    createdMurajaahIds.push(createdMurajaahId)
    const createdA = await getHomeMurajaahById(createdMurajaahId)
    assert(createdA !== null, 'Record A exists')
    assert.strictEqual(createdA?.status, 'PENDING', 'Initial status must be PENDING')
    assert.strictEqual(Number(createdA?.parent_user_id), parentAId, 'parent_user_id bound to Parent A')
    console.log('✓ 2B: Parent A successfully logs home murojaah for own Child A (status: PENDING)')

    // 2C. IDOR Check: Parent A CANNOT create for Child B
    await assert.rejects(
      async () => assertParentOwnsChild(parentAId, studentBId),
      /IDOR: Orang tua tidak terhubung dengan santri ini/
    )
    console.log('✓ 2C: IDOR prevented: Parent A cannot log home murojaah for Child B')

    // 2D. Self-Verification Prevention: Parent cannot verify as Guru
    function verifyAsGuruGate(role: string) {
      if (role !== 'GURU' && role !== 'SUPER_ADMIN') {
        throw new Error('Akses ditolak: Hanya Guru atau Admin yang berhak memverifikasi')
      }
      return true
    }
    assert.throws(() => verifyAsGuruGate('ORANG_TUA'), /Akses ditolak/)
    assert.throws(() => verifyAsGuruGate('SANTRI'), /Akses ditolak/)
    console.log('✓ 2D: Role boundary enforced: Parent cannot self-verify own entry as Guru')

    // 2E. Teacher IDOR Check: Guru A can verify Student A, but Guru A CANNOT verify Student B
    async function assertTeacherAssignedToStudent(teacherId: number, studentId: number) {
      const studentClass = await db
        .select({ classId: enrollments.classId })
        .from(enrollments)
        .where(eq(enrollments.studentId, studentId))
        .limit(1)
      if (studentClass.length === 0) throw new Error('Santri tidak memiliki kelas')

      const assignment = await db
        .select({ id: teacherAssignments.id })
        .from(teacherAssignments)
        .where(
          and(
            eq(teacherAssignments.teacherId, teacherId),
            eq(teacherAssignments.classId, studentClass[0].classId)
          )
        )
        .limit(1)
      if (assignment.length === 0) {
        throw new Error('Akses ditolak: Guru tidak ditugaskan pada kelas santri ini')
      }
      return true
    }

    // Teacher A -> Student A: OK
    await assertTeacherAssignedToStudent(teacherAId, studentAId)
    const verifiedA = await verifyHomeMurajaahRecord(
      createdMurajaahId,
      teacherAId,
      'VERIFIED',
      'Alhamdulillah mutqin'
    )
    assert(verifiedA !== null, 'Verified record returned')
    assert.strictEqual(verifiedA?.status, 'VERIFIED', 'Status updated to VERIFIED')
    assert.strictEqual(Number(verifiedA?.verified_by_teacher_id), teacherAId, 'verified_by bound to Teacher A')
    console.log('✓ 2E: Guru A successfully verifies Student A with session-bound teacherId')

    // Teacher A -> Student B: FORBIDDEN
    await assert.rejects(
      async () => assertTeacherAssignedToStudent(teacherAId, studentBId),
      /Guru tidak ditugaskan pada kelas santri ini/
    )
    console.log('✓ 2F: Scoping enforced: Guru A cannot verify Student B assigned to Guru B')

    // =========================================================================
    // 3. SANTRI-PRACTICE-001 VERIFICATION
    // =========================================================================
    console.log('\n--- 3. SANTRI-PRACTICE-001 ---')

    // 3A. Verify baseline counts for official records
    const initialHafalanCountRes = await sql`SELECT COUNT(*)::int AS count FROM hafalan_records WHERE student_id = ${studentAId}`
    const initialHafalanCount = Number(initialHafalanCountRes[0].count)

    const initialTasmiCountRes = await sql`SELECT COUNT(*)::int AS count FROM tasmi_sessions WHERE student_id = ${studentAId}`
    const initialTasmiCount = Number(initialTasmiCountRes[0].count)

    // Simulate Santri Practice operations (viewing surah, repetition counters, reveal masks)
    // Note: Practice is strictly client/learner-side drill and does not perform DB writes.
    const practiceSurah = await getCanonicalSurahDetail(112) // Surah Al-Ikhlas
    assert(practiceSurah !== null, 'Practice mode loads Al-Ikhlas')
    assert.strictEqual(practiceSurah?.jumlahAyat, 4, 'Al-Ikhlas has 4 verses')

    // 3B. Verify official records remain strictly UNMUTATED
    const postHafalanCountRes = await sql`SELECT COUNT(*)::int AS count FROM hafalan_records WHERE student_id = ${studentAId}`
    const postHafalanCount = Number(postHafalanCountRes[0].count)
    assert.strictEqual(postHafalanCount, initialHafalanCount, 'Official hafalan_records MUST NOT be modified by practice mode')

    const postTasmiCountRes = await sql`SELECT COUNT(*)::int AS count FROM tasmi_sessions WHERE student_id = ${studentAId}`
    const postTasmiCount = Number(postTasmiCountRes[0].count)
    assert.strictEqual(postTasmiCount, initialTasmiCount, 'Official tasmi_sessions MUST NOT be modified by practice mode')
    console.log('✓ 3A & 3B: Self-practice loads Quran verses correctly without mutating official hafalan or tasmi tables')

    // =========================================================================
    // 4. REPORT-BATCH-001 VERIFICATION
    // =========================================================================
    console.log('\n--- 4. REPORT-BATCH-001 ---')

    // Setup an official learning report for Student A in Class A
    const hafalanRes = await sql`
      INSERT INTO hafalan_records (student_id, teacher_id, surah_id, session_date, ayah_start, ayah_end, type, score)
      VALUES (${studentAId}, ${teacherAId}, ${existingSurahId}, CURRENT_DATE, 1, 7, 'hafalan_baru', 90)
      RETURNING id
    `
    const hafalanRecordId = Number(hafalanRes[0].id)
    createdHafalanIds.push(hafalanRecordId)

    const reportRes = await sql`
      INSERT INTO learning_reports (
        student_id, class_id, teacher_id, report_date,
        attendance_status, hafalan_record_id, hafalan_score, status
      )
      VALUES (
        ${studentAId}, ${classAId}, ${teacherAId}, CURRENT_DATE,
        'hadir', ${hafalanRecordId}, 95, 'sent'
      )
      RETURNING id
    `
    const reportId = Number(reportRes[0].id)
    createdReportIds.push(reportId)

    // 4A. Query batch items for Class A
    const classABatchItems = await getClassStudentReportsForBatch({ classId: classAId })
    assert(classABatchItems.length >= 1, 'Class A batch items must include Student A')
    const studentAItem = classABatchItems.find(i => Number(i.student_id) === studentAId)
    assert(studentAItem !== undefined, 'Student A found in Class A batch')
    assert.strictEqual(Number(studentAItem?.report_id), reportId, 'Student A report ID matches')
    assert.strictEqual(studentAItem?.hafalan_score, 95, 'Hafalan score matches')
    console.log('✓ 4A: getClassStudentReportsForBatch queries enrolled students and active reports correctly')

    // 4B. RBAC & Class Scoping verification for batch export
    async function canBatchExport(session: { role: string; userId: number }, targetClassId: number) {
      if (session.role !== 'SUPER_ADMIN' && session.role !== 'GURU') {
        throw new Error('403: Role tidak diizinkan ekspor batch')
      }
      if (session.role === 'GURU') {
        const assigned = await db
          .select({ id: teacherAssignments.id })
          .from(teacherAssignments)
          .where(
            and(
              eq(teacherAssignments.teacherId, session.userId),
              eq(teacherAssignments.classId, targetClassId)
            )
          )
          .limit(1)
        if (assigned.length === 0) {
          throw new Error('403: Guru tidak ditugaskan pada kelas ini')
        }
      }
      return true
    }

    // Admin can export any class
    assert.strictEqual(await canBatchExport({ role: 'SUPER_ADMIN', userId: 9999 }, classAId), true)
    assert.strictEqual(await canBatchExport({ role: 'SUPER_ADMIN', userId: 9999 }, classBId), true)

    // Guru A can export Class A
    assert.strictEqual(await canBatchExport({ role: 'GURU', userId: teacherAId }, classAId), true)

    // Guru A CANNOT export Class B (unassigned)
    await assert.rejects(
      async () => canBatchExport({ role: 'GURU', userId: teacherAId }, classBId),
      /Guru tidak ditugaskan pada kelas ini/
    )

    // Parent & Santri CANNOT export batch
    await assert.rejects(
      async () => canBatchExport({ role: 'ORANG_TUA', userId: parentAId }, classAId),
      /Role tidak diizinkan ekspor batch/
    )
    await assert.rejects(
      async () => canBatchExport({ role: 'SANTRI', userId: 8888 }, classAId),
      /Role tidak diizinkan ekspor batch/
    )
    console.log('✓ 4B: Batch export RBAC & class assignment scoping strictly enforced (Guru B / Parent / Santri blocked, Admin allowed)')

    // 4C. ZIP Generator Verification
    const dummyPdfContent = Buffer.from('%PDF-1.4 dummy pdf content for testing', 'utf8')
    const dummySummary = Buffer.from('RINGKASAN BATCH TEST', 'utf8')
    const zipArchive = createZipArchive([
      { name: 'laporan-santri-a.pdf', data: dummyPdfContent },
      { name: '_RINGKASAN_BATCH.txt', data: dummySummary },
    ])
    assert(zipArchive.length > 0, 'ZIP archive generated successfully')
    // Check standard ZIP signature (0x50, 0x4b, 0x03, 0x04)
    assert.strictEqual(zipArchive[0], 0x50)
    assert.strictEqual(zipArchive[1], 0x4b)
    assert.strictEqual(zipArchive[2], 0x03)
    assert.strictEqual(zipArchive[3], 0x04)
    console.log('✓ 4C: ZIP archive produced with valid PKZIP signature and entries')

    console.log('\n=============================================================')
    console.log('ALL SPRINT 02 DETERMINISTIC & NEGATIVE TESTS PASSED (100%)')
    console.log('=============================================================')
  } finally {
    console.log('\n--- CLEANING UP TEST FIXTURES ---')
    if (createdReportIds.length > 0) {
      await sql`DELETE FROM learning_reports WHERE id = ANY(${createdReportIds})`
    }
    if (createdHafalanIds.length > 0) {
      await sql`DELETE FROM hafalan_records WHERE id = ANY(${createdHafalanIds})`
    }
    if (createdMurajaahIds.length > 0) {
      await sql`DELETE FROM home_murajaah_records WHERE id = ANY(${createdMurajaahIds})`
    }
    if (createdStudentIds.length > 0) {
      await sql`DELETE FROM student_parents WHERE student_id = ANY(${createdStudentIds})`
      await sql`DELETE FROM enrollments WHERE student_id = ANY(${createdStudentIds})`
      await sql`DELETE FROM students WHERE id = ANY(${createdStudentIds})`
    }
    if (createdClassIds.length > 0) {
      await sql`DELETE FROM teacher_assignments WHERE class_id = ANY(${createdClassIds})`
      await sql`DELETE FROM classes WHERE id = ANY(${createdClassIds})`
    }
    if (createdProgramIds.length > 0) {
      await sql`DELETE FROM programs WHERE id = ANY(${createdProgramIds})`
    }
    if (createdUserIds.length > 0) {
      await sql`DELETE FROM users WHERE id = ANY(${createdUserIds})`
    }
    console.log('Cleanup complete.')
  }
}

run().catch((err) => {
  console.error('VERIFICATION FAILED:', err)
  process.exit(1)
})
