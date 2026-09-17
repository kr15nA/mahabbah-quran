import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/rbac'
import { searchAllUsers } from '@/lib/db/queries/users'
import { getAllRoles, getAllPermissions } from '@/lib/db/queries/rbac'
import { db } from '@/lib/db/client'
import { userRoles, rolePermissions } from '@/drizzle/schema'
import { inArray } from 'drizzle-orm'
import UserListClient from './UserListClient'

export const dynamic = 'force-dynamic'

export default async function AdminUserManagementPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  let session;
  try {
    session = await requireAuth()
  } catch (err) {
    redirect('/login')
  }
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

  const allRoles = await getAllRoles()
  const allPermissions = await getAllPermissions()

  const userIds = users.map(u => u.id)
  let assignments: { userId: number, roleId: number }[] = []
  let allRolePerms: { roleId: number, permissionId: number }[] = []
  if (userIds.length > 0) {
    assignments = await db.select().from(userRoles).where(inArray(userRoles.userId, userIds))
    const assignedRoleIds = Array.from(new Set(assignments.map(a => a.roleId)))
    if (assignedRoleIds.length > 0) {
      allRolePerms = await db.select().from(rolePermissions).where(inArray(rolePermissions.roleId, assignedRoleIds))
    }
  }

  const usersWithRoles = users.map(u => {
    const userRoleIds = assignments.filter(a => a.userId === u.id).map(a => a.roleId)
    const userPermIds = new Set(
      allRolePerms.filter(rp => userRoleIds.includes(rp.roleId)).map(rp => rp.permissionId)
    )
    
    let effectivePermissions: string[] = []
    if (u.role === 'admin') {
      effectivePermissions = ['All permissions (SUPER_ADMIN)']
    } else {
      effectivePermissions = allPermissions.filter(p => userPermIds.has(p.id)).map(p => p.name)
    }

    return {
      ...u,
      dynamicRoleIds: userRoleIds,
      effectivePermissions
    }
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
        users={usersWithRoles}
        allRoles={allRoles}
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
