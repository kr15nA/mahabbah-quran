import { db } from '@/lib/db/client'
import { tasmiSessions, auditLogs } from '@/drizzle/schema'
import { eq, and } from 'drizzle-orm'
import { requirePermission, requireStudentAccess } from '@/lib/auth/rbac'
import { TasmiInput, tasmiInputSchema } from './validation'
import { normalizeStudentId, studentIdToDbNumber } from '@/lib/guardians/parent-context'
import { AuthError } from '@/lib/auth/rbac'
import { assertNotSelfAssessment } from '@/lib/identity/self-assessment'

export async function createTasmiSession(input: TasmiInput & { studentIdRaw: string | number }) {
  // 1. Authorize: requires basic manage permission
  const { session } = await requirePermission('academic.tasmi.manage')

  // 2. Validate input and numeric student ID
  const normalizedId = normalizeStudentId(input.studentIdRaw)
  if (!normalizedId) throw new Error('Invalid student ID format')
  const studentId = studentIdToDbNumber(normalizedId)

  // 3. Granular authorize: ensure actor can manage this specific student's academic records
  await requireStudentAccess(studentId)
  await assertNotSelfAssessment({ actorUserId: session.userId, targetStudentId: studentId })

  const validated = tasmiInputSchema.parse({
    ...input,
    studentId
  })

  // 4. Trust boundary: use authenticated session user as examiner for V1. 
  // (Admin impersonation not supported in Phase A).
  const examinerId = session.userId

  // 5. DB Mutation & Audit
  const [result] = await db.transaction(async (tx) => {
    const [inserted] = await tx.insert(tasmiSessions).values({
      studentId: validated.studentId,
      examinerId,
      mode: validated.mode,
      surahId: validated.mode === 'SURAH' ? validated.surahId : null,
      startJuz: validated.mode === 'JUZ_RANGE' ? validated.startJuz : null,
      endJuz: validated.mode === 'JUZ_RANGE' ? validated.endJuz : null,
      sessionDate: validated.sessionDate,
      score: validated.score ?? null,
      status: validated.status,
      notes: validated.notes ?? null,
    }).returning()

    await tx.insert(auditLogs).values({
      actorUserId: session.userId,
      action: 'TASMI_CREATE',
      entityType: 'tasmi_sessions',
      entityId: inserted.id,
      newValues: inserted,
      metadata: {
        studentId: inserted.studentId,
        mode: inserted.mode
      }
    })

    return [inserted]
  })

  return result
}

export async function updateTasmiSession(id: number, input: TasmiInput & { studentIdRaw: string | number }) {
  const { session } = await requirePermission('academic.tasmi.manage')

  const normalizedId = normalizeStudentId(input.studentIdRaw)
  if (!normalizedId) throw new Error('Invalid student ID format')
  const studentId = studentIdToDbNumber(normalizedId)

  await requireStudentAccess(studentId)
  await assertNotSelfAssessment({ actorUserId: session.userId, targetStudentId: studentId })

  const validated = tasmiInputSchema.parse({
    ...input,
    studentId
  })

  const [result] = await db.transaction(async (tx) => {
    const existing = await tx.select().from(tasmiSessions).where(eq(tasmiSessions.id, id)).limit(1)
    if (!existing.length) throw new Error('Tasmi session not found')
    
    // Ensure we don't accidentally update a session for a different student
    if (existing[0].studentId !== studentId) {
      throw new AuthError(403, 'Forbidden: ID mismatch')
    }

    const [updated] = await tx.update(tasmiSessions).set({
      mode: validated.mode,
      surahId: validated.mode === 'SURAH' ? validated.surahId : null,
      startJuz: validated.mode === 'JUZ_RANGE' ? validated.startJuz : null,
      endJuz: validated.mode === 'JUZ_RANGE' ? validated.endJuz : null,
      sessionDate: validated.sessionDate,
      score: validated.score ?? null,
      status: validated.status,
      notes: validated.notes ?? null,
      updatedAt: new Date(),
    })
    .where(eq(tasmiSessions.id, id))
    .returning()

    await tx.insert(auditLogs).values({
      actorUserId: session.userId,
      action: 'TASMI_UPDATE',
      entityType: 'tasmi_sessions',
      entityId: updated.id,
      oldValues: existing[0],
      newValues: updated,
      metadata: {
        studentId: updated.studentId,
        mode: updated.mode
      }
    })

    return [updated]
  })

  return result
}

export async function deleteTasmiSession(id: number, studentIdRaw: string | number) {
  const { session } = await requirePermission('academic.tasmi.manage')

  const normalizedId = normalizeStudentId(studentIdRaw)
  if (!normalizedId) throw new Error('Invalid student ID format')
  const studentId = studentIdToDbNumber(normalizedId)

  await requireStudentAccess(studentId)
  await assertNotSelfAssessment({ actorUserId: session.userId, targetStudentId: studentId })

  await db.transaction(async (tx) => {
    const existing = await tx.select().from(tasmiSessions).where(eq(tasmiSessions.id, id)).limit(1)
    if (!existing.length) throw new Error('Tasmi session not found')

    if (existing[0].studentId !== studentId) {
      throw new AuthError(403, 'Forbidden: ID mismatch')
    }

    await tx.delete(tasmiSessions).where(eq(tasmiSessions.id, id))

    await tx.insert(auditLogs).values({
      actorUserId: session.userId,
      action: 'TASMI_DELETE',
      entityType: 'tasmi_sessions',
      entityId: id,
      oldValues: existing[0],
      metadata: {
        studentId: existing[0].studentId,
        mode: existing[0].mode
      }
    })
  })
}
