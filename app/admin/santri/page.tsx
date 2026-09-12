import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/rbac'
import { searchStudents } from '@/lib/db/queries/students'
import StudentTableClient from './StudentTableClient'

export const dynamic = 'force-dynamic'

interface SearchParams {
  search?: string
  q?: string
  program_id?: string
  class_id?: string
  status?: string
  page?: string
  limit?: string
}

export default async function DataSantriPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  // 1. Explicit Server-Side Authorization
  const { role } = await requireAuth()
  if (role !== 'SUPER_ADMIN') {
    redirect('/login')
  }

  // 2. Parse Query Parameters
  const resolvedParams = await searchParams
  const search = resolvedParams.search || resolvedParams.q || undefined
  const programId = resolvedParams.program_id ? Number(resolvedParams.program_id) : undefined
  const classId = resolvedParams.class_id ? Number(resolvedParams.class_id) : undefined
  const status = resolvedParams.status === 'active' || resolvedParams.status === 'inactive' 
    ? resolvedParams.status 
    : undefined
  const page = resolvedParams.page ? Math.max(1, Number(resolvedParams.page)) : 1
  const limit = resolvedParams.limit ? Math.max(1, Number(resolvedParams.limit)) : 10

  // 3. Fetch Real Data securely from DB
  const { data, total } = await searchStudents(
    search, 
    { program_id: programId, class_id: classId, status }, 
    { limit, offset: (page - 1) * limit }
  )

  // 4. Pass Data to Client Component for Interactivity
  return (
    <StudentTableClient 
      data={data} 
      total={total} 
      page={page} 
      limit={limit} 
    />
  )
}
