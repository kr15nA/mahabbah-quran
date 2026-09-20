import { getSession } from '@/lib/auth/session'
import { getSelfStudentProfile } from '@/lib/identity/learner'
import { getStudentScholarships } from '@/lib/finance/scholarships/queries'
import { Sparkles, Calendar } from 'lucide-react'

export default async function SantriPage() {
  const session = await getSession()
  if (!session) return null // Handled by layout redirect

  const profile = await getSelfStudentProfile(session.userId)
  
  let activeScholarship = null
  if (profile) {
    const scholarships = await getStudentScholarships(Number(profile.id))
    activeScholarship = scholarships.find(s => {
      if (!s.startDate) return false
      const now = new Date()
      const start = new Date(s.startDate)
      if (now < start) return false
      if (s.endDate) {
        const end = new Date(s.endDate)
        if (now > end) return false
      }
      return true
    })
  }

  const formatBenefit = (s: any) => {
    if (s.calculationType === 'FULL') return 'Beasiswa Penuh (100%)'
    if (s.calculationType === 'PERCENTAGE') return `Diskon Biaya ${s.percentageBasisPoints! / 100}%`
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(BigInt(s.fixedAmount || 0))
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Assalamu'alaikum, {profile?.fullName.split(' ')[0] || session?.fullName.split(' ')[0]}
        </h1>
        <p className="text-sm text-gray-500 mt-1">Selamat datang di Portal Santri Mahabbah Qur'an</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="mb-4 pb-4 border-b border-gray-100">
          <h2 className="text-lg font-bold">Profil Belajar</h2>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500">Nama Santri</p>
            <p className="font-medium text-gray-900">{profile?.fullName || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <p className="font-medium text-gray-900">
              {profile?.status === 'active' ? (
                <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Aktif</span>
              ) : (
                <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">{profile?.status || 'Tidak Aktif'}</span>
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="mb-4 pb-4 border-b border-gray-100 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#4B21A2]" />
          <h2 className="text-lg font-bold">Beasiswa Saya</h2>
        </div>
        
        {!profile ? (
          <p className="text-sm text-gray-500 italic">Data profil tidak ditemukan.</p>
        ) : !activeScholarship ? (
          <p className="text-sm text-gray-500 italic">Belum ada program beasiswa</p>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700 ring-1 ring-inset ring-indigo-600/20 mb-2">AKTIF</span>
                <h3 className="font-bold text-lg text-[#18085A]">{activeScholarship.programName}</h3>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 text-sm pt-2">
              <div>
                <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Benefit Beasiswa</div>
                <div className="font-semibold text-gray-900">{formatBenefit(activeScholarship)}</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Periode</div>
                <div className="font-medium text-gray-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  {new Date(activeScholarship.startDate).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })} – {activeScholarship.endDate ? new Date(activeScholarship.endDate).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }) : 'Seterusnya'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-md bg-blue-50 p-4 border border-blue-100">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Informasi Pengembangan</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                Fitur perkembangan Hafalan, Tahsin, Tasmi, Absensi, dan Materi akan tersedia pada tahap berikutnya.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
