import { db } from '@/lib/db/client'
import { studentParents } from '@/drizzle/schema'
import { eq, and, isNull } from 'drizzle-orm'

export async function getGuardianRelationships(userId: number) {
  return await db
    .select()
    .from(studentParents)
    .where(
      and(
        eq(studentParents.parentId, userId),
        eq(studentParents.isActive, true),
        isNull(studentParents.deletedAt)
      )
    )
}

export async function getGuardianRelationship(userId: number, studentId: number) {
  const result = await db
    .select()
    .from(studentParents)
    .where(
      and(
        eq(studentParents.parentId, userId),
        eq(studentParents.studentId, studentId),
        eq(studentParents.isActive, true),
        isNull(studentParents.deletedAt)
      )
    )
    .limit(1)
  
  return result[0] || null
}

export async function canAccessStudentAcademic(userId: number, studentId: number): Promise<boolean> {
  const rel = await getGuardianRelationship(userId, studentId)
  if (!rel) return false
  return rel.canViewAcademic === true
}

export async function canAccessStudentFinance(userId: number, studentId: number): Promise<boolean> {
  const rel = await getGuardianRelationship(userId, studentId)
  if (!rel) return false
  return rel.canViewFinance === true
}

export async function canReceiveStudentNotification(userId: number, studentId: number): Promise<boolean> {
  const rel = await getGuardianRelationship(userId, studentId)
  if (!rel) return false
  return rel.canReceiveNotification === true
}

export async function canManageStudentLearning(userId: number, studentId: number): Promise<boolean> {
  const rel = await getGuardianRelationship(userId, studentId)
  if (!rel) return false
  return rel.canManageLearning === true
}
