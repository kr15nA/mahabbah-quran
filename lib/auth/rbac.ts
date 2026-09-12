import { getSession, SessionPayload } from '@/lib/auth/session'
import { db } from '@/lib/db/client'
import { classes, studentParents, students, learningReports } from '@/drizzle/schema'
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
      .innerJoin(classes, eq(classes.id, students.classId))
      .where(and(eq(students.id, studentId), eq(classes.teacherId, session.userId)))
      .limit(1)
    if (!isAssigned.length) throw new AuthError(403, 'Forbidden: Student not assigned to teacher')
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
      .innerJoin(classes, eq(classes.id, students.classId))
      .where(and(eq(students.id, studentId), eq(students.classId, classId), eq(classes.teacherId, session.userId)))
      .limit(1)
    if (!isAssigned.length) throw new AuthError(403, 'Forbidden: Student/Class not assigned to teacher')
  } else if (role === 'ORANG_TUA') {
    const isLinked = await db.select({ id: students.id })
      .from(students)
      .innerJoin(studentParents, eq(studentParents.studentId, students.id))
      .where(and(eq(students.id, studentId), eq(students.classId, classId), eq(studentParents.parentId, session.userId)))
      .limit(1)
    if (!isLinked.length) throw new AuthError(403, 'Forbidden: Student/Class not linked to parent')
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
      .where(and(eq(classes.id, classId), eq(classes.teacherId, session.userId)))
      .limit(1)
    if (!isAssigned.length) throw new AuthError(403, 'Forbidden: Class not assigned to teacher')
  } else if (role === 'ORANG_TUA') {
    // Parent can only view class if they have a linked child in it
    const isLinked = await db.select({ id: students.id })
      .from(students)
      .innerJoin(studentParents, eq(studentParents.studentId, students.id))
      .where(and(eq(students.classId, classId), eq(studentParents.parentId, session.userId)))
      .limit(1)
    if (!isLinked.length) throw new AuthError(403, 'Forbidden: No linked child in this class')
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
