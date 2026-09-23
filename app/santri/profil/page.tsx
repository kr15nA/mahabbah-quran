export const dynamic = 'force-dynamic'

import { requireAuth } from '@/lib/auth/rbac'
import { getMyAcademicProfile } from '@/lib/student-portal/queries'
import { User } from 'lucide-react'

export default async function SantriProfilPage() {
  const { session } = await requireAuth()
  const profile = await getMyAcademicProfile(session.userId)

  if (!profile) {
    return (
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Profil Saya</h1>
        <p className="text-sm text-gray-500 italic">Data institusional santri tidak tersedia.</p>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Profil Saya</h1>
        <p className="text-sm text-gray-500 mt-1">Data institusional resmi santri (Read-Only).</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
            <User className="w-6 h-6 text-amber-700" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{profile.fullName}</h2>
            <p className="text-sm text-gray-500">{profile.nickname || 'Nama panggilan belum ditentukan'}</p>
          </div>
        </div>

        <div className="p-6">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Jenis Kelamin</dt>
              <dd className="mt-1 text-sm text-gray-900">{profile.gender === 'L' ? 'Laki-laki' : profile.gender === 'P' ? 'Perempuan' : '-'}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500">Status Santri</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {profile.status === 'active' ? (
                  <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Aktif</span>
                ) : (
                  <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">{profile.status || '-'}</span>
                )}
              </dd>
            </div>
            
            <div className="sm:col-span-2 mt-4 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Penempatan Akademik Saat Ini</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Program</dt>
                  <dd className="mt-1 text-sm text-gray-900">{profile.activeEnrollment?.programName || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Kelas</dt>
                  <dd className="mt-1 text-sm text-gray-900">{profile.activeEnrollment?.className || '-'}</dd>
                </div>
              </div>
            </div>
          </dl>
        </div>
      </div>
    </div>
  )
}
