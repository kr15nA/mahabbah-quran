import { requireAuth } from '@/lib/auth/rbac'
import { redirect } from 'next/navigation'
import { searchClasses } from '@/lib/db/queries/classes'
import { getAllTeachers } from '@/lib/db/queries/users'
import { getAllPrograms } from '@/lib/db/queries/programs'
import KelasTableClient from './KelasTableClient'

type SearchParams = {
  search?: string
  status?: string
  page?: string
  limit?: string
}

export default async function DataKelasPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
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
  const limit = resolvedParams.limit ? Math.max(1, Number(resolvedParams.limit)) : 12

  let isActiveFilter: boolean | null = true
  if (status === undefined) isActiveFilter = null
  else if (status === 'archived') isActiveFilter = false

  // 3. Fetch Data
  const [searchResult, teachers, programs] = await Promise.all([
    searchClasses({
      search,
      isActiveFilter,
      limit,
      offset: (page - 1) * limit,
    }),
    getAllTeachers(),
    getAllPrograms()
  ])

  // 4. Render UI
  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div>
          <h3 className="font-bold text-gray-900 text-sm">Manajemen Kelas Tahfizh</h3>
          <p className="text-xs text-gray-500">Daftar kelompok belajar santri</p>
        </div>
      </div>

      <KelasTableClient 
        data={searchResult.data} 
        total={searchResult.total} 
        page={page} 
        limit={limit}
        teachers={teachers}
        programs={programs}
      />
    </div>
  )
}
