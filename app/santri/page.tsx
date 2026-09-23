export const dynamic = 'force-dynamic'

import { requireAuth } from '@/lib/auth/rbac'
import { getMyAcademicProfile, getMyCurrentTeachers, getMyScholarships } from '@/lib/student-portal/queries'
import { Sparkles, Users, BookOpen, GraduationCap } from 'lucide-react'

export default async function SantriDashboard() {
  const { session } = await requireAuth()
  
  // self-scoped queries taking userId
  const profile = await getMyAcademicProfile(session.userId)
  const teachers = await getMyCurrentTeachers(session.userId)
  const scholarships = await getMyScholarships(session.userId)

  // Derive active scholarship
  const activeScholarship = scholarships.find(s => {
    if (!s.startDate) return false
    const now = new Date()
    const start = new Date(s.startDate)
    if (now < start) return false
    if (s.endDate && now > new Date(s.endDate)) return false
    return true
  })

  // Format scholarship benefit
  const formatBenefit = (s: any) => {
    if (s.calculationType === 'FULL') return 'Beasiswa Penuh (100%)'
    if (s.calculationType === 'PERCENTAGE') return `Diskon Biaya ${s.percentageBasisPoints! / 100}%`
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(BigInt(s.fixedAmount || 0))
  }

  // Active teacher summary
  const activeTeacher = teachers.find(t => t.isActive && t.status === 'ACTIVE')

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Assalamu'alaikum, {profile?.fullName.split(' ')[0] || session.fullName.split(' ')[0]}
        </h1>
        <p className="text-sm text-gray-500 mt-1">Selamat datang di Portal Santri Mahabbah Qur'an</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Identity Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100">
              <GraduationCap className="w-5 h-5 text-amber-600" />
              <h2 className="text-lg font-bold">Identitas Santri</h2>
            </div>
            {profile ? (
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-gray-500">Nama Lengkap</p>
                  <p className="font-medium text-gray-900">{profile.fullName}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-500">Program</p>
                    <p className="font-medium text-gray-900">{profile.activeEnrollment?.programName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Kelas</p>
                    <p className="font-medium text-gray-900">{profile.activeEnrollment?.className || '-'}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">Data profil tidak tersedia.</p>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
            <span className="text-xs font-medium text-gray-500">Status</span>
            {profile?.status === 'active' ? (
              <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Aktif</span>
            ) : (
              <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">{profile?.status || 'Tidak Aktif'}</span>
            )}
          </div>
        </div>

        {/* Teacher & Scholarship Summary */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold">Pembimbing Saat Ini</h2>
            </div>
            {activeTeacher ? (
              <div>
                <p className="font-medium text-gray-900">{activeTeacher.teacherName}</p>
                <p className="text-sm text-gray-500">{activeTeacher.programName} - {activeTeacher.className}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">Belum ada pembimbing yang ditugaskan pada tahun ajaran ini.</p>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-[#4B21A2]" />
              <h2 className="text-lg font-bold">Beasiswa Aktif</h2>
            </div>
            {activeScholarship ? (
              <div>
                <h3 className="font-bold text-gray-900">{activeScholarship.programName}</h3>
                <p className="text-sm font-medium text-[#4B21A2] mt-1">{formatBenefit(activeScholarship)}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">Tidak ada beasiswa aktif.</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-md bg-blue-50 p-4 border border-blue-100">
        <div className="flex">
          <div className="flex-shrink-0">
            <BookOpen className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Catatan Belajar</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                Fitur perkembangan Hafalan, Tahsin, Tasmi, dan Kehadiran akan tersedia pada tahap berikutnya (Phase D2).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
