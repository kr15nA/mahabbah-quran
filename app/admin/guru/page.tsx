import { requireAuth } from '@/lib/auth/rbac'
import { redirect } from 'next/navigation'
import { searchGurus } from '@/lib/db/queries/users'
import GuruTableClient from './GuruTableClient'

type SearchParams = {
  search?: string
  status?: string
  page?: string
  limit?: string
}

export default async function DataGuruPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  // 1. Authorization
  try {
    const { role } = await requireAuth()
    if (role !== 'SUPER_ADMIN') redirect('/login')
  } catch (error) {
    redirect('/login')
  }

  // 2. Parse Query Parameters
  const resolvedParams = await searchParams
  const search = resolvedParams.search || undefined
  const status = resolvedParams.status === 'all' 
    ? undefined 
    : resolvedParams.status === 'archived' 
      ? 'archived' 
      : 'active'
      
  const page = resolvedParams.page ? Math.max(1, Number(resolvedParams.page)) : 1
  const limit = resolvedParams.limit ? Math.max(1, Number(resolvedParams.limit)) : 10

  let isActiveFilter: boolean | null = true
  if (status === undefined) isActiveFilter = null
  else if (status === 'archived') isActiveFilter = false

  // 3. Fetch Data
  const { data, total } = await searchGurus({
    search,
    isActiveFilter,
    limit,
    offset: (page - 1) * limit,
  })

  // 4. Render UI
  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="font-bold text-gray-900 text-sm">Manajemen Guru</h3>
          <p className="text-xs text-gray-500">Daftar ustadz dan ustadzah</p>
        </div>
      </div>

      <GuruTableClient 
        data={data} 
        total={total} 
        page={page} 
        limit={limit} 
      />
    </div>
  )
}
