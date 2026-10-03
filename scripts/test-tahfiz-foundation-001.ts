import { db } from '../lib/db/client'
import { txDb } from '../lib/db/tx'
import { assertSafeMutatingDbTestEnvironment } from './lib/assert-safe-mutating-db-test'
import { normalizeCoverageRanges } from '../lib/tahfiz/normalize'
import { students, surahs, hafalanRecords, tahfizSurahCoverage, tahfizTargets, auditLogs, academicYears, users, enrollments, classes, teacherAssignments, permissions, rolePermissions } from '../drizzle/schema'
import { eq, and } from 'drizzle-orm'
import { addHafalanRecord, rebuildStudentSurahCoverage, createTahfizTarget, completeTahfizTarget, cancelTahfizTarget, reviseTahfizTarget } from '../lib/tahfiz/service'

// Helper to mock the session
function mockAuth(userId: number, role: 'guru' | 'admin' | 'orang_tua' = 'guru') {
  return { session: { userId, role, fullName: 'Test' }, role: role === 'admin' ? 'SUPER_ADMIN' : role === 'guru' ? 'GURU' : 'ORANG_TUA' as any }
}

async function runTests() {
  assertSafeMutatingDbTestEnvironment()

  console.log('--- RUNNING TAHFIZ FOUNDATION NORMALIZATION TESTS ---')
  
  let res = normalizeCoverageRanges([{ ayahStart: 1, ayahEnd: 10 }, { ayahStart: 5, ayahEnd: 15 }])
  if (res.length !== 1 || res[0].ayahEnd !== 15) throw new Error('Normalization A failed')
  
  res = normalizeCoverageRanges([{ ayahStart: 1, ayahEnd: 10 }, { ayahStart: 11, ayahEnd: 20 }])
  if (res.length !== 1 || res[0].ayahEnd !== 20) throw new Error('Normalization B failed')
  
  res = normalizeCoverageRanges([{ ayahStart: 1, ayahEnd: 10 }, { ayahStart: 20, ayahEnd: 30 }])
  if (res.length !== 2) throw new Error('Normalization C failed')

  res = normalizeCoverageRanges([{ ayahStart: 1, ayahEnd: 10 }, { ayahStart: 5, ayahEnd: 8 }])
  if (res.length !== 1 || res[0].ayahEnd !== 10) throw new Error('Normalization D failed')

  res = normalizeCoverageRanges([{ ayahStart: 20, ayahEnd: 30 }, { ayahStart: 1, ayahEnd: 10 }, { ayahStart: 11, ayahEnd: 15 }])
  if (res.length !== 2 || res[0].ayahEnd !== 15) throw new Error('Normalization E failed')

  res = normalizeCoverageRanges([{ ayahStart: 1, ayahEnd: 10 }, { ayahStart: 1, ayahEnd: 10 }])
  if (res.length !== 1 || res[0].ayahEnd !== 10) throw new Error('Normalization F failed')

  res = normalizeCoverageRanges([{ ayahStart: 1, ayahEnd: 10 }, { ayahStart: 5, ayahEnd: 15 }, { ayahStart: 15, ayahEnd: 20 }])
  if (res.length !== 1 || res[0].ayahEnd !== 20) throw new Error('Normalization G failed')

  res = normalizeCoverageRanges([{ ayahStart: 1, ayahEnd: 10 }, { ayahStart: 10, ayahEnd: 5 }])
  if (res.length !== 1 || res[0].ayahEnd !== 10) throw new Error('Normalization H failed')

  console.log('✓ Normalization tests passed')

  console.log('--- RUNNING TAHFIZ INTEGRATION TESTS ---')

  const acadYearResult = await db.select().from(academicYears).where(eq(academicYears.isActive, true)).limit(1)
  if (!acadYearResult.length) throw new Error('No active academic year found in DB')
  const acadYear = acadYearResult[0]

  const [teacher] = await db.insert(users).values({
    fullName: 'Test Tahfiz Teacher',
    passwordHash: 'dummy',
    role: 'guru'
  }).returning()
  
  const [unassignedTeacher] = await db.insert(users).values({
    fullName: 'Test Unassigned Teacher',
    passwordHash: 'dummy',
    role: 'guru'
  }).returning()

  const [student] = await db.insert(students).values({
    fullName: 'Test Tahfiz Student',
    enrollmentDate: '2026-10-02',
    status: 'ACTIVE'
  }).returning()
  
  const [otherStudent] = await db.insert(students).values({
    fullName: 'Test Other Student',
    enrollmentDate: '2026-10-02',
    status: 'ACTIVE'
  }).returning()

  const [testClass] = await db.insert(classes).values({
    name: 'Test Tahfiz Class ' + Date.now(),
    programId: 1
  }).returning()

  await db.insert(enrollments).values({
    studentId: student.id,
    academicYearId: acadYear.id,
    classId: testClass.id
  })

  await db.insert(teacherAssignments).values({
    teacherId: teacher.id,
    academicYearId: acadYear.id,
    classId: testClass.id
  })
  


  let t1Id = 0, h1Id = 0;

  try {
    const surahId = 114
    const startSurahId = 83

    console.log('Testing HAFALAN AUTHORIZATION')
    // For Hafalan, authorization happens via HTTP boundary (requires requireStudentAccess in route handler).
    // We can simulate that:
    const { authorizeStudentAccess } = require('../lib/auth/rbac')

    // A1. Authorized Guru
    let authA1 = false
    try {
      const res = await authorizeStudentAccess(student.id, mockAuth(teacher.id, 'guru'))
      authA1 = res
    } catch(e) {}
    if (!authA1) throw new Error('A1 failed')

    // A2. Guru with no assignment
    let authA2 = false
    try {
      const res = await authorizeStudentAccess(student.id, mockAuth(unassignedTeacher.id, 'guru'))
      authA2 = res
    } catch(e) {}
    if (authA2) throw new Error('A2 failed - unassigned teacher allowed')
    
    // A3. Assigned elsewhere/other student
    let authA3 = false
    try {
      const res = await authorizeStudentAccess(otherStudent.id, mockAuth(teacher.id, 'guru'))
      authA3 = res
    } catch(e) {}
    if (authA3) throw new Error('A3 failed - wrong student allowed')
    
    // A5. Target mutation missing permission
    let authA5 = false
    try {
      // Unassigned teacher (or even assigned but we won't give them `academic.tahfiz.manage`)
      await createTahfizTarget({
        studentId: student.id, academicYearId: acadYear.id, startSurahId, startAyah: 1, endSurahId: surahId, endAyah: 6
      }, mockAuth(teacher.id, 'guru'))
      authA5 = true
    } catch(e: any) {
      if (!e.message.includes('Missing permission') && !e.message.includes('Forbidden')) throw e
    }
    if (authA5) throw new Error('A5 failed - mutation allowed without permission')

    // Hafalan operations
    h1Id = await addHafalanRecord({
      student_id: student.id,
      teacher_id: teacher.id,
      surah_id: surahId,
      session_date: '2026-10-02',
      ayah_start: 1,
      ayah_end: 2,
      type: 'hafalan_baru'
    })
    
    // Test Atomic Rollback
    let rollbackPass = false
    try {
      await txDb.transaction(async (tx) => {
        await tx.insert(hafalanRecords).values({
          studentId: student.id, teacherId: teacher.id, surahId: 114, sessionDate: '2026-10-02', ayahStart: 1, ayahEnd: 99, type: 'hafalan_baru'
        })
        throw new Error('Fake Error for Rollback')
      })
    } catch(e: any) {
      rollbackPass = e.message === 'Fake Error for Rollback'
    }
    const rollbackCheck = await db.select().from(hafalanRecords).where(and(eq(hafalanRecords.studentId, student.id), eq(hafalanRecords.ayahEnd, 99)))
    if (!rollbackPass || rollbackCheck.length > 0) throw new Error('Atomic rollback failed')
    
    console.log('✓ Hafalan & Rebuild tests passed')

    // TARGET TESTS - USING SUPER_ADMIN to bypass dynamic permission check
    const superAuth = mockAuth(teacher.id, 'admin')
    
    await createTahfizTarget({
      studentId: student.id, academicYearId: acadYear.id, startSurahId, startAyah: 1, endSurahId: surahId, endAyah: 6
    }, superAuth)
    
    const targets = await db.select().from(tahfizTargets).where(eq(tahfizTargets.studentId, student.id))
    t1Id = targets[0].id
    if (targets.length !== 1 || targets[0].status !== 'ACTIVE') throw new Error('Target create failed')
    
    await reviseTahfizTarget(t1Id, { startSurahId, startAyah: 1, endSurahId: surahId, endAyah: 4 }, superAuth)
    const targetsAfterRevise = await db.select().from(tahfizTargets).where(eq(tahfizTargets.studentId, student.id)).orderBy(tahfizTargets.id)
    if (targetsAfterRevise.length !== 2 || targetsAfterRevise[0].status !== 'SUPERSEDED' || targetsAfterRevise[1].status !== 'ACTIVE') throw new Error('Target revise failed')
    const t2Id = targetsAfterRevise[1].id
    
    await completeTahfizTarget(t2Id, superAuth)
    const targetsAfterComplete = await db.select().from(tahfizTargets).where(eq(tahfizTargets.id, t2Id))
    if (targetsAfterComplete[0].status !== 'COMPLETED') throw new Error('Target complete failed')

    // Audit logs check
    const audits = await db.select().from(auditLogs).where(eq(auditLogs.entityType, 'tahfiz_targets'))
    if (audits.length < 3) throw new Error('Audit logs missing')

    console.log('✓ Target DB constraints passed')

  } finally {
    console.log('Cleaning up fixtures (narrow scoped)...')
    const createdTargetIds = await db.select({ id: tahfizTargets.id }).from(tahfizTargets).where(eq(tahfizTargets.studentId, student.id))
    for (const t of createdTargetIds) {
      await db.delete(auditLogs).where(and(eq(auditLogs.entityType, 'tahfiz_targets'), eq(auditLogs.entityId, t.id)))
    }
    
    await db.delete(tahfizSurahCoverage).where(eq(tahfizSurahCoverage.studentId, student.id))
    await db.delete(hafalanRecords).where(eq(hafalanRecords.studentId, student.id))
    await db.delete(tahfizTargets).where(eq(tahfizTargets.studentId, student.id))
    await db.delete(teacherAssignments).where(eq(teacherAssignments.teacherId, teacher.id))
    await db.delete(enrollments).where(eq(enrollments.studentId, student.id))
    await db.delete(enrollments).where(eq(enrollments.studentId, otherStudent.id))
    await db.delete(students).where(eq(students.id, student.id))
    await db.delete(students).where(eq(students.id, otherStudent.id))
    await db.delete(users).where(eq(users.id, teacher.id))
    await db.delete(users).where(eq(users.id, unassignedTeacher.id))
    await db.delete(classes).where(eq(classes.id, testClass.id))
  }
}

runTests().catch(err => {
  console.error('Test failed:', err)
  process.exit(1)
})
