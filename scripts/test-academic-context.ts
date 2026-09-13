import { SignJWT } from 'jose'
import { db, sql } from '../lib/db/client'
import { academicYears, classes, users, students, teacherAssignments, enrollments, studentParents, learningReports } from '../drizzle/schema'
import { eq } from 'drizzle-orm'
import assert from 'assert'

const HOST = 'http://localhost:3000'

async function generateToken(payload: Record<string, unknown>) {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET missing — cannot run tests')
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode(secret))
}

async function post(url: string, body: object, cookie: string) {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify(body),
  })
}

async function get(url: string, cookie: string) {
  return fetch(url, { headers: { cookie } })
}

async function runTests() {
  console.log('=== ACADEMIC-CONTEXT-001 Tests ===\n')

  const adminCookie = `mq_session=${await generateToken({ userId: 4, role: 'admin', fullName: 'Admin Pembina' })}`
  const guru1Cookie = `mq_session=${await generateToken({ userId: 1, role: 'guru',  fullName: 'Ustadz Aldi Solihin' })}`
  const guru2Cookie = `mq_session=${await generateToken({ userId: 2, role: 'guru',  fullName: 'Ustadzah Siti Rahmah' })}`
  const parentCookie = `mq_session=${await generateToken({ userId: 5, role: 'orang_tua', fullName: 'Bapak Hendra Wijaya' })}`

  let activeYear: any = null
  let originalAssignment: any = null
  let originalClass: any = null
  let originalEnrollment: any = null
  const classId = 1 // Kelompok A
  const studentId = 1 // Ahmad Zaki Ramadhan

  try {
    const resYear = await db.select().from(academicYears).where(eq(academicYears.isActive, true)).limit(1)
    activeYear = resYear[0]
    if (!activeYear) throw new Error('No active academic year — seed DB first')
    
    // Capture original state for safe teardown
    originalAssignment = (await db.select().from(teacherAssignments).where(eq(teacherAssignments.classId, classId)).limit(1))[0]
    originalClass = (await db.select().from(classes).where(eq(classes.id, classId)).limit(1))[0]
    originalEnrollment = (await db.select().from(enrollments).where(eq(enrollments.studentId, studentId)).limit(1))[0]

    // We will test against the existing seed data since it uses proper assignments.
    const guru1Id = 1 // Ustadz Aldi Solihin
    const guru2Id = 2 // Ustadzah Siti Rahmah
    const parentId = 5 // Bapak Hendra Wijaya

    // Ensure state is baseline correct for the active year
    await post(`${HOST}/api/teacher-assignments`, { academicYearId: activeYear.id, classId, teacherId: guru1Id }, adminCookie)
    await post(`${HOST}/api/enrollments`, { academicYearId: activeYear.id, studentId, classId }, adminCookie)

    // Ensure unique indexes exist for ON CONFLICT to work
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS attendance_unique_per_day ON attendance (student_id, attendance_date);`
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS learning_reports_unique_per_day ON learning_reports (student_id, report_date);`

    console.log('--- 1. ACTIVE TEACHER ASSIGNMENT GRANTS ACCESS ---')
    const res1 = await get(`${HOST}/api/attendance?class_id=${classId}&date=2026-01-01`, guru1Cookie)
    assert.strictEqual(res1.status, 200, 'Guru 1 should access Class 1 via active assignment')
    console.log('✅ Active assignment grants access')

    console.log('\n--- 2. STALE CLASSES.TEACHER_ID DOES NOT GRANT ACCESS ---')
    // Break active assignment, but leave classes.teacher_id intact
    await db.update(teacherAssignments).set({ teacherId: guru2Id }).where(eq(teacherAssignments.classId, classId))
    const res2 = await get(`${HOST}/api/attendance?class_id=${classId}&date=2026-01-01`, guru1Cookie)
    assert.strictEqual(res2.status, 403, 'Guru 1 should NOT access Class 1 if assignment is moved, even if classes.teacher_id is stale')
    console.log('✅ Stale classes.teacher_id alone does not grant access')

    // Restore assignment
    await db.update(teacherAssignments).set({ teacherId: guru1Id }).where(eq(teacherAssignments.classId, classId))
    await db.update(classes).set({ teacherId: guru1Id }).where(eq(classes.id, classId)) // repair legacy sync

    console.log('\n--- 3. ACTIVE ENROLLMENT GRANTS MEMBERSHIP ---')
    const res3 = await get(`${HOST}/api/students/${studentId}`, guru1Cookie)
    assert.strictEqual(res3.status, 200, 'Guru 1 should access enrolled student')
    console.log('✅ Active enrollment grants access')

    console.log('\n--- 4. STALE STUDENTS.CLASS_ID DOES NOT GRANT MEMBERSHIP ---')
    // Move enrollment to a different class (class 3) but keep students.class_id = 1
    // Class 3 is taught by Guru 2, not Guru 1.
    await db.update(enrollments).set({ classId: 3 }).where(eq(enrollments.studentId, studentId))
    const res4 = await get(`${HOST}/api/students/${studentId}`, guru1Cookie)
    assert.strictEqual(res4.status, 403, 'Guru 1 should NOT access student enrolled in Class 3, despite students.class_id = 1')
    console.log('✅ Stale students.class_id alone does not grant membership')

    // Restore enrollment
    await db.update(enrollments).set({ classId }).where(eq(enrollments.studentId, studentId))

    console.log('\n--- 5 & 6. INACTIVE YEAR ASSIGNMENT / ENROLLMENT ---')
    // Create or get inactive year
    const [existingInactiveYear] = await db.select().from(academicYears).where(eq(academicYears.name, 'Old Year')).limit(1)
    const inactiveYear = existingInactiveYear || (await db.insert(academicYears).values({ name: 'Old Year', startDate: '2010-01-01', endDate: '2010-12-31', isActive: false }).returning())[0]
    // Move active assignment & enrollment to inactive year
    await db.update(teacherAssignments).set({ academicYearId: inactiveYear.id }).where(eq(teacherAssignments.classId, classId))
    await db.update(enrollments).set({ academicYearId: inactiveYear.id }).where(eq(enrollments.studentId, studentId))
    
    const res5 = await get(`${HOST}/api/attendance?class_id=${classId}&date=2026-01-01`, guru1Cookie)
    assert.strictEqual(res5.status, 403, 'Guru 1 should NOT access Class 1 if assignment is for an inactive year')
    
    const res6 = await get(`${HOST}/api/students/${studentId}`, guru1Cookie)
    assert.strictEqual(res6.status, 403, 'Guru 1 should NOT access Student 1 if enrollment is for an inactive year')
    console.log('✅ Inactive-year assignment/enrollment does not grant access')

    // Restore to active year
    await db.update(teacherAssignments).set({ academicYearId: activeYear.id }).where(eq(teacherAssignments.classId, classId))
    await db.update(enrollments).set({ academicYearId: activeYear.id }).where(eq(enrollments.studentId, studentId))

    console.log('\n--- 7. CROSS-TEACHER DENIED ---')
    const res7 = await get(`${HOST}/api/students/${studentId}`, guru2Cookie)
    assert.strictEqual(res7.status, 403, 'Guru 2 should NOT access Guru 1 student')
    console.log('✅ Cross-teacher access denied')

    console.log('\n--- 8. PARENT ACCESS REMAINS CORRECT ---')
    const res8 = await get(`${HOST}/api/students/${studentId}`, parentCookie)
    assert.strictEqual(res8.status, 200, 'Parent 1 should access Student 1 via parent link')
    console.log('✅ Parent child access remains correct')

    console.log('\n--- 9. ATTENDANCE CREATE WORKS ---')
    const res9 = await post(`${HOST}/api/attendance`, [{ student_id: studentId, class_id: classId, attendance_date: '2026-01-01', status: 'hadir' }], guru1Cookie)
    assert.ok([200, 201].includes(res9.status), 'Guru 1 should be able to create attendance: ' + res9.status)
    console.log('✅ Attendance create still works for assigned teacher')

    console.log('\n--- 10. HAFALAN CREATE WORKS ---')
    const res10 = await post(`${HOST}/api/hafalan`, { student_id: studentId, class_id: classId, surah_id: 67, ayah_start: 1, ayah_end: 2, type: 'hafalan_baru', score: 90 }, guru1Cookie)
    assert.ok([200, 201].includes(res10.status), 'Guru 1 should be able to create hafalan: ' + res10.status)
    console.log('✅ Hafalan create still works for assigned teacher')

    console.log('\n--- 11. LEARNING REPORT ACCESS WORKS ---')
    const [report] = await db.select().from(learningReports).where(eq(learningReports.studentId, studentId)).limit(1)
    if (report) {
      const res11 = await get(`${HOST}/api/learning-reports/${report.id}`, guru1Cookie)
      assert.strictEqual(res11.status, 200, 'Guru 1 should access historical report')
      const res11p = await get(`${HOST}/api/learning-reports/${report.id}`, parentCookie)
      assert.strictEqual(res11p.status, 200, 'Parent 1 should access historical report')
      console.log('✅ Learning report access still works (historical ownership retained)')
    } else {
      console.log('⚠️ Skipped learning report test (no seed data)')
    }

    console.log('\n--- 12. NO ACTIVE YEAR = SECURE DENY ---')
    await db.update(academicYears).set({ isActive: false }) // Deactivate all
    const res12 = await get(`${HOST}/api/attendance?class_id=${classId}&date=2026-01-01`, guru1Cookie)
    assert.strictEqual(res12.status, 403, 'Guru 1 should NOT access Class 1 if no active year exists')
    console.log('✅ No active academic year = secure behavior (deny)')

    // Restore active year
    await db.update(academicYears).set({ isActive: true }).where(eq(academicYears.id, activeYear.id))

    console.log('\n--- 13. DASHBOARD COUNTS MATCH ---')
    const res13 = await get(`${HOST}/api/classes`, guru1Cookie)
    assert.strictEqual(res13.status, 200, 'Guru 1 should access classes')
    const classesData = await res13.json()
    assert.ok(classesData.data && classesData.data.length > 0, 'Guru 1 should have classes via active assignment')
    console.log('✅ Dashboard classes count works')
    assert.strictEqual(classesData.data[0].teacher_name, 'Ustadz Aldi Solihin')
    console.log('✅ Current dashboard lists match active-context DB state')

    console.log('\n🎉 ALL ACADEMIC-CONTEXT-001 TESTS PASSED.')

  } finally {
    console.log('\n--- CLEANUP ---')
    // 1. Restore academic year active state
    if (activeYear) {
      await db.update(academicYears).set({ isActive: true }).where(eq(academicYears.id, activeYear.id))
    }

    // 2. Restore teacher assignment
    if (originalAssignment) {
      await db.update(teacherAssignments).set({
        teacherId: originalAssignment.teacherId,
        academicYearId: originalAssignment.academicYearId
      }).where(eq(teacherAssignments.classId, classId))
    }

    // 3. Restore class
    if (originalClass) {
      await db.update(classes).set({
        teacherId: originalClass.teacherId
      }).where(eq(classes.id, classId))
    }

    // 4. Restore enrollment
    if (originalEnrollment) {
      await db.update(enrollments).set({
        classId: originalEnrollment.classId,
        academicYearId: originalEnrollment.academicYearId
      }).where(eq(enrollments.studentId, studentId))
    }

    // 5. Delete test attendance and hafalan records
    await sql`DELETE FROM attendance WHERE student_id = ${studentId} AND attendance_date = '2026-01-01'`
    await sql`DELETE FROM hafalan_records WHERE student_id = ${studentId} AND ayah_start = 1 AND ayah_end = 2 AND score = 90`
    console.log('✅ Test cleanup executed')
  }
}

runTests().catch(e => {
  console.error('\n❌ Test failed:', e.message || e)
  process.exit(1)
})
