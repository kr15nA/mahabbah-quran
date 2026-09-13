import { SignJWT } from 'jose'
import { db, sql } from '../lib/db/client'
import { academicYears, teacherAssignments, enrollments } from '../drizzle/schema'
import { eq } from 'drizzle-orm'
import assert from 'assert'

const HOST = 'http://localhost:3000'

async function generateToken(payload: Record<string, unknown>) {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET missing')
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

async function runTests() {
  console.log('=== ATTENDANCE-SCHEMA-HOTFIX-001 REGRESSION ===\n')

  const adminCookie = `mq_session=${await generateToken({ userId: 4, role: 'admin', fullName: 'Admin Pembina' })}`
  const guru1Cookie = `mq_session=${await generateToken({ userId: 1, role: 'guru',  fullName: 'Ustadz Aldi Solihin' })}`
  const guru2Cookie = `mq_session=${await generateToken({ userId: 2, role: 'guru',  fullName: 'Ustadzah Siti Rahmah' })}`

  let activeYear: any = null
  let originalAssignment: any = null
  let originalEnrollment1: any = null
  let originalEnrollment2: any = null

  const classId = 1
  const student1Id = 1
  const student2Id = 2

  const testDate1 = '2030-10-10'
  const testDate2 = '2030-10-11'

  try {
    const resYear = await db.select().from(academicYears).where(eq(academicYears.isActive, true)).limit(1)
    activeYear = resYear[0]
    if (!activeYear) throw new Error('No active academic year')

    // Snapshot state
    originalAssignment = (await db.select().from(teacherAssignments).where(eq(teacherAssignments.classId, classId)).limit(1))[0]
    originalEnrollment1 = (await db.select().from(enrollments).where(eq(enrollments.studentId, student1Id)).limit(1))[0]
    originalEnrollment2 = (await db.select().from(enrollments).where(eq(enrollments.studentId, student2Id)).limit(1))[0]

    // Setup active state for Guru 1
    await post(`${HOST}/api/teacher-assignments`, { academicYearId: activeYear.id, classId, teacherId: 1 }, adminCookie)
    await post(`${HOST}/api/enrollments`, { academicYearId: activeYear.id, studentId: student1Id, classId }, adminCookie)
    await post(`${HOST}/api/enrollments`, { academicYearId: activeYear.id, studentId: student2Id, classId }, adminCookie)

    console.log('--- 1. FIRST ATTENDANCE INSERT SUCCEEDS ---')
    const res1 = await post(`${HOST}/api/attendance`, [{ student_id: student1Id, class_id: classId, attendance_date: testDate1, status: 'hadir' }], guru1Cookie)
    assert.ok([200, 201].includes(res1.status), 'First insert failed')
    console.log('✅ Success')

    console.log('\n--- 2. SAME STUDENT + SAME DATE UPSERTS (NO DUPLICATE) ---')
    const res2 = await post(`${HOST}/api/attendance`, [{ student_id: student1Id, class_id: classId, attendance_date: testDate1, status: 'sakit' }], guru1Cookie)
    assert.ok([200, 201].includes(res2.status), 'Upsert failed')
    console.log('✅ Success')

    console.log('\n--- 3. SAME STUDENT + DIFFERENT DATE SUCCEEDS ---')
    const res3 = await post(`${HOST}/api/attendance`, [{ student_id: student1Id, class_id: classId, attendance_date: testDate2, status: 'hadir' }], guru1Cookie)
    assert.ok([200, 201].includes(res3.status), 'Different date insert failed')
    console.log('✅ Success')

    console.log('\n--- 4. DIFFERENT STUDENT + SAME DATE SUCCEEDS ---')
    const res4 = await post(`${HOST}/api/attendance`, [{ student_id: student2Id, class_id: classId, attendance_date: testDate1, status: 'hadir' }], guru1Cookie)
    assert.ok([200, 201].includes(res4.status), 'Different student insert failed')
    console.log('✅ Success')

    console.log('\n--- 5. ROW COUNT CONFIRMS NO DUPLICATES ---')
    const rows = await sql`SELECT COUNT(*) as count FROM attendance WHERE student_id = ${student1Id} AND attendance_date = ${testDate1}`
    const count = Number((rows as any)[0].count)
    assert.strictEqual(count, 1, `Expected 1 row, got ${count}`)
    console.log('✅ Success (only 1 row found)')

    console.log('\n--- 6. UNAUTHORIZED WRITE DENIED ---')
    const res6 = await post(`${HOST}/api/attendance`, [{ student_id: student1Id, class_id: classId, attendance_date: testDate1, status: 'alfa' }], guru2Cookie)
    assert.strictEqual(res6.status, 403, 'Unauthorized write should be denied')
    console.log('✅ Success (denied)')

    console.log('\n🎉 ALL REGRESSION TESTS PASSED.')

  } finally {
    console.log('\n--- CLEANUP ---')
    // Delete test attendance rows
    await sql`DELETE FROM attendance WHERE attendance_date IN (${testDate1}, ${testDate2})`
    
    // Restore state
    if (originalAssignment) {
      await db.update(teacherAssignments).set({ teacherId: originalAssignment.teacherId, academicYearId: originalAssignment.academicYearId }).where(eq(teacherAssignments.classId, classId))
    }
    if (originalEnrollment1) {
      await db.update(enrollments).set({ classId: originalEnrollment1.classId, academicYearId: originalEnrollment1.academicYearId }).where(eq(enrollments.studentId, student1Id))
    }
    if (originalEnrollment2) {
      await db.update(enrollments).set({ classId: originalEnrollment2.classId, academicYearId: originalEnrollment2.academicYearId }).where(eq(enrollments.studentId, student2Id))
    }
    console.log('✅ Cleanup executed')
  }
}

runTests().catch(e => {
  console.error('\n❌ Test failed:', e.message || e)
  process.exit(1)
})
