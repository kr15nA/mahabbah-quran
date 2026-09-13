import { requireAuth } from '@/lib/auth/rbac'
import { getClassesByTeacher } from '@/lib/db/queries/classes'
import { getStudentsByTeacher } from '@/lib/db/queries/students'
import GuruAbsensiClient from './GuruAbsensiClient'

export const dynamic = 'force-dynamic'

export default async function GuruAbsensiPage() {
  const { session } = await requireAuth()

  const [classes, students] = await Promise.all([
    getClassesByTeacher(session.userId),
    getStudentsByTeacher(session.userId)
  ])

  return (
    <GuruAbsensiClient 
      classes={classes}
      initialStudents={students}
      teacherName={session.fullName || 'Guru'}
    />
  )
}
