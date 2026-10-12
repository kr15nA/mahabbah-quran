import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/rbac'
import { searchLaporanAdmin } from '@/lib/db/queries/learning-reports'
import { getAllClasses } from '@/lib/db/queries/classes'
import LaporanClient from './LaporanClient'

export const dynamic = 'force-dynamic'

interface SearchParams {
  search?: string
  page?: string
  limit?: string
}

export default async function AdminLaporanPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { role } = await requireAuth()
  if (role !== 'SUPER_ADMIN') {
    redirect('/login')
  }

  const resolvedParams = await searchParams
  const search = resolvedParams.search || undefined
  const page = resolvedParams.page ? Math.max(1, Number(resolvedParams.page)) : 1
  const limit = resolvedParams.limit ? Math.max(1, Number(resolvedParams.limit)) : 10

  const [{ data, total }, classes] = await Promise.all([
    searchLaporanAdmin({ search, limit, offset: (page - 1) * limit }),
    getAllClasses(),
  ])

  return (
    <LaporanClient 
      data={data}
      total={total}
      page={page}
      limit={limit}
      search={search || ''}
      classes={classes}
    />
  )
}
