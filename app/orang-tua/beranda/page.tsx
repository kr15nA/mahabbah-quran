import { getSession } from '@/lib/auth/session'
import { getFamilyDashboardData } from '@/lib/guardians/family-dashboard'
import { redirect } from 'next/navigation'
import { User } from 'lucide-react'
import { FamilyChildCard } from '@/components/orang-tua/FamilyChildCard'

export default async function ParentBerandaPage() {
  const session = await getSession()
  if (!session || session.role !== 'orang_tua') {
    redirect('/login')
  }

  const childrenData = await getFamilyDashboardData(session.userId)

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8">
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-center">
        <h1 className="font-extrabold text-lg text-[#18085A]">Assalamu'alaikum, {session.fullName}</h1>
        <p className="text-sm font-medium text-gray-600 mt-1">
          {childrenData.length > 0 
            ? `${childrenData.length} santri terhubung` 
            : 'Belum ada santri terhubung'}
        </p>
      </div>

      {childrenData.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="font-bold text-gray-900 mb-1">Belum Ada Data Anak</h3>
          <p className="text-sm text-gray-500">Belum ada santri yang terhubung ke akun Anda. Silakan hubungi admin.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {childrenData.map(child => (
            <FamilyChildCard key={child.student_id} child={child} />
          ))}
        </div>
      )}
    </div>
  )
}

