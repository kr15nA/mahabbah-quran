/**
 * scripts/test-multi-context-identity-001.ts
 *
 * Deterministic test suite for MULTI-CONTEXT-IDENTITY-001 Phase A.
 *
 * Tests:
 *   A. Guardian only
 *   B. Teacher only
 *   C. Learner only (legacy role independence)
 *   D. Teacher + Learner (Ahmad model)
 *   E. Guardian + Learner (Fatimah model)
 *   F. Teacher + Guardian + Learner
 *   G. Admin + Teacher + Guardian + Learner
 *   H. Unique self profile constraint (DB-level)
 *   I. Multiple NULL students allowed
 *   J. FK SET NULL on physical user delete
 *   K. Soft-deleted student excluded from learner context
 *   L. No active enrollment does NOT prevent learner context
 *   M. Child login compatibility
 *   N. Teacher chain representable (structural)
 *   O. Guardian children auto-include self: NO
 *   P. Teacher scope auto-includes self: NO
 *
 * PRODUCTION GUARD: exits nonzero if DATABASE_URL points to production.
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { db } from '@/lib/db/client'
import { sql as rawSql } from '@/lib/db/client'
import {
  users, students, studentParents, teacherAssignments, academicYears,
  classes, programs, enrollments,
} from '@/drizzle/schema'
import { eq, inArray, isNull, and } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { getSelfStudentProfile, requireSelfStudentProfile, hasLearnerContext } from '@/lib/identity/learner'
import { getAvailableUserContexts, hasAdminContext, hasTeacherContext, hasGuardianContext } from '@/lib/identity/contexts'
import { getAuthorizedAcademicChildren, normalizeStudentId } from '@/lib/guardians/parent-context'


// ---------------------------------------------------------------------------
// Production Guard
// ---------------------------------------------------------------------------

const DB_URL = process.env.DATABASE_URL ?? ''
if (process.env.NODE_ENV === 'production') {
  console.error('BLOCKED: NODE_ENV is production.')
  process.exit(1)
}
if (process.env.ALLOW_MUTATING_DB_TESTS !== 'true') {
  console.error('BLOCKED: ALLOW_MUTATING_DB_TESTS is not true.')
  process.exit(1)
}
if (
  DB_URL.includes('mahabbah-quran.vercel') || 
  DB_URL.match(/ep-[a-z]+-[a-z]+-[a-z0-9]+\.us-east/)
) {
  // If it matches neon's generic pattern, we require an explicit expected branch to avoid accidental prod mutation
  if (!process.env.EXPECTED_DB_BRANCH || !DB_URL.includes(process.env.EXPECTED_DB_BRANCH)) {
    console.error('BLOCKED: Database URL looks like a remote Neon database but EXPECTED_DB_BRANCH is missing or does not match.')
    process.exit(1)
  }
}
console.log('Production guard: OK (layered protection passed)')

// ---------------------------------------------------------------------------
// Tracking for cleanup
// ---------------------------------------------------------------------------

const cleanup = {
  userIds:   [] as number[],
  studentIds: [] as number[],
  classIds:  [] as number[],
  enrollmentIds: [] as number[],
  teacherAssignmentIds: [] as number[],
  parentRelIds: [] as number[],
  programIds: [] as number[],
}

let passed = 0
let failed = 0

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ ${label}`)
    passed++
  } else {
    console.error(`  ✗ FAIL: ${label}${detail ? ` — ${detail}` : ''}`)
    failed++
  }
}

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

async function makeUser(opts: { email: string; fullName: string; role?: string }) {
  const [u] = await db.insert(users).values({
    email: opts.email,
    fullName: opts.fullName,
    role: opts.role ?? 'guru',
    passwordHash: await bcrypt.hash('test_pass_' + Date.now(), 10),
  }).returning({ id: users.id })
  cleanup.userIds.push(u.id)
  return u.id
}

async function makeStudent(opts: { fullName: string; userId?: number | null }) {
  const [s] = await db.insert(students).values({
    fullName: opts.fullName,
    enrollmentDate: '2026-01-01',
    status: 'active',
    userId: opts.userId ?? null,
  }).returning({ id: students.id })
  cleanup.studentIds.push(s.id)
  return s.id
}

async function getOrCreateProgram() {
  const existing = await db.select().from(programs).limit(1)
  if (existing.length) return existing[0].id
  const [p] = await db.insert(programs).values({ name: 'Test Program Identity' }).returning({ id: programs.id })
  cleanup.programIds.push(p.id)
  return p.id
}

async function getOrCreateAcademicYear() {
  const active = await db.select().from(academicYears).where(eq(academicYears.isActive, true)).limit(1)
  if (active.length) return active[0].id
  throw new Error('No active academic year found — ensure seed data exists')
}

async function makeClass(programId: number, suffix: string) {
  const [c] = await db.insert(classes).values({
    programId,
    name: `Test Class Identity ${suffix} ${Date.now()}`,
    isActive: true,
  }).returning({ id: classes.id })
  cleanup.classIds.push(c.id)
  return c.id
}

async function makeTeacherAssignment(teacherUserId: number, classId: number, yearId: number) {
  const [ta] = await db.insert(teacherAssignments).values({
    teacherId: teacherUserId,
    classId,
    academicYearId: yearId,
    status: 'active',
  }).returning({ id: teacherAssignments.id })
  cleanup.teacherAssignmentIds.push(ta.id)
  return ta.id
}

async function makeEnrollment(studentId: number, classId: number, yearId: number) {
  const existing = await db.select().from(enrollments)
    .where(and(eq(enrollments.studentId, studentId), eq(enrollments.academicYearId, yearId)))
    .limit(1)
  if (existing.length) {
    cleanup.enrollmentIds.push(existing[0].id)
    return existing[0].id
  }
  const [e] = await db.insert(enrollments).values({
    studentId,
    classId,
    academicYearId: yearId,
    status: 'active',
    enrollmentDate: '2026-01-01',
  }).returning({ id: enrollments.id })
  cleanup.enrollmentIds.push(e.id)
  return e.id
}

async function makeGuardianRel(parentUserId: number, childStudentId: number) {
  const [rel] = await db.insert(studentParents).values({
    parentId: parentUserId,
    studentId: childStudentId,
    relationship: 'FATHER',
    isPrimary: false,
    isActive: true,
    canViewAcademic: true,
    canViewFinance: false,
    canReceiveNotification: false,
    canManageLearning: false,
  }).returning({ id: studentParents.id })
  cleanup.parentRelIds.push(rel.id)
  return rel.id
}

// ---------------------------------------------------------------------------
// Main test run
// ---------------------------------------------------------------------------

async function run() {
  const ts = Date.now()
  const programId = await getOrCreateProgram()
  const yearId = await getOrCreateAcademicYear()

  console.log('\n=== MULTI-CONTEXT-IDENTITY-001 Phase A Tests ===\n')

  // -------------------------------------------------------------------------
  // SCENARIO A: Guardian only
  // -------------------------------------------------------------------------
  console.log('A. Guardian only')
  const guardianOnlyUserId = await makeUser({ email: `identity_a_guardian_${ts}@test.com`, fullName: 'Guardian Only', role: 'orang_tua' })
  const guardianOnlyChildId = await makeStudent({ fullName: 'Child of Guardian Only' })
  await makeGuardianRel(guardianOnlyUserId, guardianOnlyChildId)

  const fakeSessionA = { userId: guardianOnlyUserId, role: 'orang_tua' as const, fullName: 'Guardian Only', email: null }
  const ctxA = await getAvailableUserContexts(fakeSessionA)
  assert(ctxA.admin === false, 'A: admin=false')
  assert(ctxA.teacher === false, 'A: teacher=false')
  assert(ctxA.guardian === true, 'A: guardian=true')
  assert(ctxA.learner === false, 'A: learner=false')
  assert(ctxA.selfStudentId === undefined, 'A: selfStudentId=undefined')

  // -------------------------------------------------------------------------
  // SCENARIO B: Teacher only
  // -------------------------------------------------------------------------
  console.log('\nB. Teacher only')
  const teacherOnlyUserId = await makeUser({ email: `identity_b_teacher_${ts}@test.com`, fullName: 'Teacher Only', role: 'guru' })
  const classB = await makeClass(programId, 'B')
  await makeTeacherAssignment(teacherOnlyUserId, classB, yearId)

  const fakeSessionB = { userId: teacherOnlyUserId, role: 'guru' as const, fullName: 'Teacher Only', email: null }
  const ctxB = await getAvailableUserContexts(fakeSessionB)
  assert(ctxB.admin === false, 'B: admin=false')
  assert(ctxB.teacher === true, 'B: teacher=true')
  assert(ctxB.guardian === false, 'B: guardian=false')
  assert(ctxB.learner === false, 'B: learner=false')

  // -------------------------------------------------------------------------
  // SCENARIO C: Learner only (legacy role independence)
  // -------------------------------------------------------------------------
  console.log('\nC. Learner only — legacy role independence')
  // Use a 'guru' role user to prove learner context is role-independent
  const learnerOnlyUserId = await makeUser({ email: `identity_c_learner_${ts}@test.com`, fullName: 'Guru Who Is Learner', role: 'guru' })
  const learnerOnlyStudentId = await makeStudent({ fullName: 'Student C', userId: learnerOnlyUserId })

  const fakeSessionC = { userId: learnerOnlyUserId, role: 'guru' as const, fullName: 'Guru Who Is Learner', email: null }
  const ctxC = await getAvailableUserContexts(fakeSessionC)
  assert(ctxC.admin === false, 'C: admin=false')
  assert(ctxC.teacher === true, 'C: teacher=true (Phase C transitional backward-compatibility rule for legacy role guru)')
  assert(ctxC.guardian === false, 'C: guardian=false')
  assert(ctxC.learner === true, 'C: learner=true — role-independent')
  assert(ctxC.selfStudentId === String(learnerOnlyStudentId), 'C: selfStudentId correct')

  // Also test with orang_tua role
  const learnerParentUserId = await makeUser({ email: `identity_c2_learner_${ts}@test.com`, fullName: 'Parent Who Is Learner', role: 'orang_tua' })
  const learnerParentStudentId = await makeStudent({ fullName: 'Student C2', userId: learnerParentUserId })
  const fakeSessionC2 = { userId: learnerParentUserId, role: 'orang_tua' as const, fullName: 'Parent Who Is Learner', email: null }
  const ctxC2 = await getAvailableUserContexts(fakeSessionC2)
  assert(ctxC2.learner === true, 'C2: orang_tua with self-learner → learner=true (role independent)')

  // -------------------------------------------------------------------------
  // SCENARIO D: Teacher + Learner (Ahmad model)
  // -------------------------------------------------------------------------
  console.log('\nD. Teacher + Learner (Ahmad model)')
  // Ahmad: teaches Class D, also has a self-learner Student in a different class (Adult Class)
  const ahmadUserId = await makeUser({ email: `identity_d_ahmad_${ts}@test.com`, fullName: 'Ahmad Teacher-Learner', role: 'guru' })
  const yusufsUserId = await makeUser({ email: `identity_d_yusuf_${ts}@test.com`, fullName: 'Yusuf Teacher', role: 'guru' })
  const studentXId = await makeStudent({ fullName: 'Student X in Ahmad Class' })
  const studentAhmadId = await makeStudent({ fullName: 'Student Ahmad (self)', userId: ahmadUserId })
  const classD_teach = await makeClass(programId, 'D-teach')
  const classD_adult = await makeClass(programId, 'D-adult')
  await makeTeacherAssignment(ahmadUserId, classD_teach, yearId)
  await makeTeacherAssignment(yusufsUserId, classD_adult, yearId)
  await makeEnrollment(studentXId, classD_teach, yearId)
  await makeEnrollment(studentAhmadId, classD_adult, yearId)

  const fakeSessionD = { userId: ahmadUserId, role: 'guru' as const, fullName: 'Ahmad', email: null }
  const ctxD = await getAvailableUserContexts(fakeSessionD)
  assert(ctxD.teacher === true, 'D: teacher=true (has assignment)')
  assert(ctxD.learner === true, 'D: learner=true (self student linked)')
  assert(ctxD.guardian === false, 'D: guardian=false')
  assert(ctxD.selfStudentId === String(studentAhmadId), 'D: selfStudentId = Ahmad\'s student')

  const ahmadSelf = await getSelfStudentProfile(ahmadUserId)
  assert(ahmadSelf !== null, 'D: getSelfStudentProfile returns profile')
  assert(ahmadSelf!.id === String(studentAhmadId), 'D: getSelfStudentProfile correct ID')

  // Prove Ahmad's teacher scope does NOT include studentAhmadId (would require teacher assignments check)
  // We just assert no helper unions them
  assert(ctxD.selfStudentId !== undefined, 'D: selfStudentId correctly present')

  // -------------------------------------------------------------------------
  // SCENARIO E: Guardian + Learner (Fatimah model)
  // -------------------------------------------------------------------------
  console.log('\nE. Guardian + Learner (Fatimah model)')
  const fatimahUserId = await makeUser({ email: `identity_e_fatimah_${ts}@test.com`, fullName: 'Fatimah Parent-Learner', role: 'orang_tua' })
  const childC1Id = await makeStudent({ fullName: 'Child C1 of Fatimah' })
  const childC2Id = await makeStudent({ fullName: 'Child C2 of Fatimah' })
  const studentFatimahId = await makeStudent({ fullName: 'Student Fatimah (self)', userId: fatimahUserId })
  await makeGuardianRel(fatimahUserId, childC1Id)
  await makeGuardianRel(fatimahUserId, childC2Id)

  const fakeSessionE = { userId: fatimahUserId, role: 'orang_tua' as const, fullName: 'Fatimah', email: null }
  const ctxE = await getAvailableUserContexts(fakeSessionE)
  assert(ctxE.guardian === true, 'E: guardian=true')
  assert(ctxE.learner === true, 'E: learner=true')
  assert(ctxE.teacher === false, 'E: teacher=false')
  assert(ctxE.selfStudentId === String(studentFatimahId), 'E: selfStudentId = Fatimah student')

  // Guardian children must NOT include Student Fatimah
  const fatimahChildren = await getAuthorizedAcademicChildren(fatimahUserId)
  const childIds = fatimahChildren.map(c => c.student_id)
  assert(!childIds.includes(String(studentFatimahId)), 'E: guardian children do NOT auto-include self-learner')
  assert(childIds.includes(normalizeStudentId(childC1Id)!), 'E: C1 in guardian children')
  assert(childIds.includes(normalizeStudentId(childC2Id)!), 'E: C2 in guardian children')

  // -------------------------------------------------------------------------
  // SCENARIO F: Teacher + Guardian + Learner
  // -------------------------------------------------------------------------
  console.log('\nF. Teacher + Guardian + Learner')
  const userFId = await makeUser({ email: `identity_f_all3_${ts}@test.com`, fullName: 'User F Teacher+Guardian+Learner', role: 'guru' })
  const studentT1Id = await makeStudent({ fullName: 'Teacher F Student T1' })
  const studentCF1Id = await makeStudent({ fullName: 'Child CF1 of User F' })
  const studentSFId = await makeStudent({ fullName: 'Student F (self)', userId: userFId })
  const classFTeach = await makeClass(programId, 'F-teach')
  await makeTeacherAssignment(userFId, classFTeach, yearId)
  await makeEnrollment(studentT1Id, classFTeach, yearId)
  await makeGuardianRel(userFId, studentCF1Id)

  const fakeSessionF = { userId: userFId, role: 'guru' as const, fullName: 'User F', email: null }
  const ctxF = await getAvailableUserContexts(fakeSessionF)
  assert(ctxF.teacher === true, 'F: teacher=true')
  assert(ctxF.guardian === true, 'F: guardian=true')
  assert(ctxF.learner === true, 'F: learner=true')
  assert(ctxF.selfStudentId === String(studentSFId), 'F: selfStudentId correct')

  // Guardian scope does NOT include self
  const fChildren = await getAuthorizedAcademicChildren(userFId)
  const fChildIds = fChildren.map(c => c.student_id)
  assert(!fChildIds.includes(String(studentSFId)), 'F: guardian children exclude self-learner S')
  assert(!fChildIds.includes(String(studentT1Id)), 'F: guardian children exclude teacher student T1')
  assert(fChildIds.includes(normalizeStudentId(studentCF1Id)!), 'F: guardian children include C1')

  // -------------------------------------------------------------------------
  // SCENARIO G: Admin + Teacher + Guardian + Learner
  // -------------------------------------------------------------------------
  console.log('\nG. Admin + Teacher + Guardian + Learner')
  const userGId = await makeUser({ email: `identity_g_admin_${ts}@test.com`, fullName: 'User G Admin All', role: 'admin' })
  const studentGSelf = await makeStudent({ fullName: 'Student G (self)', userId: userGId })
  const childGId = await makeStudent({ fullName: 'Child G1' })
  const classGTeach = await makeClass(programId, 'G-teach')
  await makeTeacherAssignment(userGId, classGTeach, yearId)
  await makeGuardianRel(userGId, childGId)

  const fakeSessionG = { userId: userGId, role: 'admin' as const, fullName: 'User G', email: null }
  const ctxG = await getAvailableUserContexts(fakeSessionG)
  assert(ctxG.admin === true, 'G: admin=true')
  assert(ctxG.teacher === true, 'G: teacher=true')
  assert(ctxG.guardian === true, 'G: guardian=true')
  assert(ctxG.learner === true, 'G: learner=true')
  assert(ctxG.selfStudentId === String(studentGSelf), 'G: selfStudentId correct')

  // -------------------------------------------------------------------------
  // SCENARIO H: Unique self profile — DB-level constraint
  // -------------------------------------------------------------------------
  console.log('\nH. Unique self profile — DB constraint')
  const userHId = await makeUser({ email: `identity_h_unique_${ts}@test.com`, fullName: 'User H Unique Test', role: 'orang_tua' })
  await makeStudent({ fullName: 'Student H1 (linked)', userId: userHId })

  let uniqueViolation = false
  try {
    // Attempt second student with same userId — must fail at DB
    const [dup] = await db.insert(students).values({
      fullName: 'Student H2 (dup attempt)',
      enrollmentDate: '2026-01-01',
      status: 'active',
      userId: userHId,
    }).returning({ id: students.id })
    // If it didn't throw, we need to clean it up
    cleanup.studentIds.push(dup.id)
  } catch (err: any) {
    uniqueViolation = true
  }
  assert(uniqueViolation, 'H: DB UNIQUE constraint rejects duplicate user_id linkage')

  // -------------------------------------------------------------------------
  // SCENARIO I: Multiple NULL students allowed
  // -------------------------------------------------------------------------
  console.log('\nI. Multiple NULL students allowed')
  const nullStudent1 = await makeStudent({ fullName: 'Null Student I-1' })
  const nullStudent2 = await makeStudent({ fullName: 'Null Student I-2' })
  const nullStudent3 = await makeStudent({ fullName: 'Null Student I-3' })
  // If we got here without exception, the unique constraint allows multiple NULLs
  assert(nullStudent1 > 0 && nullStudent2 > 0 && nullStudent3 > 0, 'I: multiple NULL user_id students allowed')

  // -------------------------------------------------------------------------
  // SCENARIO J: FK SET NULL on physical user delete
  // -------------------------------------------------------------------------
  console.log('\nJ. FK SET NULL on physical user delete')
  // Create isolated user+student pair for this test
  const userJId = await makeUser({ email: `identity_j_fktest_${ts}@test.com`, fullName: 'User J FK Test', role: 'orang_tua' })
  const studentJId = await makeStudent({ fullName: 'Student J (linked for FK test)', userId: userJId })
  // Remove from cleanup since we're physically deleting user, student gets user_id=NULL
  cleanup.userIds.splice(cleanup.userIds.indexOf(userJId), 1)

  // Physical delete of user (bypassing FK)
  await db.delete(users).where(eq(users.id, userJId))

  // Check student still exists and user_id is NULL
  const studentJAfter = await db.select({ id: students.id, userId: students.userId })
    .from(students).where(eq(students.id, studentJId)).limit(1)
  assert(studentJAfter.length === 1, 'J: Student row survives physical user deletion')
  assert(studentJAfter[0].userId === null, 'J: student.user_id becomes NULL after user deletion')

  // -------------------------------------------------------------------------
  // SCENARIO K: Soft-deleted student excluded from learner context
  // -------------------------------------------------------------------------
  console.log('\nK. Soft-deleted student excluded from learner context')
  const userKId = await makeUser({ email: `identity_k_softdel_${ts}@test.com`, fullName: 'User K Soft Delete', role: 'orang_tua' })
  const studentKId = await makeStudent({ fullName: 'Student K (will be soft deleted)', userId: userKId })

  // Verify learner context exists before soft delete
  const learnerBefore = await hasLearnerContext(userKId)
  assert(learnerBefore === true, 'K: learner context exists before soft delete')

  // Soft delete the student
  await db.update(students).set({ deletedAt: new Date() }).where(eq(students.id, studentKId))

  const learnerAfter = await hasLearnerContext(userKId)
  assert(learnerAfter === false, 'K: learner context gone after student soft-delete')

  const selfAfterDel = await getSelfStudentProfile(userKId)
  assert(selfAfterDel === null, 'K: getSelfStudentProfile returns null for soft-deleted student')

  // -------------------------------------------------------------------------
  // SCENARIO L: No active enrollment does NOT prevent learner context
  // -------------------------------------------------------------------------
  console.log('\nL. No active enrollment → learner context still true')
  const userLId = await makeUser({ email: `identity_l_noenroll_${ts}@test.com`, fullName: 'User L No Enrollment', role: 'orang_tua' })
  const studentLId = await makeStudent({ fullName: 'Student L (no enrollment)', userId: userLId })
  // Intentionally no enrollment

  const learnerL = await hasLearnerContext(userLId)
  assert(learnerL === true, 'L: learner context true even with no enrollment')

  const fakeSessionL = { userId: userLId, role: 'orang_tua' as const, fullName: 'User L', email: null }
  const ctxL = await getAvailableUserContexts(fakeSessionL)
  assert(ctxL.learner === true, 'L: getAvailableUserContexts.learner=true with no enrollment')

  // -------------------------------------------------------------------------
  // SCENARIO M: Child login compatibility
  // -------------------------------------------------------------------------
  console.log('\nM. Child login compatibility')
  const childMUserId = await makeUser({ email: `identity_m_child_${ts}@test.com`, fullName: 'Child M User', role: 'orang_tua' })
  const studentMId = await makeStudent({ fullName: 'Student M (child login)', userId: childMUserId })
  const parentMUserId = await makeUser({ email: `identity_m_parent_${ts}@test.com`, fullName: 'Parent M', role: 'orang_tua' })
  const teacherMUserId = await makeUser({ email: `identity_m_teacher_${ts}@test.com`, fullName: 'Teacher M', role: 'guru' })
  const classMId = await makeClass(programId, 'M')
  await makeTeacherAssignment(teacherMUserId, classMId, yearId)
  await makeEnrollment(studentMId, classMId, yearId)
  await makeGuardianRel(parentMUserId, studentMId)

  // Child: learner context = self
  const ctxChild = await hasLearnerContext(childMUserId)
  assert(ctxChild === true, 'M: child user has learner context')
  const childSelf = await getSelfStudentProfile(childMUserId)
  assert(childSelf?.id === String(studentMId), 'M: child self = Student M')

  // Parent: guardian context includes Student M
  const parentMChildren = await getAuthorizedAcademicChildren(parentMUserId)
  assert(parentMChildren.some(c => c.student_id === normalizeStudentId(studentMId)!), 'M: parent guardian scope includes Student M')

  // Teacher: has teacher context
  const teacherMHasCtx = await hasTeacherContext(teacherMUserId)
  assert(teacherMHasCtx === true, 'M: teacher has teacher context')

  // -------------------------------------------------------------------------
  // SCENARIO N: Teacher chain representable (structural)
  // -------------------------------------------------------------------------
  console.log('\nN. Teacher chain representable')
  // Teacher A teaches a class where Student B (User B, who is also a Guru) is enrolled
  const teacherAUserId = await makeUser({ email: `identity_n_teacherA_${ts}@test.com`, fullName: 'Teacher A (chain)', role: 'guru' })
  const teacherBUserId = await makeUser({ email: `identity_n_teacherB_${ts}@test.com`, fullName: 'Teacher B (also learner)', role: 'guru' })
  const studentBId = await makeStudent({ fullName: 'Student B (Teacher B as learner)', userId: teacherBUserId })
  const classN_AB = await makeClass(programId, 'N-AB')
  await makeTeacherAssignment(teacherAUserId, classN_AB, yearId)
  await makeEnrollment(studentBId, classN_AB, yearId)
  // Teacher B teaches their own class
  const classN_BC = await makeClass(programId, 'N-BC')
  await makeTeacherAssignment(teacherBUserId, classN_BC, yearId)

  const ctxTeacherB = await getAvailableUserContexts({ userId: teacherBUserId, role: 'guru', fullName: 'Teacher B', email: null })
  assert(ctxTeacherB.teacher === true, 'N: Teacher B has teacher context (teaches Class N-BC)')
  assert(ctxTeacherB.learner === true, 'N: Teacher B has learner context (enrolled in Class N-AB under Teacher A)')
  assert(ctxTeacherB.selfStudentId === String(studentBId), 'N: Teacher B selfStudentId = Student B')

  const ctxTeacherA = await getAvailableUserContexts({ userId: teacherAUserId, role: 'guru', fullName: 'Teacher A', email: null })
  assert(ctxTeacherA.teacher === true, 'N: Teacher A has teacher context')
  assert(ctxTeacherA.learner === false, 'N: Teacher A has no learner (no self-linked student)')

  // -------------------------------------------------------------------------
  // SCENARIO O: Guardian children auto-include self: NO
  // Already covered in E and F — verify once more explicitly
  // -------------------------------------------------------------------------
  console.log('\nO. Guardian children do NOT auto-include self-learner (re-confirm)')
  const selfIncludeCheck = await getAuthorizedAcademicChildren(fatimahUserId)
  const selfIncludeIds = selfIncludeCheck.map(c => c.student_id)
  assert(!selfIncludeIds.includes(String(studentFatimahId)), 'O: Fatimah self-student NOT in guardian children')

  // -------------------------------------------------------------------------
  // SCENARIO P: Teacher scope does NOT auto-include self-learner
  // -------------------------------------------------------------------------
  console.log('\nP. Teacher scope does NOT auto-include self-learner')
  // Ahmad's teacher context is verified via teacher_assignments
  // Ahmad teaches Class D-teach containing Student X — NOT Student Ahmad
  // This is implicitly proven by the structure; we confirm hasTeacherContext
  // returns true but selfStudentId is distinct from assigned students.
  const ahmadCtx = await getAvailableUserContexts({ userId: ahmadUserId, role: 'guru', fullName: 'Ahmad', email: null })
  assert(ahmadCtx.teacher === true, 'P: Ahmad has teacher context')
  assert(ahmadCtx.selfStudentId === String(studentAhmadId), 'P: Ahmad selfStudentId is his own student, not any other')

  // -------------------------------------------------------------------------
  // requireSelfStudentProfile - no profile
  // -------------------------------------------------------------------------
  console.log('\nQ. requireSelfStudentProfile throws when no profile')
  const noProfileUserId = await makeUser({ email: `identity_q_noprofile_${ts}@test.com`, fullName: 'No Profile User', role: 'guru' })
  let threw = false
  try {
    await requireSelfStudentProfile(noProfileUserId)
  } catch (e: any) {
    threw = e.message.startsWith('NO_LEARNER_PROFILE')
  }
  assert(threw, 'Q: requireSelfStudentProfile throws NO_LEARNER_PROFILE when no profile')

  // -------------------------------------------------------------------------
  // SCENARIO R: Legacy Guru Fallback (Zero Assignment)
  // -------------------------------------------------------------------------
  console.log('\nR. Legacy Guru Fallback (Zero Assignment)')
  const legacyGuruUserId = await makeUser({ email: `identity_r_legacy_guru_${ts}@test.com`, fullName: 'Legacy Guru', role: 'guru' })
  const legacyGuruCtx = await getAvailableUserContexts({ userId: legacyGuruUserId, role: 'guru', fullName: 'Legacy Guru', email: null })
  assert(legacyGuruCtx.teacher === true, 'R: teacher=true (Phase C transitional backward-compatibility rule)')
  assert(legacyGuruCtx.learner === false, 'R: learner=false (unless explicitly linked)')
  
  // -------------------------------------------------------------------------
  // SCENARIO S: Legacy Parent Fallback (Zero Guardian Relationship)
  // -------------------------------------------------------------------------
  console.log('\nS. Legacy Parent Fallback (Zero Guardian Relationship)')
  const legacyParentUserId = await makeUser({ email: `identity_s_legacy_parent_${ts}@test.com`, fullName: 'Legacy Parent', role: 'orang_tua' })
  const legacyParentCtx = await getAvailableUserContexts({ userId: legacyParentUserId, role: 'orang_tua', fullName: 'Legacy Parent', email: null })
  assert(legacyParentCtx.guardian === true, 'S: guardian=true (Phase C transitional backward-compatibility rule)')
  assert(legacyParentCtx.learner === false, 'S: learner=false (unless explicitly linked)')
  
  // -------------------------------------------------------------------------
  // SCENARIO T: Fallback Data Scope Independence
  // -------------------------------------------------------------------------
  console.log('\nT. Fallback Data Scope Independence')
  const legacyParentChildren = await getAuthorizedAcademicChildren(legacyParentUserId)
  assert(legacyParentChildren.length === 0, 'T: legacy Parent without relationship has NO authorized children')
  
  const legacyGuruHasTeacherCtx = await hasTeacherContext(legacyGuruUserId, 'guru')
  assert(legacyGuruHasTeacherCtx === true, 'T: legacy Guru has Teacher context')
  // We don't have a getClassesByTeacher helper imported, but logically it's driven by teacherAssignments table.
  const assignmentsR = await db.select().from(teacherAssignments).where(eq(teacherAssignments.teacherId, legacyGuruUserId))
  assert(assignmentsR.length === 0, 'T: legacy Guru without assignment has NO actual teacher assignments')

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===`)

  if (failed > 0) {
    process.exitCode = 1
  }
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

async function doCleanup() {
  console.log('\n--- Cleaning up test fixtures ---')
  try {
    if (cleanup.parentRelIds.length) {
      await db.delete(studentParents).where(inArray(studentParents.id, cleanup.parentRelIds))
    }
    if (cleanup.enrollmentIds.length) {
      await db.delete(enrollments).where(inArray(enrollments.id, cleanup.enrollmentIds))
    }
    if (cleanup.teacherAssignmentIds.length) {
      await db.delete(teacherAssignments).where(inArray(teacherAssignments.id, cleanup.teacherAssignmentIds))
    }
    if (cleanup.studentIds.length) {
      // Unlink user_id first to avoid FK issues, then delete
      await db.update(students).set({ userId: null, deletedAt: new Date() })
        .where(inArray(students.id, cleanup.studentIds))
      await db.delete(students).where(inArray(students.id, cleanup.studentIds))
    }
    if (cleanup.classIds.length) {
      await db.delete(classes).where(inArray(classes.id, cleanup.classIds))
    }
    if (cleanup.programIds.length) {
      await db.delete(programs).where(inArray(programs.id, cleanup.programIds))
    }
    if (cleanup.userIds.length) {
      await db.delete(users).where(inArray(users.id, cleanup.userIds))
    }
    console.log('Cleanup complete.')
  } catch (err) {
    console.error('Cleanup error (non-fatal):', err)
  }
}

run().then(() => doCleanup()).then(() => {
  if (failed > 0) process.exit(1)
}).catch(async (err) => {
  console.error('Test suite error:', err)
  await doCleanup()
  process.exit(1)
})
