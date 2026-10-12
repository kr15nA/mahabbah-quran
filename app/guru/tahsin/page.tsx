import { requireAuth } from '@/lib/auth/rbac'
import { getClassesByTeacher } from '@/lib/db/queries/classes'
import { getStudentsByTeacher } from '@/lib/db/queries/students'
import { getRecentTahsinByTeacher } from '@/lib/db/queries/tahsin'
import GuruTahsinClient from './GuruTahsinClient'

export const dynamic = 'force-dynamic'

export default async function GuruTahsinPage() {
  const { session, role } = await requireAuth()

  const [classes, students, recentRecords] = await Promise.all([
    getClassesByTeacher(session.userId),
    getStudentsByTeacher(session.userId),
    getRecentTahsinByTeacher(session.userId, 20),
  ])

  return (
    <GuruTahsinClient
      classes={classes}
      students={students}
      recentRecords={recentRecords}
      teacherName={session.fullName || 'Guru Pengampu'}
    />
  )
}
