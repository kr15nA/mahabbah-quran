import { getSession, SessionPayload } from '@/lib/auth/session'
import { db } from '@/lib/db/client'
import { classes, studentParents, students, learningReports, enrollments, teacherAssignments, academicYears } from '@/drizzle/schema'
import { eq, and } from 'drizzle-orm'

export class AuthError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

export type CanonicalRole = 'SUPER_ADMIN' | 'GURU' | 'ORANG_TUA'

export function normalizeRole(role: string): CanonicalRole {
  if (role === 'admin') return 'SUPER_ADMIN'
  if (role === 'guru') return 'GURU'
  if (role === 'orang_tua') return 'ORANG_TUA'
  throw new AuthError(403, 'Role not supported')
}

export async function requireAuth(): Promise<{ session: SessionPayload; role: CanonicalRole }> {
  const session = await getSession()
  if (!session) throw new AuthError(401, 'Unauthorized')
  return { session, role: normalizeRole(session.role) }
}

export async function requireStudentAccess(studentId: number): Promise<{ session: SessionPayload; role: CanonicalRole }> {
  const auth = await requireAuth()
  const { session, role } = auth

  if (role === 'SUPER_ADMIN') return auth

  if (role === 'GURU') {
    const isAssigned = await db.select({ id: students.id })
      .from(students)
      .innerJoin(enrollments, eq(enrollments.studentId, students.id))
      .innerJoin(academicYears, and(eq(academicYears.id, enrollments.academicYearId), eq(academicYears.isActive, true)))
      .innerJoin(classes, eq(classes.id, enrollments.classId))
      .innerJoin(teacherAssignments, and(
        eq(teacherAssignments.classId, classes.id),
        eq(teacherAssignments.academicYearId, academicYears.id),
        eq(teacherAssignments.teacherId, session.userId)
      ))
      .where(eq(students.id, studentId))
      .limit(1)
    if (!isAssigned.length) throw new AuthError(403, 'Forbidden: Student not assigned to teacher in active academic year')
  } else if (role === 'ORANG_TUA') {
    const isLinked = await db.select({ id: studentParents.id })
      .from(studentParents)
      .where(and(eq(studentParents.studentId, studentId), eq(studentParents.parentId, session.userId)))
      .limit(1)
    if (!isLinked.length) throw new AuthError(403, 'Forbidden: Student not linked to parent')
  }

  return auth
}

export async function requireClassStudentAccess(classId: number, studentId: number): Promise<{ session: SessionPayload; role: CanonicalRole }> {
  const auth = await requireAuth()
  const { session, role } = auth

  if (role === 'SUPER_ADMIN') return auth

  if (role === 'GURU') {
    const isAssigned = await db.select({ id: students.id })
      .from(students)
      .innerJoin(enrollments, and(eq(enrollments.studentId, students.id), eq(enrollments.classId, classId)))
      .innerJoin(academicYears, and(eq(academicYears.id, enrollments.academicYearId), eq(academicYears.isActive, true)))
      .innerJoin(teacherAssignments, and(
        eq(teacherAssignments.classId, classId),
        eq(teacherAssignments.academicYearId, academicYears.id),
        eq(teacherAssignments.teacherId, session.userId)
      ))
      .where(eq(students.id, studentId))
      .limit(1)
    if (!isAssigned.length) throw new AuthError(403, 'Forbidden: Student/Class not assigned to teacher in active academic year')
  } else if (role === 'ORANG_TUA') {
    const isLinked = await db.select({ id: students.id })
      .from(students)
      .innerJoin(enrollments, and(eq(enrollments.studentId, students.id), eq(enrollments.classId, classId)))
      .innerJoin(academicYears, and(eq(academicYears.id, enrollments.academicYearId), eq(academicYears.isActive, true)))
      .innerJoin(studentParents, eq(studentParents.studentId, students.id))
      .where(and(eq(students.id, studentId), eq(studentParents.parentId, session.userId)))
      .limit(1)
    if (!isLinked.length) throw new AuthError(403, 'Forbidden: Student/Class not linked to parent in active academic year')
  }

  return auth
}

export async function requireClassAccess(classId: number): Promise<{ session: SessionPayload; role: CanonicalRole }> {
  const auth = await requireAuth()
  const { session, role } = auth

  if (role === 'SUPER_ADMIN') return auth

  if (role === 'GURU') {
    const isAssigned = await db.select({ id: classes.id })
      .from(classes)
      .innerJoin(teacherAssignments, and(
        eq(teacherAssignments.classId, classes.id),
        eq(teacherAssignments.teacherId, session.userId)
      ))
      .innerJoin(academicYears, and(eq(academicYears.id, teacherAssignments.academicYearId), eq(academicYears.isActive, true)))
      .where(eq(classes.id, classId))
      .limit(1)
    if (!isAssigned.length) throw new AuthError(403, 'Forbidden: Class not assigned to teacher in active academic year')
  } else if (role === 'ORANG_TUA') {
    // Parent can only view class if they have a linked child currently enrolled in it
    const isLinked = await db.select({ id: students.id })
      .from(students)
      .innerJoin(enrollments, and(eq(enrollments.studentId, students.id), eq(enrollments.classId, classId)))
      .innerJoin(academicYears, and(eq(academicYears.id, enrollments.academicYearId), eq(academicYears.isActive, true)))
      .innerJoin(studentParents, eq(studentParents.studentId, students.id))
      .where(eq(studentParents.parentId, session.userId))
      .limit(1)
    if (!isLinked.length) throw new AuthError(403, 'Forbidden: No linked child in this class in active academic year')
  }

  return auth
}

export async function requireReportAccess(reportId: number): Promise<{ session: SessionPayload; role: CanonicalRole }> {
  const auth = await requireAuth()
  const { session, role } = auth

  if (role === 'SUPER_ADMIN') return auth

  if (role === 'GURU') {
    const isAssigned = await db.select({ id: learningReports.id })
      .from(learningReports)
      .where(and(eq(learningReports.id, reportId), eq(learningReports.teacherId, session.userId)))
      .limit(1)
    if (!isAssigned.length) throw new AuthError(403, 'Forbidden: Report not assigned to teacher')
  } else if (role === 'ORANG_TUA') {
    const isLinked = await db.select({ id: learningReports.id })
      .from(learningReports)
      .innerJoin(studentParents, eq(studentParents.studentId, learningReports.studentId))
      .where(and(eq(learningReports.id, reportId), eq(studentParents.parentId, session.userId)))
      .limit(1)
    if (!isLinked.length) throw new AuthError(403, 'Forbidden: Report not linked to parent')
  }

  return auth
}
