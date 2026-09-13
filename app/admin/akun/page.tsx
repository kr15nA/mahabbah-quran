import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/rbac'
import { getUserById } from '@/lib/db/queries/users'
import AccountClient from './AccountClient'

export const dynamic = 'force-dynamic'

export default async function AdminAccountPage() {
  const session = await requireAuth()
  if (session.role !== 'SUPER_ADMIN') {
    redirect('/login')
  }

  const user = await getUserById(session.session.userId)
  if (!user) redirect('/login')

  return (
    <div className="space-y-4 max-w-2xl pb-10">
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
        <h3 className="font-bold text-gray-900 text-sm">Profil & Akun</h3>
        <p className="text-xs text-gray-500">Kelola informasi pribadi dan keamanan akun</p>
      </div>

      <AccountClient 
        user={{
          id: user.id,
          full_name: user.full_name,
          email: user.email || '',
          phone: user.phone || '',
          avatar_url: user.avatar_url || ''
        }} 
      />
    </div>
  )
}
