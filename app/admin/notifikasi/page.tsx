import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/rbac'
import { searchNotifications } from '@/lib/db/queries/notifications'
import NotifikasiClient from './NotifikasiClient'

export const dynamic = 'force-dynamic'

interface SearchParams {
  search?: string
  status?: string
  page?: string
  limit?: string
}

export default async function AdminNotifikasiPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await requireAuth()
  if (session.role !== 'SUPER_ADMIN') {
    redirect('/login')
  }

  const resolvedParams = await searchParams
  const search = resolvedParams.search || undefined
  const page = resolvedParams.page ? Math.max(1, Number(resolvedParams.page)) : 1
  const limit = resolvedParams.limit ? Math.max(1, Number(resolvedParams.limit)) : 15
  
  let isRead: boolean | null = null
  if (resolvedParams.status === 'read') isRead = true
  if (resolvedParams.status === 'unread') isRead = false

  const { data, total } = await searchNotifications({ 
    userId: session.session.userId,
    search, 
    isRead,
    limit, 
    offset: (page - 1) * limit 
  })

  return (
    <NotifikasiClient 
      data={data}
      total={total}
      page={page}
      limit={limit}
      search={search || ''}
      status={resolvedParams.status || 'all'}
    />
  )
}
