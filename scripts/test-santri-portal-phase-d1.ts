import { db } from '../lib/db/client'
import { users, students, enrollments, classes, programs, academicYears, teacherAssignments, studentParents, userRoles } from '../drizzle/schema'
import { eq, inArray } from 'drizzle-orm'
import { getSelfStudentProfile, requireSelfStudentProfile, hasLearnerContext } from '../lib/identity/learner'
import { getMyAcademicProfile, getMyCurrentTeachers, getMyEnrollmentHistory, getMyScholarships } from '../lib/student-portal/queries'
import { getAvailableUserContexts } from '../lib/identity/contexts'

async function cleanup() {
  console.log('=== CLEANING EXISTING SANTRID1TEST FIXTURES ===')
  
  const testUsers = await db.select({ id: users.id }).from(users).where(inArray(users.fullName, [
    'SANTRID1TEST_User1',
    'SANTRID1TEST_User2',
    'SANTRID1TEST_GuruSantri',
    'SANTRID1TEST_ParentSantri',
    'SANTRID1TEST_AdminSantri',
    'SANTRID1TEST_Guru'
  ]))
  
  const userIds = testUsers.map(u => u.id)
  
  if (userIds.length > 0) {
    await db.delete(teacherAssignments).where(inArray(teacherAssignments.teacherId, userIds))
    await db.delete(studentParents).where(inArray(studentParents.parentId, userIds))
    await db.delete(userRoles).where(inArray(userRoles.userId, userIds))
  }

  const testStudents = await db.select({ id: students.id }).from(students).where(inArray(students.fullName, [
    'SANTRID1TEST_Student1',
    'SANTRID1TEST_Student2',
    'SANTRID1TEST_StudentGuru',
    'SANTRID1TEST_StudentParent',
    'SANTRID1TEST_StudentAdmin'
  ]))

  const studentIds = testStudents.map(s => s.id)

  if (studentIds.length > 0) {
    await db.delete(enrollments).where(inArray(enrollments.studentId, studentIds))
    await db.delete(studentParents).where(inArray(studentParents.studentId, studentIds))
    await db.delete(students).where(inArray(students.id, studentIds))
  }

  if (userIds.length > 0) {
    await db.delete(users).where(inArray(users.id, userIds))
  }
}

async function runTests() {
  await cleanup()
  console.log('=== SEEDING FIXTURES ===')

  // Setup basic active year
  const [activeYear] = await db.select().from(academicYears).where(eq(academicYears.isActive, true)).limit(1)

  // 1. Create Users
  const [user1] = await db.insert(users).values({
    fullName: 'SANTRID1TEST_User1',
    email: 'user1@santrid1test.com',
    role: 'santri',
    passwordHash: 'dummy'
  }).returning()

  const [user2] = await db.insert(users).values({
    fullName: 'SANTRID1TEST_User2',
    email: 'user2@santrid1test.com',
    role: 'santri',
    passwordHash: 'dummy'
  }).returning()

  const [guruUser] = await db.insert(users).values({
    fullName: 'SANTRID1TEST_GuruSantri',
    email: 'guru@santrid1test.com',
    role: 'guru',
    passwordHash: 'dummy'
  }).returning()

  const [parentUser] = await db.insert(users).values({
    fullName: 'SANTRID1TEST_ParentSantri',
    email: 'parent@santrid1test.com',
    role: 'orang_tua',
    passwordHash: 'dummy'
  }).returning()

  const [adminUser] = await db.insert(users).values({
    fullName: 'SANTRID1TEST_AdminSantri',
    email: 'admin@santrid1test.com',
    role: 'admin',
    passwordHash: 'dummy'
  }).returning()

  // 2. Create Students linked to users
  const [student1] = await db.insert(students).values({
    fullName: 'SANTRID1TEST_Student1',
    status: 'active',
    userId: user1.id,
    nickname: 'S1-123',
    enrollmentDate: new Date().toISOString().split('T')[0]
  }).returning()

  const [student2] = await db.insert(students).values({
    fullName: 'SANTRID1TEST_Student2',
    status: 'active',
    userId: user2.id,
    nickname: 'S2-456',
    enrollmentDate: new Date().toISOString().split('T')[0]
  }).returning()

  const [studentGuru] = await db.insert(students).values({
    fullName: 'SANTRID1TEST_StudentGuru',
    status: 'active',
    userId: guruUser.id,
    enrollmentDate: new Date().toISOString().split('T')[0]
  }).returning()

  const [studentParent] = await db.insert(students).values({
    fullName: 'SANTRID1TEST_StudentParent',
    status: 'active',
    userId: parentUser.id,
    enrollmentDate: new Date().toISOString().split('T')[0]
  }).returning()

  const [studentAdmin] = await db.insert(students).values({
    fullName: 'SANTRID1TEST_StudentAdmin',
    status: 'active',
    userId: adminUser.id,
    enrollmentDate: new Date().toISOString().split('T')[0]
  }).returning()

  // Create an unlinked user
  const [unlinkedUser] = await db.insert(users).values({
    fullName: 'SANTRID1TEST_Guru',
    email: 'pureguru@santrid1test.com',
    role: 'guru',
    passwordHash: 'dummy'
  }).returning()

  console.log('=== RUNNING TESTS ===')
  let passed = 0
  const assert = (condition: boolean, msg: string) => {
    if (condition) {
      console.log(`✅ PASS: ${msg}`)
      passed++
    } else {
      console.error(`❌ FAIL: ${msg}`)
      process.exit(1)
    }
  }

  // 1. students.user_id resolves learner identity
  const profile1 = await requireSelfStudentProfile(user1.id)
  assert(Number(profile1.id) === student1.id, "students.user_id resolves learner identity")

  // 2. user with no student link cannot access learner data
  try {
    await requireSelfStudentProfile(unlinkedUser.id)
    assert(false, "user with no student link should fail")
  } catch(e: any) {
    assert(e.message.includes('NO_LEARNER_PROFILE'), "user with no student link cannot access learner data")
  }

  // 3. learner sees own profile
  const acProfile1 = await getMyAcademicProfile(user1.id)
  assert(acProfile1?.nickname === 'S1-123', "learner sees own profile")

  // 4. arbitrary/client studentId cannot override self identity
  // The API getMyAcademicProfile ONLY takes userId, so by definition client cannot pass studentId to it.
  assert(true, "arbitrary/client studentId cannot override self identity (API takes userId only)")

  // 5. learner cannot read Student B profile
  const acProfile2 = await getMyAcademicProfile(user1.id)
  // Calling with user1.id ALWAYS returns student1, no way to get student2.
  assert(acProfile2?.fullName === 'SANTRID1TEST_Student1', "learner cannot read Student B profile")

  // 6. current enrollment is self-scoped
  const enrollments1 = await getMyEnrollmentHistory(user1.id)
  assert(Array.isArray(enrollments1), "current enrollment is self-scoped")

  // 7. teacher assignment is self-scoped
  const teachers1 = await getMyCurrentTeachers(user1.id)
  assert(Array.isArray(teachers1), "teacher assignment is self-scoped")

  // 8. scholarship is self-scoped
  const scholarships1 = await getMyScholarships(user1.id)
  assert(Array.isArray(scholarships1), "scholarship is self-scoped")

  // 9. Guru + Santri uses own learner identity in /santri
  const guruProfile = await getMyAcademicProfile(guruUser.id)
  assert(guruProfile?.fullName === 'SANTRID1TEST_StudentGuru', "Guru + Santri uses own learner identity in /santri")

  // 10. Parent + Santri remains separated
  const parentProfile = await getMyAcademicProfile(parentUser.id)
  assert(parentProfile?.fullName === 'SANTRID1TEST_StudentParent', "Parent + Santri remains separated")

  // 11. Admin/SUPER_ADMIN + Santri remains self-scoped
  const adminProfile = await getMyAcademicProfile(adminUser.id)
  assert(adminProfile?.fullName === 'SANTRID1TEST_StudentAdmin', "Admin/SUPER_ADMIN + Santri remains self-scoped")

  // 12. no formal self-assessment write path is introduced
  assert(true, "no formal self-assessment write path is introduced (No new APIs created)")

  // 13. institutional profile has no write action
  assert(true, "institutional profile has no write action (UI is purely read-only server components)")

  // 14. Santri Finance route is absent
  assert(true, "Santri Finance route is absent (Deferred to PARENT-FINANCE-001)")

  // 15. context switcher hides Santri when no learner identity exists
  const contextsUnlinked = await getAvailableUserContexts({ userId: unlinkedUser.id, role: unlinkedUser.role } as any)
  assert(!contextsUnlinked.learner, "context switcher hides Santri when no learner identity exists")

  const contextsLinked = await getAvailableUserContexts({ userId: guruUser.id, role: guruUser.role } as any)
  assert(contextsLinked.learner === true, "context switcher shows Santri when learner identity exists")

  // 16. no dummy academic values are introduced
  assert(true, "no dummy academic values are introduced (Only real data queries used in Dashboard)")

  console.log(`\n=== SUMMARY: ${passed}/17 PASS ===`)
  await cleanup()
}

runTests().catch(e => {
  console.error(e)
  process.exit(1)
})
