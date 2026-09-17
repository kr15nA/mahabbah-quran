import { requireAuth, hasPermission } from '@/lib/auth/rbac'
import { getAllRoles, getAllPermissions, getUsersCountByRole, getPermissionsForRole } from '@/lib/db/queries/rbac'
import { redirect } from 'next/navigation'
import RolesClient from './RolesClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Manajemen Role & Akses | Mahabbah Qur\'an',
}

export default async function RolesPage() {
  let session;
  try {
    session = await requireAuth()
  } catch (err) {
    redirect('/login')
  }

  const allowed = await hasPermission(session.session, 'system.role.manage')
  if (!allowed) redirect('/admin/dashboard')

  const roles = await getAllRoles()
  const permissions = await getAllPermissions()

  const rolesWithMeta = await Promise.all(roles.map(async (r) => {
    const count = await getUsersCountByRole(r.id)
    const perms = await getPermissionsForRole(r.id)
    return {
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description,
      _count: count,
      permissions: perms.map(p => p.id)
    }
  }))

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Manajemen Role & Hak Akses</h1>
        <p className="text-sm text-gray-500">Kelola daftar role dan penugasan hak akses sistem.</p>
      </div>

      <RolesClient roles={rolesWithMeta} permissions={permissions} />
    </div>
  )
}
