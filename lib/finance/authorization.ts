import { hasPermission } from '@/lib/auth/rbac'
import { canAccessStudentFinance as canGuardianAccessStudentFinance } from '@/lib/guardians/access'

export async function canAccessStudentFinance(
  session: { userId: number; role: string },
  studentId: number
): Promise<boolean> {
  // SUPER_ADMIN override (assumes super_admin or admin roles have full access)
  if (session.role === 'admin' || session.role === 'SUPER_ADMIN') {
    return true
  }

  // 1. System Permission check
  const hasPerm = await hasPermission(session as any, 'finance.billing.read_own_children')
  if (hasPerm) {
    // 2. Row-level guardian capability check
    const isGuardian = await canGuardianAccessStudentFinance(session.userId, studentId)
    if (isGuardian) {
      return true
    }
  }

  return false
}
