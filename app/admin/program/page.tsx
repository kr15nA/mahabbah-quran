import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/rbac'
import { searchPrograms } from '@/lib/db/queries/programs'
import ProgramTableClient from './ProgramTableClient'

export const dynamic = 'force-dynamic'

interface SearchParams {
  search?: string
  status?: string
  page?: string
  limit?: string
}

export default async function DataProgramPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  // 1. Explicit Server-Side Authorization
  const { role } = await requireAuth()
  if (role !== 'SUPER_ADMIN') {
    redirect('/login')
  }

  // 2. Parse Query Parameters
  const resolvedParams = await searchParams
  const search = resolvedParams.search || undefined
  const status = resolvedParams.status === 'active' || resolvedParams.status === 'archived' 
    ? resolvedParams.status 
    : undefined
  const page = resolvedParams.page ? Math.max(1, Number(resolvedParams.page)) : 1
  const limit = resolvedParams.limit ? Math.max(1, Number(resolvedParams.limit)) : 10

  // 3. Fetch Real Data securely from DB
  const { data, total } = await searchPrograms(
    search, 
    { status }, 
    { limit, offset: (page - 1) * limit }
  )

  // 4. Pass Data to Client Component for Interactivity
  return (
    <ProgramTableClient 
      data={data} 
      total={total} 
      page={page} 
      limit={limit} 
    />
  )
}
