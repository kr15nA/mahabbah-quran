import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/rbac'
import { searchAllUsers } from '@/lib/db/queries/users'
import UserListClient from './UserListClient'

export const dynamic = 'force-dynamic'

export default async function AdminUserManagementPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = await requireAuth()
  if (session.role !== 'SUPER_ADMIN') {
    redirect('/login')
  }

  const params = await searchParams
  const q = typeof params.q === 'string' ? params.q : ''
  const roleFilter = typeof params.role === 'string' && params.role !== 'all' ? params.role : undefined
  const statusFilter = typeof params.status === 'string' && params.status !== 'all' ? params.status === 'active' : undefined
  const page = typeof params.page === 'string' ? parseInt(params.page) || 1 : 1
  const limit = 10
  const offset = (page - 1) * limit

  const { data: users, total } = await searchAllUsers({
    search: q,
    role: roleFilter,
    isActive: statusFilter,
    limit,
    offset
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Manajemen Pengguna</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola akun admin, guru, dan orang tua</p>
        </div>
      </div>

      <UserListClient 
        users={users} 
        total={total}
        page={page}
        limit={limit}
        q={q}
        roleFilter={roleFilter || 'all'}
        statusFilter={typeof params.status === 'string' ? params.status : 'all'}
      />
    </div>
  )
}
