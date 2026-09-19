import { requirePermission, hasPermission } from '@/lib/auth/rbac'
import { getGlobalTasmiHistory } from '@/lib/tasmi/list'
import { getAllSurahs } from '@/lib/db/queries/surahs'
import { TasmiAdminClient } from './TasmiAdminClient'

export const dynamic = 'force-dynamic'

export default async function AdminTasmiPage({
  searchParams
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const auth = await requirePermission('academic.tasmi.read')
  const canManage = await hasPermission(auth.session, 'academic.tasmi.manage')

  const page = Math.max(1, Number(searchParams.page) || 1)
  const pageSize = [10, 30, 50, 100].includes(Number(searchParams.page_size)) ? Number(searchParams.page_size) : 10
  
  const search = typeof searchParams.search === 'string' ? searchParams.search : ''
  const mode = typeof searchParams.mode === 'string' ? searchParams.mode : 'all'
  const status = typeof searchParams.status === 'string' ? searchParams.status : 'all'

  const { data, total } = await getGlobalTasmiHistory({
    page,
    pageSize,
    search,
    mode,
    status
  })

  const surahs = await getAllSurahs()

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <TasmiAdminClient
        data={data}
        total={total}
        page={page}
        pageSize={pageSize}
        search={search}
        mode={mode}
        status={status}
        surahs={surahs}
        canManage={canManage}
      />
    </div>
  )
}
