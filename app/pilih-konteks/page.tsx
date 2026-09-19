import { getSession } from '@/lib/auth/session'
import { getAvailableUserContexts } from '@/lib/identity/contexts'
import { redirect } from 'next/navigation'
import { ContextOption } from './ContextOption'

export default async function PilihKonteksPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const contexts = await getAvailableUserContexts(session)

  const availableContexts = [
    { id: 'admin', label: 'Admin', active: contexts.admin, color: 'bg-red-50 text-red-700 hover:bg-red-100' },
    { id: 'teacher', label: 'Guru', active: contexts.teacher, color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
    { id: 'guardian', label: 'Orang Tua', active: contexts.guardian, color: 'bg-green-50 text-green-700 hover:bg-green-100' },
    { id: 'learner', label: 'Santri', active: contexts.learner, color: 'bg-amber-50 text-amber-700 hover:bg-amber-100' },
  ].filter((c) => c.active)

  if (availableContexts.length === 0) {
    redirect('/auth/forbidden')
  }

  // If somehow they get here with only 1 context, send them directly.
  if (availableContexts.length === 1) {
    redirect(`/auth/landing`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold">Pilih Portal</h2>
        </div>
        <div className="space-y-4">
          <p className="text-center text-sm text-gray-500 mb-6">
            Akun Anda memiliki akses ke beberapa portal. Silakan pilih portal yang ingin Anda buka.
          </p>
          <div className="grid gap-3">
            {availableContexts.map((ctx) => (
              <ContextOption key={ctx.id} contextId={ctx.id as any} label={ctx.label} colorClass={ctx.color} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
