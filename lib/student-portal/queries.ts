import { db } from '@/lib/db/client'
import { students, enrollments, classes, programs, academicYears, teacherAssignments, users } from '@/drizzle/schema'
import { eq, and, desc } from 'drizzle-orm'
import { requireSelfStudentProfile } from '@/lib/identity/learner'
import { getStudentScholarships } from '@/lib/finance/scholarships/queries'
import { getActiveAcademicContext } from '@/lib/db/queries/academic-context'

export async function getMyAcademicProfile(userId: number) {
  const profile = await requireSelfStudentProfile(userId)
  const studentId = Number(profile.id)

  const [studentRow] = await db.select({
    id: students.id,
    fullName: students.fullName,
    nickname: students.nickname,
    gender: students.gender,
    status: students.status,
  })
  .from(students)
  .where(eq(students.id, studentId))
  .limit(1)

  if (!studentRow) return null

  const activeYear = await getActiveAcademicContext()
  let activeEnrollment = null

  if (activeYear) {
    const [enrollmentRow] = await db.select({
      id: enrollments.id,
      className: classes.name,
      programName: programs.name,
      academicYearName: academicYears.name,
    })
    .from(enrollments)
    .innerJoin(classes, eq(classes.id, enrollments.classId))
    .innerJoin(programs, eq(programs.id, classes.programId))
    .innerJoin(academicYears, eq(academicYears.id, enrollments.academicYearId))
    .where(and(
      eq(enrollments.studentId, studentId),
      eq(enrollments.academicYearId, activeYear.id),
      eq(enrollments.status, 'active')
    ))
    .limit(1)

    activeEnrollment = enrollmentRow || null
  }

  return {
    ...studentRow,
    activeEnrollment
  }
}

export async function getMyEnrollmentHistory(userId: number) {
  const profile = await requireSelfStudentProfile(userId)
  const studentId = Number(profile.id)

  const rows = await db.select({
    id: enrollments.id,
    academicYearName: academicYears.name,
    className: classes.name,
    programName: programs.name,
    startDate: academicYears.startDate,
    endDate: academicYears.endDate,
    isActive: academicYears.isActive,
    status: enrollments.status
  })
  .from(enrollments)
  .innerJoin(academicYears, eq(academicYears.id, enrollments.academicYearId))
  .innerJoin(classes, eq(classes.id, enrollments.classId))
  .innerJoin(programs, eq(programs.id, classes.programId))
  .where(eq(enrollments.studentId, studentId))
  .orderBy(desc(academicYears.startDate))

  return rows
}

export async function getMyCurrentTeachers(userId: number) {
  const profile = await requireSelfStudentProfile(userId)
  const studentId = Number(profile.id)

  const activeYear = await getActiveAcademicContext()
  if (!activeYear) return []

  const rows = await db.select({
    id: teacherAssignments.id,
    teacherName: users.fullName,
    className: classes.name,
    programName: programs.name,
    academicYearName: academicYears.name,
    isActive: academicYears.isActive,
    status: teacherAssignments.status
  })
  .from(enrollments)
  .innerJoin(classes, eq(classes.id, enrollments.classId))
  .innerJoin(programs, eq(programs.id, classes.programId))
  .innerJoin(academicYears, eq(academicYears.id, enrollments.academicYearId))
  .innerJoin(teacherAssignments, and(
    eq(teacherAssignments.classId, classes.id),
    eq(teacherAssignments.academicYearId, academicYears.id)
  ))
  .innerJoin(users, eq(users.id, teacherAssignments.teacherId))
  .where(and(
    eq(enrollments.studentId, studentId),
    eq(enrollments.academicYearId, activeYear.id),
    eq(enrollments.status, 'active'),
    eq(teacherAssignments.status, 'ACTIVE')
  ))
  .orderBy(classes.name)

  return rows
}

export async function getMyTeacherHistory(userId: number) {
  const profile = await requireSelfStudentProfile(userId)
  const studentId = Number(profile.id)

  const rows = await db.select({
    id: teacherAssignments.id,
    teacherName: users.fullName,
    className: classes.name,
    programName: programs.name,
    academicYearName: academicYears.name,
    isActive: academicYears.isActive,
    status: teacherAssignments.status
  })
  .from(enrollments)
  .innerJoin(academicYears, eq(academicYears.id, enrollments.academicYearId))
  .innerJoin(classes, eq(classes.id, enrollments.classId))
  .innerJoin(programs, eq(programs.id, classes.programId))
  .innerJoin(teacherAssignments, and(
    eq(teacherAssignments.classId, classes.id),
    eq(teacherAssignments.academicYearId, academicYears.id)
  ))
  .innerJoin(users, eq(users.id, teacherAssignments.teacherId))
  .where(eq(enrollments.studentId, studentId))
  .orderBy(desc(academicYears.startDate), classes.name)

  return rows
}

export async function getMyScholarships(userId: number) {
  const profile = await requireSelfStudentProfile(userId)
  const studentId = Number(profile.id)
  
  return await getStudentScholarships(studentId)
}
