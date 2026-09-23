export const dynamic = 'force-dynamic'

import { requireAuth } from '@/lib/auth/rbac'
import { getMyScholarships } from '@/lib/student-portal/queries'
import { Sparkles, Calendar, CheckCircle2, AlertCircle } from 'lucide-react'

export default async function SantriBeasiswaPage() {
  const { session } = await requireAuth()
  const scholarships = await getMyScholarships(session.userId)

  const formatBenefit = (s: any) => {
    if (s.calculationType === 'FULL') return 'Beasiswa Penuh (100%)'
    if (s.calculationType === 'PERCENTAGE') return `Diskon Biaya ${s.percentageBasisPoints! / 100}%`
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(BigInt(s.fixedAmount || 0))
  }

  const isScholarshipActive = (s: any) => {
    if (!s.startDate) return false
    const now = new Date()
    const start = new Date(s.startDate)
    if (now < start) return false
    if (s.endDate && now > new Date(s.endDate)) return false
    return true
  }

  const activeScholarships = scholarships.filter(isScholarshipActive)
  const pastScholarships = scholarships.filter(s => !isScholarshipActive(s))

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Beasiswa</h1>
        <p className="text-sm text-gray-500 mt-1">Daftar program beasiswa yang Anda terima.</p>
      </div>

      <div className="space-y-6">
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#4B21A2]" />
            Beasiswa Aktif
          </h2>
          {activeScholarships.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
              <p className="text-sm text-gray-500">Saat ini Anda tidak memiliki program beasiswa aktif.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {activeScholarships.map(s => (
                <div key={s.id} className="bg-white rounded-xl shadow-sm border border-indigo-100 overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-10 -mt-10 opacity-60"></div>
                  <div className="p-6 relative">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700 ring-1 ring-inset ring-indigo-600/20 mb-2">AKTIF</span>
                        <h3 className="font-bold text-xl text-[#18085A]">{s.programName}</h3>
                      </div>
                    </div>
                    
                    <div className="grid sm:grid-cols-2 gap-6 mt-6 pt-6 border-t border-indigo-50">
                      <div>
                        <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Benefit Beasiswa</div>
                        <div className="font-bold text-gray-900 text-lg">{formatBenefit(s)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Masa Berlaku</div>
                        <div className="font-medium text-gray-700 flex items-center gap-1.5 mt-1">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {new Date(s.startDate).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })} – {s.endDate ? new Date(s.endDate).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }) : 'Seterusnya'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {pastScholarships.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2 mt-8">
              <CheckCircle2 className="w-5 h-5 text-gray-400" />
              Riwayat Beasiswa
            </h2>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="divide-y divide-gray-100">
                {pastScholarships.map(s => (
                  <div key={s.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-gray-900">{s.programName}</h3>
                      <p className="text-sm text-gray-500 mt-1">{formatBenefit(s)}</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10 mb-1">Tidak Aktif</span>
                      <p className="text-xs text-gray-500 flex items-center gap-1 justify-end mt-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(s.startDate).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })} – {s.endDate ? new Date(s.endDate).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }) : 'Seterusnya'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
