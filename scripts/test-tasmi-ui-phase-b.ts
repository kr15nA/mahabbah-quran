import { getGlobalTasmiHistory } from '@/lib/tasmi/list'
import { db } from '@/lib/db/client'
import { tasmiSessions, students, enrollments, classes, teacherAssignments, academicYears, users } from '@/drizzle/schema'
import { eq, inArray } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

async function run() {
  console.log('Running robust test-tasmi-ui-phase-b...')
  const cleanupIds = {
    users: [] as number[],
    students: [] as number[],
    classes: [] as number[],
    enrollments: [] as number[],
    teacherAssignments: [] as number[],
    tasmiSessions: [] as number[]
  }

  try {
    // 1. Get existing active academic year
    const activeYear = await db.select().from(academicYears).where(eq(academicYears.isActive, true)).limit(1)
    if (!activeYear.length) throw new Error('No active academic year found')
    const academicYearId = activeYear[0].id

    // 2. Create a dummy guru user
    const [guru] = await db.insert(users).values({
      email: `guru_test_${Date.now()}@example.com`,
      fullName: 'Guru Test Tasmi UI',
      role: 'guru',
      passwordHash: await bcrypt.hash('dummy', 10)
    }).returning({ id: users.id })
    cleanupIds.users.push(guru.id)

    // 3. Create class
    const [testClass] = await db.insert(classes).values({
      name: `Class Tasmi Test ${Date.now()}`,
      programId: 1 // Assuming program 1 exists or is seeded
    }).returning({ id: classes.id })
    cleanupIds.classes.push(testClass.id)

    // 4. Assign Guru to Class
    const [assignment] = await db.insert(teacherAssignments).values({
      teacherId: guru.id,
      classId: testClass.id,
      academicYearId: academicYearId,
      status: 'active'
    }).returning({ id: teacherAssignments.id })
    cleanupIds.teacherAssignments.push(assignment.id)

    // 5. Create Students: one assigned, one unrelated
    const [assignedStudent] = await db.insert(students).values({
      // nis: `NIS_A_${Date.now()}`,
      fullName: 'Assigned Student Test',
      status: 'active',
      enrollmentDate: new Date().toISOString().split('T')[0],
      gender: 'L'
    }).returning({ id: students.id })
    cleanupIds.students.push(assignedStudent.id)

    const [unrelatedStudent] = await db.insert(students).values({
      // nis: `NIS_B_${Date.now()}`,
      fullName: 'Unrelated Student Test',
      status: 'active',
      enrollmentDate: new Date().toISOString().split('T')[0],
      gender: 'L'
    }).returning({ id: students.id })
    cleanupIds.students.push(unrelatedStudent.id)

    // 6. Enroll assigned student to the class
    const [enrollment] = await db.insert(enrollments).values({
      studentId: assignedStudent.id,
      classId: testClass.id,
      academicYearId: academicYearId,
      status: 'active'
    }).returning({ id: enrollments.id })
    cleanupIds.enrollments.push(enrollment.id)

    // 7. Create Tasmi records for both
    const [tasmiAssigned] = await db.insert(tasmiSessions).values({
      studentId: assignedStudent.id,
      examinerId: guru.id,
      mode: 'JUZ_RANGE',
      startJuz: 1,
      endJuz: 5,
      sessionDate: new Date().toISOString().split('T')[0],
      status: 'PASSED'
    }).returning({ id: tasmiSessions.id })
    cleanupIds.tasmiSessions.push(tasmiAssigned.id)

    const [tasmiUnrelated] = await db.insert(tasmiSessions).values({
      studentId: unrelatedStudent.id,
      examinerId: guru.id,
      mode: 'SURAH',
      surahId: 67,
      sessionDate: new Date().toISOString().split('T')[0],
      status: 'NEEDS_REVIEW'
    }).returning({ id: tasmiSessions.id })
    cleanupIds.tasmiSessions.push(tasmiUnrelated.id)

    // 8. Test Admin Query
    const adminList = await getGlobalTasmiHistory({
      page: 1,
      pageSize: 100,
    })
    const foundAdminAssigned = adminList.data.some(r => r.id === tasmiAssigned.id)
    const foundAdminUnrelated = adminList.data.some(r => r.id === tasmiUnrelated.id)

    if (!foundAdminAssigned || !foundAdminUnrelated) {
      throw new Error('Admin list did not return all inserted test sessions')
    }
    console.log('✅ Admin query test passed')

    // 9. Test Guru Scope Query
    const guruList = await getGlobalTasmiHistory({
      page: 1,
      pageSize: 100,
      teacherId: guru.id
    })
    
    const foundGuruAssigned = guruList.data.some(r => r.id === tasmiAssigned.id)
    const foundGuruUnrelated = guruList.data.some(r => r.id === tasmiUnrelated.id)

    if (!foundGuruAssigned) throw new Error('Guru list failed to return assigned student tasmi')
    if (foundGuruUnrelated) throw new Error('SECURITY BREACH: Guru list returned unrelated student tasmi')

    console.log('✅ Guru scoped query test passed')

  } catch (err) {
    console.error('❌ Test failed', err)
    process.exit(1)
  } finally {
    console.log('Cleaning up fixtures...')
    if (cleanupIds.tasmiSessions.length > 0) await db.delete(tasmiSessions).where(inArray(tasmiSessions.id, cleanupIds.tasmiSessions))
    if (cleanupIds.enrollments.length > 0) await db.delete(enrollments).where(inArray(enrollments.id, cleanupIds.enrollments))
    if (cleanupIds.students.length > 0) await db.delete(students).where(inArray(students.id, cleanupIds.students))
    if (cleanupIds.teacherAssignments.length > 0) await db.delete(teacherAssignments).where(inArray(teacherAssignments.id, cleanupIds.teacherAssignments))
    if (cleanupIds.classes.length > 0) await db.delete(classes).where(inArray(classes.id, cleanupIds.classes))
    if (cleanupIds.users.length > 0) await db.delete(users).where(inArray(users.id, cleanupIds.users))
    console.log('Cleanup complete.')
  }
}

run().then(() => process.exit(0)).catch(e => {
  console.error(e)
  process.exit(1)
})
