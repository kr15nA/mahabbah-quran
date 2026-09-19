import { db } from '@/lib/db/client'
import { students, users, studentParents } from '@/drizzle/schema'
import { eq, and, isNull, or, ilike } from 'drizzle-orm'
import { requirePermission } from '@/lib/auth/rbac'
import { createAuditLog } from '@/lib/audit/logger'
import { AuthError } from '@/lib/auth/rbac'
import { normalizeStudentId, studentIdToDbNumber } from '@/lib/guardians/parent-context'
import { getGuardianRelationship } from '@/lib/guardians/access'

export type UserLinkCandidate = {
  id: number
  fullName: string
  email: string | null
  role: string
  alreadyLinked: boolean
}

export async function searchUsersForLinking(query: string): Promise<UserLinkCandidate[]> {
  await requirePermission('system.user.manage')

  if (!query || query.length < 2) return []
  const searchPattern = `%${query}%`

  const results = await db.select({
    id: users.id,
    fullName: users.fullName,
    email: users.email,
    role: users.role,
    linkedStudentId: students.id
  })
  .from(users)
  .leftJoin(students, and(eq(students.userId, users.id), isNull(students.deletedAt)))
  .where(
    and(
      eq(users.isActive, true),
      or(
        ilike(users.fullName, searchPattern),
        ilike(users.email, searchPattern)
      )
    )
  )
  .limit(20)

  return results.map(r => ({
    id: r.id,
    fullName: r.fullName,
    email: r.email,
    role: r.role,
    alreadyLinked: r.linkedStudentId !== null
  }))
}

export async function linkStudentToUser(opts: { actorUserId: number, studentIdRaw: string | number, userId: number }) {
  const { session } = await requirePermission('system.user.manage')
  if (session.userId !== opts.actorUserId) throw new AuthError(403, 'Actor ID mismatch')

  const normalizedId = normalizeStudentId(opts.studentIdRaw)
  if (!normalizedId) throw new Error('Invalid student ID format')
  const studentId = studentIdToDbNumber(normalizedId)

  return await db.transaction(async (tx) => {
    // 1. Validate student
    const studentCheck = await tx.select().from(students).where(and(eq(students.id, studentId), isNull(students.deletedAt))).limit(1)
    if (!studentCheck.length) throw new Error('Student not found or deleted')
    if (studentCheck[0].userId !== null) throw new Error('Student is already linked to a user. Use relink instead.')

    // 2. Validate user
    const userCheck = await tx.select().from(users).where(eq(users.id, opts.userId)).limit(1)
    if (!userCheck.length) throw new Error('User not found')
    if (!userCheck[0].isActive) throw new Error('User is inactive')

    // 3. Validate user is not already linked elsewhere
    const existingLink = await tx.select().from(students).where(and(eq(students.userId, opts.userId), isNull(students.deletedAt))).limit(1)
    if (existingLink.length) throw new Error('User is already linked to another student profile')

    // 4. Validate guardian conflict
    const guardianRel = await getGuardianRelationship(opts.userId, studentId)
    if (guardianRel) {
      throw new Error('Akun ini tercatat sebagai wali dari santri tersebut dan tidak dapat digunakan sebagai akun santri yang sama.')
    }

    // 5. Mutate
    await tx.update(students).set({ userId: opts.userId }).where(eq(students.id, studentId))

    // 6. Audit
    await createAuditLog({
      actorUserId: session.userId,
      action: 'STUDENT_USER_LINK',
      entityType: 'STUDENT',
      entityId: studentId,
      newValues: { userId: opts.userId },
      metadata: { studentId, newUserId: opts.userId }
    }, tx)

    return { success: true }
  })
}

export async function unlinkStudentFromUser(opts: { actorUserId: number, studentIdRaw: string | number }) {
  const { session } = await requirePermission('system.user.manage')
  if (session.userId !== opts.actorUserId) throw new AuthError(403, 'Actor ID mismatch')

  const normalizedId = normalizeStudentId(opts.studentIdRaw)
  if (!normalizedId) throw new Error('Invalid student ID format')
  const studentId = studentIdToDbNumber(normalizedId)

  return await db.transaction(async (tx) => {
    const studentCheck = await tx.select().from(students).where(eq(students.id, studentId)).limit(1)
    if (!studentCheck.length) throw new Error('Student not found')
    
    const oldUserId = studentCheck[0].userId
    if (oldUserId === null) return { success: true } // Already unlinked

    await tx.update(students).set({ userId: null }).where(eq(students.id, studentId))

    await createAuditLog({
      actorUserId: session.userId,
      action: 'STUDENT_USER_UNLINK',
      entityType: 'STUDENT',
      entityId: studentId,
      oldValues: { userId: oldUserId },
      metadata: { studentId, oldUserId }
    }, tx)

    return { success: true }
  })
}

export async function relinkStudentUser(opts: { actorUserId: number, studentIdRaw: string | number, newUserId: number }) {
  const { session } = await requirePermission('system.user.manage')
  if (session.userId !== opts.actorUserId) throw new AuthError(403, 'Actor ID mismatch')

  const normalizedId = normalizeStudentId(opts.studentIdRaw)
  if (!normalizedId) throw new Error('Invalid student ID format')
  const studentId = studentIdToDbNumber(normalizedId)

  return await db.transaction(async (tx) => {
    // 1. Validate student
    const studentCheck = await tx.select().from(students).where(and(eq(students.id, studentId), isNull(students.deletedAt))).limit(1)
    if (!studentCheck.length) throw new Error('Student not found or deleted')
    
    const oldUserId = studentCheck[0].userId

    // 2. Validate new user
    const userCheck = await tx.select().from(users).where(eq(users.id, opts.newUserId)).limit(1)
    if (!userCheck.length) throw new Error('New user not found')
    if (!userCheck[0].isActive) throw new Error('New user is inactive')

    // 3. Validate new user is not already linked elsewhere
    const existingLink = await tx.select().from(students).where(and(eq(students.userId, opts.newUserId), isNull(students.deletedAt))).limit(1)
    if (existingLink.length) throw new Error('User is already linked to another student profile')

    // 4. Validate guardian conflict
    const guardianRel = await getGuardianRelationship(opts.newUserId, studentId)
    if (guardianRel) {
      throw new Error('Akun ini tercatat sebagai wali dari santri tersebut dan tidak dapat digunakan sebagai akun santri yang sama.')
    }

    // 5. Mutate
    await tx.update(students).set({ userId: opts.newUserId }).where(eq(students.id, studentId))

    // 6. Audit
    await createAuditLog({
      actorUserId: session.userId,
      action: 'STUDENT_USER_RELINK',
      entityType: 'STUDENT',
      entityId: studentId,
      oldValues: { userId: oldUserId },
      newValues: { userId: opts.newUserId },
      metadata: { studentId, oldUserId, newUserId: opts.newUserId }
    }, tx)

    return { success: true }
  })
}
