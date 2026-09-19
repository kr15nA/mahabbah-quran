import { db } from '@/lib/db/client'
import { students } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import { AuthError } from '@/lib/auth/rbac'
import { normalizeStudentId, studentIdToDbNumber } from '@/lib/guardians/parent-context'

export async function assertNotSelfAssessment(opts: {
  actorUserId: number
  targetStudentId: number | string
}): Promise<void> {
  const normalizedId = normalizeStudentId(opts.targetStudentId)
  if (!normalizedId) throw new AuthError(400, 'Invalid student ID format')
  const studentId = studentIdToDbNumber(normalizedId)

  // We query the target student to find out who their learner user is
  const targetStudent = await db
    .select({ userId: students.userId })
    .from(students)
    .where(eq(students.id, studentId))
    .limit(1)

  if (!targetStudent.length) {
    throw new AuthError(404, 'Student not found')
  }

  // If the target student is linked to the actor user, this is a formal self-assessment
  if (targetStudent[0].userId !== null && Number(targetStudent[0].userId) === Number(opts.actorUserId)) {
    throw new AuthError(403, 'Penilaian formal terhadap profil belajar sendiri tidak diizinkan.')
  }
}
