import { requireAuth } from '@/lib/auth/rbac'
import { getClassesByTeacher } from '@/lib/db/queries/classes'
import { getStudentsByTeacher } from '@/lib/db/queries/students'
import { getAllSurahs } from '@/lib/db/queries/surahs'
import GuruLaporanClient from './GuruLaporanClient'

export const dynamic = 'force-dynamic'

export default async function GuruLaporanPage() {
  const { session } = await requireAuth()

  const [classes, students, surahs] = await Promise.all([
    getClassesByTeacher(session.userId),
    getStudentsByTeacher(session.userId),
    getAllSurahs()
  ])

  return (
    <GuruLaporanClient
      classes={classes}
      initialStudents={students}
      surahs={surahs}
    />
  )
}
