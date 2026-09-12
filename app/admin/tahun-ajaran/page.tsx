import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/rbac'
import { getAcademicYears } from '@/lib/db/queries/academic-years'
import AcademicYearClient from './AcademicYearClient'

export const dynamic = 'force-dynamic'

export default async function TahunAjaranPage() {
  const { role } = await requireAuth()
  if (role !== 'SUPER_ADMIN') {
    redirect('/login')
  }

  const data = await getAcademicYears()

  return <AcademicYearClient data={data} />
}
