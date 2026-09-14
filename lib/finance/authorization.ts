import { hasPermission } from '@/lib/auth/rbac'
import { db } from '@/lib/db/client'
import { studentParents } from '@/drizzle/schema'
import { eq, and } from 'drizzle-orm'

export async function canAccessStudentFinance(
  session: { userId: number; role: string },
  studentId: number
): Promise<boolean> {
  // SUPER_ADMIN override (assumes super_admin or admin roles have full access)
  if (session.role === 'admin' || session.role === 'SUPER_ADMIN') {
    return true
  }

  // PARENT logic
  if (session.role === 'orang_tua') {
    // 1. Permission check
    const hasPerm = await hasPermission(session as any, 'finance.billing.read_own_children')
    if (!hasPerm) return false

    // 2. Server-side ownership check
    const [relationship] = await db
      .select()
      .from(studentParents)
      .where(
        and(
          eq(studentParents.studentId, studentId),
          eq(studentParents.parentId, session.userId)
        )
      )

    return !!relationship
  }

  // GURU or others: deny by default unless explicitly granted a future finance permission
  // (Currently GURU is denied)
  return false
}
