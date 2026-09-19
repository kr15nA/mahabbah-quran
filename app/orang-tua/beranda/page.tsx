import { getSession } from '@/lib/auth/session'
import { getFamilyDashboardData } from '@/lib/guardians/family-dashboard'
import { resolveParentChildContext } from '@/lib/guardians/parent-context'
import { redirect } from 'next/navigation'
import { User } from 'lucide-react'
import { ChildDashboardSelector } from '@/components/orang-tua/ChildDashboardSelector'
import { SelectedChildDashboard } from '@/components/orang-tua/SelectedChildDashboard'

export default async function ParentBerandaPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = await getSession()
  if (!session || session.role !== 'orang_tua') {
    redirect('/login')
  }

  // Resolve search parameters (Next 15 pattern)
  const resolvedParams = await searchParams
  const requestedChildId = typeof resolvedParams.child_id === 'string' ? resolvedParams.child_id : undefined

  // 1. Resolve canonical context
  const resolution = await resolveParentChildContext({
    userId: session.userId,
    requestedChildId
  })

  // 2. Handle Zero Child
  if (resolution.status === 'NO_CHILDREN') {
    return (
      <div className="space-y-6 pb-20 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8">
        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-center">
          <h1 className="font-extrabold text-lg text-[#18085A]">Assalamu'alaikum, {session.fullName}</h1>
          <p className="text-sm font-medium text-gray-600 mt-1">Belum ada santri terhubung</p>
        </div>
        <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="font-bold text-gray-900 mb-1">Belum Ada Data Anak</h3>
          <p className="text-sm text-gray-500">Belum ada santri yang terhubung ke akun Anda. Silakan hubungi admin.</p>
        </div>
      </div>
    )
  }

  // 3. Handle specific routing / fallback states
  if (resolution.status === 'INVALID_CHILD' || resolution.status === 'FORBIDDEN_CHILD') {
    redirect('/orang-tua/beranda')
  }

  if (resolution.status === 'CHILD_REQUIRED') {
    // Deterministic Beranda-specific default UX
    // (In case multi-child and no child_id param, pick the first one and redirect to canonical URL)
    // resolveParentChildContext already orders children safely
    redirect(`/orang-tua/beranda?child_id=${resolution.children[0].student_id}`)
  }

  // 4. Authorized context guaranteed
  const { children, childId } = resolution

  // Fetch batched metrics for all children, then find the selected one
  const allDashboards = await getFamilyDashboardData(session.userId)
  const selectedDashboard = allDashboards.find(d => d.student_id === childId)

  // This shouldn't happen unless data mutated severely during the two queries, but safeguard:
  if (!selectedDashboard) {
    return (
      <div className="p-8 text-center text-red-600 font-bold">
        Terjadi kesalahan: Data santri tidak ditemukan (ID: {childId}).
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8">
      {/* Family Header */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-center">
        <h1 className="font-extrabold text-lg text-[#18085A]">Assalamu'alaikum, {session.fullName}</h1>
        <p className="text-sm font-medium text-gray-600 mt-1">
          {children.length} santri terhubung
        </p>
      </div>

      {/* Child Selector (only renders if >1) */}
      <ChildDashboardSelector childrenList={children} selectedChildId={childId} />

      {/* Main Selected Dashboard */}
      <SelectedChildDashboard child={selectedDashboard} />
    </div>
  )
}

