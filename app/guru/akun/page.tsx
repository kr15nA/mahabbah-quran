import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/rbac'
import { getUserById } from '@/lib/db/queries/users'
import { getRolesForUser, getEffectivePermissions } from '@/lib/db/queries/rbac'
import { getUserProfileContext } from '@/lib/profile/queries'
import UnifiedAccountClient from '@/components/profile/UnifiedAccountClient'

export const dynamic = 'force-dynamic'

export default async function AdminAccountPage() {
  const { session, role } = await requireAuth()

  const user = await getUserById(session.userId)
  if (!user) redirect('/login')

  const userRoles = await getRolesForUser(session.userId)
  const ctx = await getUserProfileContext(session.userId)
  const permissions = role === 'SUPER_ADMIN' ? ['SUPER_ADMIN'] : await getEffectivePermissions(session.userId)

  return (
    <div className="space-y-4 max-w-4xl pb-10">
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
        <h3 className="font-bold text-gray-900 text-sm">Profil & Akun</h3>
        <p className="text-xs text-gray-500">Kelola informasi pribadi dan keamanan akun</p>
      </div>

      <UnifiedAccountClient 
        data={{
          id: user.id,
          full_name: user.full_name,
          email: user.email || '',
          phone: user.phone || '',
          avatar_url: user.avatar_url || '',
          legacy_role: user.role,
          dynamic_roles: userRoles.map((r: any) => r.code),
          permissions: permissions,
          is_guru: user.role === 'guru' || userRoles.some((r: any) => r.code.includes('GURU')),
          is_parent: user.role === 'orang_tua' || userRoles.some((r: any) => r.code.includes('ORANG_TUA') || r.code.includes('PARENT')),
          class_count: ctx.classCount,
          student_count: ctx.studentCount,
        }} 
      />
    </div>
  )
}
