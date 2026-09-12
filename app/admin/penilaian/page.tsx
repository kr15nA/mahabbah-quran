import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/rbac'
import { searchPenilaianAdmin } from '@/lib/db/queries/learning-reports'
import PenilaianClient from './PenilaianClient'

export const dynamic = 'force-dynamic'

interface SearchParams {
  search?: string
  page?: string
  limit?: string
}

export default async function AdminPenilaianPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { role } = await requireAuth()
  if (role !== 'SUPER_ADMIN') {
    redirect('/login')
  }

  const resolvedParams = await searchParams
  const search = resolvedParams.search || undefined
  const page = resolvedParams.page ? Math.max(1, Number(resolvedParams.page)) : 1
  const limit = resolvedParams.limit ? Math.max(1, Number(resolvedParams.limit)) : 10

  const { data, total } = await searchPenilaianAdmin({ search, limit, offset: (page - 1) * limit })

  return (
    <PenilaianClient 
      data={data}
      total={total}
      page={page}
      limit={limit}
      search={search || ''}
    />
  )
}
