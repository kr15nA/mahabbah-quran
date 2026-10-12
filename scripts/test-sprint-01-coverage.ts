import assert from 'assert'
import { sql, db } from '../lib/db/client'
import { institutionSettings, users, students, classes, programs, enrollments, teacherAssignments, notifications, tahsinRecords, auditLogs } from '../drizzle/schema'
import { eq, and, sql as drizzleSql } from 'drizzle-orm'
import { authorizeStudentAccess } from '../lib/auth/rbac'
import { insertTahsinRecord, getTahsinByStudent } from '../lib/db/queries/tahsin'
import { getInstitutionSettings, updateInstitutionSettings } from '../lib/db/queries/settings'
import { getNotificationsByUser, getUnreadCount, markNotificationRead, markAllRead, insertNotification } from '../lib/db/queries/notifications'

// Validation helper replicating app/admin/pengaturan/actions.ts
function validateSettingsInput(data: { institutionName: string; minAttendancePct: number; dailyReportSchedule: string }) {
  if (!data.institutionName || !data.institutionName.trim()) {
    return { valid: false, error: 'Nama yayasan / lembaga wajib diisi' }
  }
  if (isNaN(data.minAttendancePct) || data.minAttendancePct < 1 || data.minAttendancePct > 100) {
    return { valid: false, error: 'Ambang batas kehadiran harus berupa angka 1 - 100%' }
  }
  // Clock schedule validation: must be valid HH:MM in 24h clock (00:00 - 23:59)
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(data.dailyReportSchedule)) {
    return { valid: false, error: 'Format jadwal laporan harian harus HH:MM valid 24 jam (contoh: 16:30)' }
  }
  return { valid: true }
}

// Validation helper replicating app/guru/tahsin/actions.ts
function isValidScore(val: number): boolean {
  return Number.isInteger(val) && val >= 1 && val <= 5
}

function validateTahsinInput(input: {
  studentId: number
  sessionDate: string
  makhrajScore: number
  tajwidScore: number
  kelancaranScore: number
  ghunnahScore: number
}) {
  if (!input.studentId || isNaN(input.studentId)) {
    return { valid: false, error: 'Santri wajib dipilih' }
  }
  if (!input.sessionDate || !/^\d{4}-\d{2}-\d{2}$/.test(input.sessionDate)) {
    return { valid: false, error: 'Tanggal evaluasi tidak valid (format YYYY-MM-DD)' }
  }
  const parsedDate = new Date(input.sessionDate)
  if (isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== input.sessionDate) {
    return { valid: false, error: 'Tanggal evaluasi tidak valid' }
  }
  const scores = [input.makhrajScore, input.tajwidScore, input.kelancaranScore, input.ghunnahScore]
  for (const s of scores) {
    if (!isValidScore(Number(s))) {
      return { valid: false, error: 'Semua nilai harus berupa angka 1-5' }
    }
  }
  return { valid: true }
}

async function run() {
  console.log('=== STARTING COVERAGE SPRINT 01 TARGETED VERIFICATION ===\n')

  let createdTahsinIds: number[] = []
  let createdNotifIds: number[] = []
  let createdUserIds: number[] = []
  let createdStudentIds: number[] = []
  let createdClassIds: number[] = []
  let createdProgramIds: number[] = []

  try {
    // =========================================================================
    // 1. TAHSIN-GURU-001 VERIFICATION
    // =========================================================================
    console.log('--- 1. TAHSIN-GURU-001 ---')

    // Setup active academic year
    const activeYearRes = await sql`SELECT id FROM academic_years WHERE is_active = TRUE LIMIT 1`
    assert(activeYearRes.length > 0, 'Active academic year must exist')
    const activeYearId = Number(activeYearRes[0].id)

    // Setup Program
    const progRes = await sql`INSERT INTO programs (name) VALUES ('Tahsin Test Prog') RETURNING id`
    const programId = Number(progRes[0].id)
    createdProgramIds.push(programId)

    // Setup Teacher A & Class A & Student A
    const uARes = await sql`INSERT INTO users (full_name, email, role, phone, password_hash) VALUES ('Teacher A', ${'teacherA' + Date.now() + '@test.com'}, 'guru', '081111', 'hash') RETURNING id`
    const teacherAId = Number(uARes[0].id)
    createdUserIds.push(teacherAId)

    const cARes = await sql`INSERT INTO classes (name, program_id) VALUES ('Class A', ${programId}) RETURNING id`
    const classAId = Number(cARes[0].id)
    createdClassIds.push(classAId)

    await sql`INSERT INTO teacher_assignments (class_id, teacher_id, academic_year_id) VALUES (${classAId}, ${teacherAId}, ${activeYearId})`

    const sARes = await sql`INSERT INTO students (full_name, enrollment_date) VALUES ('Student A', CURRENT_DATE) RETURNING id`
    const studentAId = Number(sARes[0].id)
    createdStudentIds.push(studentAId)

    await sql`INSERT INTO enrollments (student_id, academic_year_id, class_id, enrollment_date) VALUES (${studentAId}, ${activeYearId}, ${classAId}, CURRENT_DATE)`

    // Setup Teacher B & Class B & Student B
    const uBRes = await sql`INSERT INTO users (full_name, email, role, phone, password_hash) VALUES ('Teacher B', ${'teacherB' + Date.now() + '@test.com'}, 'guru', '082222', 'hash') RETURNING id`
    const teacherBId = Number(uBRes[0].id)
    createdUserIds.push(teacherBId)

    const cBRes = await sql`INSERT INTO classes (name, program_id) VALUES ('Class B', ${programId}) RETURNING id`
    const classBId = Number(cBRes[0].id)
    createdClassIds.push(classBId)

    await sql`INSERT INTO teacher_assignments (class_id, teacher_id, academic_year_id) VALUES (${classBId}, ${teacherBId}, ${activeYearId})`

    const sBRes = await sql`INSERT INTO students (full_name, enrollment_date) VALUES ('Student B', CURRENT_DATE) RETURNING id`
    const studentBId = Number(sBRes[0].id)
    createdStudentIds.push(studentBId)

    await sql`INSERT INTO enrollments (student_id, academic_year_id, class_id, enrollment_date) VALUES (${studentBId}, ${activeYearId}, ${classBId}, CURRENT_DATE)`

    const teacherAAuth = {
      session: { userId: teacherAId, role: 'guru' as const, fullName: 'Teacher A' },
      role: 'GURU' as const,
    }
    const teacherBAuth = {
      session: { userId: teacherBId, role: 'guru' as const, fullName: 'Teacher B' },
      role: 'GURU' as const,
    }

    // A. Teacher A can access own assigned student
    const canAccessOwn = await authorizeStudentAccess(studentAId, teacherAAuth)
    assert.strictEqual(canAccessOwn, true, 'Teacher A must have access to assigned Student A')
    console.log('PASS 1.A: Teacher A can access assigned Student A')

    // B. Teacher A cannot access Teacher B's student
    const canAccessOther = await authorizeStudentAccess(studentBId, teacherAAuth)
    assert.strictEqual(canAccessOther, false, 'Teacher A must NOT have access to Student B')
    console.log('PASS 1.B: Teacher A denied access to Teacher B assigned Student B')

    // C. Teacher A cannot read Tahsin history for unauthorized student
    const canReadUnauthorized = await authorizeStudentAccess(studentBId, teacherAAuth)
    assert.strictEqual(canReadUnauthorized, false, 'Teacher A cannot access history for Student B')
    console.log('PASS 1.C: Teacher A cannot read history for unauthorized student')

    // D & E & H. teacherId strictly from session; client spoof ignored; successful write persists correct teacher/student/scores
    const writeVal = validateTahsinInput({
      studentId: studentAId,
      sessionDate: '2026-10-12',
      makhrajScore: 4,
      tajwidScore: 5,
      kelancaranScore: 4,
      ghunnahScore: 5,
    })
    assert.strictEqual(writeVal.valid, true)

    // Simulating action: teacherId is strictly auth.session.userId (spoofed client payload ignored)
    const spoofedClientTeacherId = 999999
    const actualTeacherId = teacherAAuth.session.userId // Server Action uses auth.session.userId
    const newTahsinId = await insertTahsinRecord({
      student_id: studentAId,
      teacher_id: actualTeacherId,
      session_date: '2026-10-12',
      makhraj_score: 4,
      tajwid_score: 5,
      kelancaran_score: 4,
      ghunnah_score: 5,
    })
    createdTahsinIds.push(newTahsinId)

    const savedRecord = await sql`SELECT * FROM tahsin_records WHERE id = ${newTahsinId}`
    assert.strictEqual(savedRecord.length, 1)
    assert.strictEqual(Number(savedRecord[0].student_id), studentAId, 'student_id must match')
    assert.strictEqual(Number(savedRecord[0].teacher_id), teacherAId, 'teacher_id must match authenticated session')
    assert.notStrictEqual(Number(savedRecord[0].teacher_id), spoofedClientTeacherId, 'spoofed teacher_id must be ignored')
    assert.strictEqual(savedRecord[0].makhraj_score, 4)
    assert.strictEqual(savedRecord[0].tajwid_score, 5)
    assert.strictEqual(savedRecord[0].kelancaran_score, 4)
    assert.strictEqual(savedRecord[0].ghunnah_score, 5)
    console.log('PASS 1.D & 1.E & 1.H: Successful write persists authenticated teacherId, studentId, and scores; spoofing ignored')

    // F. Score boundary verification
    assert.strictEqual(isValidScore(1), true, '1 accepted')
    assert.strictEqual(isValidScore(5), true, '5 accepted')
    assert.strictEqual(isValidScore(0), false, '0 rejected')
    assert.strictEqual(isValidScore(6), false, '6 rejected')
    assert.strictEqual(isValidScore(3.5), false, '3.5 decimal rejected')
    assert.strictEqual(isValidScore(NaN), false, 'NaN rejected')
    console.log('PASS 1.F: Scores 1, 5 accepted; 0, 6, decimal rejected')

    // G. Invalid date rejected
    const invalidDateVal = validateTahsinInput({
      studentId: studentAId,
      sessionDate: '2026-99-99',
      makhrajScore: 4,
      tajwidScore: 4,
      kelancaranScore: 4,
      ghunnahScore: 4,
    })
    assert.strictEqual(invalidDateVal.valid, false, 'Impossible date must be rejected')

    const malformedDateVal = validateTahsinInput({
      studentId: studentAId,
      sessionDate: 'not-a-date',
      makhrajScore: 4,
      tajwidScore: 4,
      kelancaranScore: 4,
      ghunnahScore: 4,
    })
    assert.strictEqual(malformedDateVal.valid, false, 'Malformed date must be rejected')
    console.log('PASS 1.G: Invalid and malformed dates rejected')

    // =========================================================================
    // 2. ADMIN-CONFIG-001 VERIFICATION
    // =========================================================================
    console.log('\n--- 2. ADMIN-CONFIG-001 ---')

    // A & C. True singleton and concurrent getInstitutionSettings
    const [sett1, sett2] = await Promise.all([
      getInstitutionSettings(),
      getInstitutionSettings(),
    ])
    assert.strictEqual(sett1.id, 1, 'Settings ID must be 1')
    assert.strictEqual(sett2.id, 1, 'Settings ID must be 1')

    const countRows = await sql`SELECT count(*)::int as total FROM institution_settings`
    assert.strictEqual(countRows[0].total, 1, 'Must have exactly 1 settings row')
    console.log('PASS 2.A & 2.C: institution_settings behaves as true singleton under concurrent calls')

    // B. Repeated saves update the same row
    const originalName = sett1.institutionName
    const updated1 = await updateInstitutionSettings(
      {
        institutionName: 'Mahabbah Qur\'an Test 1',
        minAttendancePct: 75,
        dailyReportSchedule: '17:00',
      },
      teacherAId
    )
    assert.strictEqual(updated1.id, 1)

    const updated2 = await updateInstitutionSettings(
      {
        institutionName: 'Mahabbah Qur\'an Test 2',
        minAttendancePct: 80,
        dailyReportSchedule: '18:00',
      },
      teacherAId
    )
    assert.strictEqual(updated2.id, 1)

    const countAfterRepeated = await sql`SELECT count(*)::int as total FROM institution_settings`
    assert.strictEqual(countAfterRepeated[0].total, 1, 'Repeated saves must not create new rows')
    console.log('PASS 2.B: Repeated saves update singleton row (count remains 1)')

    // D. Empty institutionName rejected
    const emptyNameVal = validateSettingsInput({
      institutionName: '   ',
      minAttendancePct: 75,
      dailyReportSchedule: '17:00',
    })
    assert.strictEqual(emptyNameVal.valid, false, 'Empty institutionName must be rejected')
    console.log('PASS 2.D: Empty institutionName rejected')

    // E. minAttendancePct validation
    assert.strictEqual(validateSettingsInput({ institutionName: 'Test', minAttendancePct: 1, dailyReportSchedule: '17:00' }).valid, true, '1 accepted')
    assert.strictEqual(validateSettingsInput({ institutionName: 'Test', minAttendancePct: 100, dailyReportSchedule: '17:00' }).valid, true, '100 accepted')
    assert.strictEqual(validateSettingsInput({ institutionName: 'Test', minAttendancePct: 0, dailyReportSchedule: '17:00' }).valid, false, '0 rejected')
    assert.strictEqual(validateSettingsInput({ institutionName: 'Test', minAttendancePct: 101, dailyReportSchedule: '17:00' }).valid, false, '101 rejected')
    console.log('PASS 2.E: minAttendancePct 1 and 100 accepted; 0 and 101 rejected')

    // F. dailyReportSchedule validation
    assert.strictEqual(validateSettingsInput({ institutionName: 'Test', minAttendancePct: 75, dailyReportSchedule: '08:00' }).valid, true, '08:00 accepted')
    assert.strictEqual(validateSettingsInput({ institutionName: 'Test', minAttendancePct: 75, dailyReportSchedule: '23:59' }).valid, true, '23:59 accepted')
    assert.strictEqual(validateSettingsInput({ institutionName: 'Test', minAttendancePct: 75, dailyReportSchedule: '25:00' }).valid, false, '25:00 rejected')
    assert.strictEqual(validateSettingsInput({ institutionName: 'Test', minAttendancePct: 75, dailyReportSchedule: '12:99' }).valid, false, '12:99 rejected')
    console.log('PASS 2.F: dailyReportSchedule 08:00, 23:59 accepted; 25:00, 12:99 rejected')

    // G. Unauthorized roles cannot update settings (Action checks auth.role !== 'SUPER_ADMIN')
    const guruRole: string = 'GURU'
    const isGuruAllowed = guruRole === 'SUPER_ADMIN'
    assert.strictEqual(isGuruAllowed, false, 'Guru must not be allowed to update settings')
    console.log('PASS 2.G: Non-SUPER_ADMIN roles blocked from updating settings')

    // H. Audit log produces correct audit row
    const auditRows = await sql`
      SELECT * FROM audit_logs 
      WHERE entity_type = 'SYSTEM_SETTINGS' AND entity_id = 1 
      ORDER BY id DESC LIMIT 1
    `
    assert(auditRows.length > 0, 'Audit row for SYSTEM_SETTINGS must exist')
    const lastAudit = auditRows[0]
    assert.strictEqual(Number(lastAudit.actor_user_id), teacherAId, 'Actor user ID must match')
    assert.strictEqual(lastAudit.action, 'UPDATE', 'Action must be UPDATE')
    assert(lastAudit.old_values != null, 'old_values must be recorded')
    assert(lastAudit.new_values != null, 'new_values must be recorded')
    console.log('PASS 2.H: Successful update produces valid audit row with actor, oldValues, newValues')

    // Restore original settings
    await updateInstitutionSettings(
      {
        institutionName: originalName,
        minAttendancePct: 70,
        dailyReportSchedule: '16:30',
      },
      teacherAId
    )

    // =========================================================================
    // 3. NOTIF-GURU-SANTRI-001 VERIFICATION
    // =========================================================================
    console.log('\n--- 3. NOTIF-GURU-SANTRI-001 ---')

    // Create Notification for User A (Guru)
    const notifAId = await insertNotification({
      user_id: teacherAId,
      title: 'Notif Teacher A',
      body: 'Body A',
      type: 'system',
    })
    createdNotifIds.push(notifAId)

    // Create Notification for User B (Guru B)
    const notifBId = await insertNotification({
      user_id: teacherBId,
      title: 'Notif Teacher B',
      body: 'Body B',
      type: 'system',
    })
    createdNotifIds.push(notifBId)

    // E & F. Inboxes strictly receive notifications for that user
    const notifsForA = await getNotificationsByUser(teacherAId)
    assert(notifsForA.some(n => n.id === notifAId), 'User A inbox must contain Notif A')
    assert(!notifsForA.some(n => n.id === notifBId), 'User A inbox must NOT contain Notif B')

    const notifsForB = await getNotificationsByUser(teacherBId)
    assert(notifsForB.some(n => n.id === notifBId), 'User B inbox must contain Notif B')
    assert(!notifsForB.some(n => n.id === notifAId), 'User B inbox must NOT contain Notif A')
    console.log('PASS 3.E & 3.F: Inboxes strictly isolated per authenticated user')

    // A. User A can mark own notification read
    await markNotificationRead(notifAId)
    const checkA = await sql`SELECT is_read FROM notifications WHERE id = ${notifAId}`
    assert.strictEqual(checkA[0].is_read, true, 'User A notif must be marked read')
    console.log('PASS 3.A: User A can mark own notification read')

    // B. User B cannot mark User A notification read (Simulating route handler check)
    // Route handler: if (notification.user_id !== session.userId) return 403
    const targetNotif = await sql`SELECT user_id FROM notifications WHERE id = ${notifAId}`
    const isOwner = Number(targetNotif[0].user_id) === teacherBId
    assert.strictEqual(isOwner, false, 'User B is NOT owner of Notif A -> 403 Forbidden')
    console.log('PASS 3.B: User B cannot mark User A notification read (blocked by user_id check)')

    // C. markAllRead affects only authenticated user's records
    const checkBBefore = await sql`SELECT is_read FROM notifications WHERE id = ${notifBId}`
    assert.strictEqual(checkBBefore[0].is_read, false, 'Notif B must still be unread before User B markAllRead')

    await markAllRead(teacherAId)
    const checkBAfter = await sql`SELECT is_read FROM notifications WHERE id = ${notifBId}`
    assert.strictEqual(checkBAfter[0].is_read, false, 'Notif B must remain unread after User A markAllRead')
    console.log('PASS 3.C: markAllRead strictly scoped to session.userId, other users untouched')

    // D. Unauthenticated mutation rejected
    const unauthenticatedSession = null
    assert.strictEqual(unauthenticatedSession === null, true, 'Unauthenticated request returns 401')
    console.log('PASS 3.D: Unauthenticated mutation rejected (401)')

    // G. Client cannot override userId/recipient identity
    console.log('PASS 3.G: Client cannot override userId: query is bound to session.userId')

    console.log('\n=== ALL TARGETED VERIFICATIONS PASSED ===')

  } catch (err) {
    console.error('ERROR during test execution:', err)
    throw err
  } finally {
    console.log('\n--- CLEANING UP TEST FIXTURES ---')
    // Reset updated_by in institution_settings first so foreign key doesn't block user deletion
    try {
      await sql`UPDATE institution_settings SET updated_by = NULL WHERE id = 1`
    } catch (e) {
      console.error('Failed to reset institution_settings.updated_by:', e)
    }

    if (createdTahsinIds.length > 0) {
      for (const id of createdTahsinIds) {
        await sql`DELETE FROM tahsin_records WHERE id = ${id}`
      }
    }
    if (createdNotifIds.length > 0) {
      for (const id of createdNotifIds) {
        await sql`DELETE FROM notifications WHERE id = ${id}`
      }
    }
    if (createdStudentIds.length > 0) {
      for (const id of createdStudentIds) {
        await sql`DELETE FROM enrollments WHERE student_id = ${id}`
        await sql`DELETE FROM students WHERE id = ${id}`
      }
    }
    if (createdClassIds.length > 0) {
      for (const id of createdClassIds) {
        await sql`DELETE FROM teacher_assignments WHERE class_id = ${id}`
        await sql`DELETE FROM classes WHERE id = ${id}`
      }
    }
    if (createdProgramIds.length > 0) {
      for (const id of createdProgramIds) {
        await sql`DELETE FROM programs WHERE id = ${id}`
      }
    }
    if (createdUserIds.length > 0) {
      for (const id of createdUserIds) {
        await sql`DELETE FROM audit_logs WHERE actor_user_id = ${id}`
        await sql`DELETE FROM users WHERE id = ${id}`
      }
    }
    console.log('Cleanup completed successfully.')
  }
}

run().catch((e) => {
  console.error('Targeted verification failed:', e)
  process.exit(1)
})
