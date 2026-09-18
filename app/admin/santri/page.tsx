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
  page_size?: string
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

  // Parse page
  const parsedPage = Number(resolvedParams.page)
  const page = (!isNaN(parsedPage) && parsedPage >= 1) ? Math.floor(parsedPage) : 1

  // Parse page_size
  const allowedPageSizes = [10, 30, 50, 100]
  const parsedPageSize = Number(resolvedParams.page_size)
  const limit = allowedPageSizes.includes(parsedPageSize) ? parsedPageSize : 10

  // 3. Fetch Real Data securely from DB
  const { data, total } = await searchStudents(
    search, 
    { program_id: programId, class_id: classId, status }, 
    { limit, offset: (page - 1) * limit }
  )

  // Out of range handling
  const totalPages = Math.max(1, Math.ceil(total / limit))
  if (page > totalPages && total > 0) {
    // Redirect to last valid page preserving all other query parameters
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (resolvedParams.program_id) params.set('program_id', resolvedParams.program_id)
    if (resolvedParams.class_id) params.set('class_id', resolvedParams.class_id)
    if (resolvedParams.status) params.set('status', resolvedParams.status)
    params.set('page_size', limit.toString())
    params.set('page', totalPages.toString())
    
    redirect(`/admin/santri?${params.toString()}`)
  }

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

