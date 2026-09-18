'use server'

import { z } from 'zod'
import { db } from '@/lib/db/client'
import { financeDb as txDb } from '@/lib/finance/tx'
import { studentParents, users, students } from '@/drizzle/schema'
import { eq, and, or, ilike, not, isNull } from 'drizzle-orm'
import { requirePermission } from '@/lib/auth/rbac'
import { createAuditLog } from '@/lib/audit/logger'
import { revalidatePath } from 'next/cache'

import { VALID_RELATIONSHIPS } from "./constants"

const guardianInputSchema = z.object({
  studentId: z.number(),
  parentId: z.number(),
  relationship: z.enum(VALID_RELATIONSHIPS),
  isPrimary: z.boolean().default(false),
  canViewAcademic: z.boolean().default(false),
  canViewFinance: z.boolean().default(false),
})

export type GuardianCandidate = {
  id: number
  fullName: string
  email: string | null
  phone: string | null
  role: string
}

/* =====================================================================
 * CORE BUSINESS LOGIC (Testable without session/cookies)
 * ===================================================================== */

export async function _searchGuardianCandidatesCore(query: string): Promise<GuardianCandidate[]> {
  if (!query || query.length < 2) return []
  
  const searchPattern = `%${query}%`
  const results = await db.select({
    id: users.id,
    fullName: users.fullName,
    email: users.email,
    phone: users.phone,
    role: users.role
  })
  .from(users)
  .where(
    and(
      eq(users.isActive, true),
      or(
        ilike(users.fullName, searchPattern),
        ilike(users.email, searchPattern),
        ilike(users.phone, searchPattern)
      )
    )
  )
  .limit(20)

  return results
}

export async function _listStudentGuardiansCore(studentId: number) {
  const results = await db.select({
    id: studentParents.id,
    studentId: studentParents.studentId,
    parentId: studentParents.parentId,
    relationship: studentParents.relationship,
    isPrimary: studentParents.isPrimary,
    canViewAcademic: studentParents.canViewAcademic,
    canViewFinance: studentParents.canViewFinance,
    isActive: studentParents.isActive,
    deletedAt: studentParents.deletedAt,
    updatedAt: studentParents.updatedAt,
    guardian: {
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      phone: users.phone,
      role: users.role
    }
  })
  .from(studentParents)
  .innerJoin(users, eq(studentParents.parentId, users.id))
  .where(
    and(
      eq(studentParents.studentId, studentId),
      isNull(studentParents.deletedAt)
    )
  )
  .orderBy(studentParents.isActive, studentParents.isPrimary)

  return results
}

async function handlePrimaryReplacement(tx: any, studentId: number, targetId: number | null) {
  await tx.update(studentParents)
    .set({ isPrimary: false, updatedAt: new Date() })
    .where(
      and(
        eq(studentParents.studentId, studentId),
        eq(studentParents.isPrimary, true),
        targetId ? not(eq(studentParents.id, targetId)) : undefined
      )
    )
    
  if (targetId) {
    await tx.update(studentParents)
      .set({ isPrimary: true, updatedAt: new Date() })
      .where(eq(studentParents.id, targetId))
  }
}

export async function _createGuardianRelationshipCore(actorUserId: number, input: z.infer<typeof guardianInputSchema>) {
  const data = guardianInputSchema.parse(input)

  const existing = await db.select().from(studentParents).where(
    and(
      eq(studentParents.studentId, data.studentId),
      eq(studentParents.parentId, data.parentId),
      isNull(studentParents.deletedAt)
    )
  ).limit(1)

  if (existing.length > 0) {
    const rel = existing[0]
    if (rel.isActive) {
      throw new Error("User ini sudah menjadi wali aktif untuk santri tersebut.")
    } else {
      throw new Error("INACTIVE_EXISTS") 
    }
  }

  await txDb.transaction(async (tx) => {
    if (data.isPrimary) {
      await handlePrimaryReplacement(tx, data.studentId, null)
    }

    const [inserted] = await tx.insert(studentParents).values({
      studentId: data.studentId,
      parentId: data.parentId,
      relationship: data.relationship,
      isPrimary: data.isPrimary,
      canViewAcademic: data.canViewAcademic,
      canViewFinance: data.canViewFinance,
      canReceiveNotification: false,
      canManageLearning: false,
      isActive: true,
    }).returning()

    await createAuditLog({
      actorUserId,
      action: 'GUARDIAN_RELATIONSHIP_CREATED',
      entityType: 'student_parents',
      entityId: inserted.id,
      newValues: { ...data },
      metadata: { studentId: data.studentId, guardianUserId: data.parentId }
    }, tx)
  })

  try { revalidatePath(`/admin/santri/${data.studentId}`) } catch (e) {}
  return { success: true }
}

export async function _reactivateGuardianRelationshipCore(actorUserId: number, input: z.infer<typeof guardianInputSchema>) {
  const data = guardianInputSchema.parse(input)

  const existing = await db.select().from(studentParents).where(
    and(
      eq(studentParents.studentId, data.studentId),
      eq(studentParents.parentId, data.parentId),
      isNull(studentParents.deletedAt)
    )
  ).limit(1)

  if (existing.length === 0) throw new Error("Data wali tidak ditemukan atau sudah dihapus permanen.")
  const rel = existing[0]

  await txDb.transaction(async (tx) => {
    if (data.isPrimary) {
      await handlePrimaryReplacement(tx, data.studentId, null)
    }

    await tx.update(studentParents).set({
      relationship: data.relationship,
      isPrimary: data.isPrimary,
      canViewAcademic: data.canViewAcademic,
      canViewFinance: data.canViewFinance,
      isActive: true,
      updatedAt: new Date()
    }).where(eq(studentParents.id, rel.id))

    await createAuditLog({
      actorUserId,
      action: 'GUARDIAN_REACTIVATED',
      entityType: 'student_parents',
      entityId: rel.id,
      oldValues: { ...rel },
      newValues: { ...data, isActive: true },
      metadata: { studentId: data.studentId, guardianUserId: data.parentId }
    }, tx)
  })

  try { revalidatePath(`/admin/santri/${data.studentId}`) } catch (e) {}
  return { success: true }
}

export async function _updateGuardianRelationshipCore(actorUserId: number, id: number, input: Omit<z.infer<typeof guardianInputSchema>, 'studentId' | 'parentId'>) {
  const existing = await db.select().from(studentParents).where(
    and(
      eq(studentParents.id, id),
      isNull(studentParents.deletedAt)
    )
  ).limit(1)
  if (existing.length === 0) throw new Error("Data wali tidak ditemukan atau sudah dihapus permanen.")
  const rel = existing[0]

  await txDb.transaction(async (tx) => {
    if (input.isPrimary && !rel.isPrimary) {
      await handlePrimaryReplacement(tx, rel.studentId, null)
    }

    await tx.update(studentParents).set({
      relationship: input.relationship,
      isPrimary: input.isPrimary,
      canViewAcademic: input.canViewAcademic,
      canViewFinance: input.canViewFinance,
      updatedAt: new Date()
    }).where(eq(studentParents.id, id))

    await createAuditLog({
      actorUserId,
      action: 'GUARDIAN_RELATIONSHIP_UPDATED',
      entityType: 'student_parents',
      entityId: id,
      oldValues: { ...rel },
      newValues: { ...input },
      metadata: { studentId: rel.studentId, guardianUserId: rel.parentId }
    }, tx)
  })

  try { revalidatePath(`/admin/santri/${rel.studentId}`) } catch (e) {}
  return { success: true }
}

export async function _deactivateGuardianRelationshipCore(actorUserId: number, id: number) {
  const existing = await db.select().from(studentParents).where(
    and(
      eq(studentParents.id, id),
      isNull(studentParents.deletedAt)
    )
  ).limit(1)
  if (existing.length === 0) throw new Error("Data wali tidak ditemukan atau sudah dihapus permanen.")
  const rel = existing[0]

  await txDb.transaction(async (tx) => {
    await tx.update(studentParents).set({
      isActive: false,
      isPrimary: false,
      updatedAt: new Date()
    }).where(eq(studentParents.id, id))

    await createAuditLog({
      actorUserId,
      action: 'GUARDIAN_DEACTIVATED',
      entityType: 'student_parents',
      entityId: id,
      oldValues: { isActive: rel.isActive, isPrimary: rel.isPrimary },
      newValues: { isActive: false, isPrimary: false },
      metadata: { studentId: rel.studentId, guardianUserId: rel.parentId }
    }, tx)
  })

  try { revalidatePath(`/admin/santri/${rel.studentId}`) } catch (e) {}
  return { success: true }
}

/* =====================================================================
 * SERVER ACTIONS (With Authorization)
 * ===================================================================== */

export async function searchGuardianCandidates(query: string): Promise<GuardianCandidate[]> {
  await requirePermission('system.user.manage')
  return _searchGuardianCandidatesCore(query)
}

export async function listStudentGuardians(studentId: number) {
  await requirePermission('system.user.manage')
  return _listStudentGuardiansCore(studentId)
}

export async function createGuardianRelationship(input: z.infer<typeof guardianInputSchema>) {
  const { session } = await requirePermission('system.user.manage')
  return _createGuardianRelationshipCore(session.userId, input)
}

export async function reactivateGuardianRelationship(input: z.infer<typeof guardianInputSchema>) {
  const { session } = await requirePermission('system.user.manage')
  return _reactivateGuardianRelationshipCore(session.userId, input)
}

export async function updateGuardianRelationship(id: number, input: Omit<z.infer<typeof guardianInputSchema>, 'studentId' | 'parentId'>) {
  const { session } = await requirePermission('system.user.manage')
  return _updateGuardianRelationshipCore(session.userId, id, input)
}

export async function deactivateGuardianRelationship(id: number) {
  const { session } = await requirePermission('system.user.manage')
  return _deactivateGuardianRelationshipCore(session.userId, id)
}
