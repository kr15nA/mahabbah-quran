import { requireAuth } from '@/lib/auth/rbac'
import { getStudentsByTeacher } from '@/lib/db/queries/students'
import GuruSantriClient from './GuruSantriClient'

export const dynamic = 'force-dynamic'

export default async function GuruSantriPage() {
  const { session } = await requireAuth()
  
  const students = await getStudentsByTeacher(session.userId)

  return (
    <GuruSantriClient 
      students={students} 
      teacherName={session.fullName || 'Guru'} 
    />
  )
}
