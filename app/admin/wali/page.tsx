import { redirect } from 'next/navigation'
import { requirePermission } from '@/lib/auth/rbac'
import GuardianExplorerClient from './GuardianExplorerClient'
import { 
  getGuardianExplorerSummary, 
  getStudentGuardianExplorer, 
  getGuardianExplorer,
  StudentExplorerParams,
  GuardianExplorerParams
} from '@/lib/guardians/explorer'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Wali & Keluarga | Admin Mahabbah',
}

export default async function AdminWaliPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  await requirePermission('system.user.manage')

  const params = await searchParams

  const view = (params.view as string) === 'guardian' ? 'guardian' : 'student'
  
  const rawPage = parseInt(params.page as string)
  const page = !isNaN(rawPage) && rawPage > 0 ? rawPage : 1
  
  const rawPageSize = parseInt(params.page_size as string)
  const validPageSizes = [10, 30, 50, 100]
  const pageSize = validPageSizes.includes(rawPageSize) ? rawPageSize : 10

  const search = typeof params.search === 'string' && params.search.trim() !== '' ? params.search.trim() : undefined

  // Fetch summary metrics
  const summary = await getGuardianExplorerSummary()

  let studentData = null
  let guardianData = null
  let totalPages = 0
  let totalItems = 0

  if (view === 'student') {
    const rawQuality = params.quality as string
    const quality = ['all', 'no_guardian', 'multi_guardian', 'no_primary'].includes(rawQuality) 
      ? (rawQuality as StudentExplorerParams['quality']) 
      : 'all'

    studentData = await getStudentGuardianExplorer({ page, pageSize, search, quality })
    totalPages = studentData.meta.totalPages
    totalItems = studentData.meta.totalItems
  } else {
    const rawStatus = params.status as string
    const status = ['active', 'inactive', 'all'].includes(rawStatus)
      ? (rawStatus as GuardianExplorerParams['status'])
      : 'active'
    
    const multiStudent = params.multi_student === '1'

    guardianData = await getGuardianExplorer({ page, pageSize, search, status, multiStudent })
    totalPages = guardianData.meta.totalPages
    totalItems = guardianData.meta.totalItems
  }

  // Handle out-of-range pagination (redirect to last valid page)
  if (page > totalPages && totalPages > 0) {
    const newParams = new URLSearchParams()
    
    newParams.set('view', view)
    newParams.set('page', String(totalPages))
    newParams.set('page_size', String(pageSize))
    
    if (search) newParams.set('search', search)
    
    if (view === 'student') {
      if (params.quality && params.quality !== 'all') newParams.set('quality', String(params.quality))
    } else {
      if (params.status && params.status !== 'active') newParams.set('status', String(params.status))
      if (params.multi_student) newParams.set('multi_student', '1')
    }
    
    redirect(`/admin/wali?${newParams.toString()}`)
  }

  return (
    <GuardianExplorerClient
      view={view}
      summary={summary}
      studentData={studentData}
      guardianData={guardianData}
      page={page}
      pageSize={pageSize}
      totalItems={totalItems}
      totalPages={totalPages}
    />
  )
}
