import { getSession } from '@/lib/auth/session'
import { resolveParentChildContext } from '@/lib/guardians/parent-context'
import { getStudentScholarships } from '@/lib/finance/scholarships/queries'
import { redirect } from 'next/navigation'
import TopBar from '@/components/layout/TopBar'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Sparkles, Calendar, BookOpen, AlertCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ParentBeasiswaPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = await getSession()
  if (!session || session.role !== 'orang_tua') {
    redirect('/login')
  }

  const resolvedParams = await searchParams
  const requestedChildId = typeof resolvedParams.child_id === 'string' ? resolvedParams.child_id : undefined

  const resolution = await resolveParentChildContext({
    userId: session.userId,
    requestedChildId
  })

  if (resolution.status === 'NO_CHILDREN' || resolution.status === 'INVALID_CHILD' || resolution.status === 'CHILD_REQUIRED') {
    redirect('/orang-tua/beranda')
  }

  if (resolution.status === 'FORBIDDEN_CHILD') {
    return (
      <div className="pb-24">
        <TopBar title="Beasiswa" showBack />
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto w-full">
          <div className="bg-red-50 p-8 rounded-2xl border border-red-200 shadow-sm text-center">
            <h3 className="font-bold text-red-900 mb-2 text-xl">Akses Ditolak</h3>
            <p className="text-sm text-red-700">Anda tidak memiliki akses untuk melihat data santri ini.</p>
          </div>
        </div>
      </div>
    )
  }

  const { childId, children } = resolution
  const selectedChild = children.find(c => c.student_id === childId)
  if (!selectedChild) redirect('/orang-tua/beranda')

  const scholarships = await getStudentScholarships(Number(childId))

  const activeScholarships = scholarships.filter(s => {
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

  const historicalScholarships = scholarships.filter(s => !activeScholarships.find(a => a.id === s.id))

  const formatBenefit = (s: any) => {
    if (s.calculationType === 'FULL') return 'Beasiswa Penuh (100%)'
    if (s.calculationType === 'PERCENTAGE') return `Diskon Biaya ${s.percentageBasisPoints! / 100}%`
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(s.fixedAmount))
  }

  return (
    <div className="pb-24">
      <TopBar title={`Beasiswa: ${selectedChild.student_name}`} showBack />
      
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto w-full">
        {scholarships.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm text-center">
            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-indigo-300" />
            </div>
            <h3 className="font-bold text-gray-900 mb-1">Belum Ada Program Beasiswa</h3>
            <p className="text-sm text-gray-500">Saat ini tidak ada catatan beasiswa untuk santri ini.</p>
          </div>
        ) : (
          <>
            <section className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#4B21A2]" /> Beasiswa Aktif
              </h2>
              {activeScholarships.length === 0 ? (
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 text-center text-sm text-gray-500">
                  Belum ada program beasiswa aktif
                </div>
              ) : (
                <div className="grid gap-4">
                  {activeScholarships.map(s => (
                    <Card key={s.id} className="p-5 overflow-hidden relative">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-bl-full -z-10" />
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <Badge variant="primary">AKTIF</Badge>
                          <h3 className="font-bold text-lg text-[#18085A] mt-2">{s.programName}</h3>
                        </div>
                      </div>
                      
                      <div className="grid sm:grid-cols-2 gap-4 text-sm mt-4 pt-4 border-t border-gray-100">
                        <div>
                          <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Benefit Beasiswa</div>
                          <div className="font-semibold text-gray-900">{formatBenefit(s)}</div>
                        </div>
                        <div>
                          <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Periode</div>
                          <div className="font-medium text-gray-700 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            {new Date(s.startDate).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })} – {s.endDate ? new Date(s.endDate).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }) : 'Seterusnya'}
                          </div>
                        </div>
                        <div className="sm:col-span-2">
                          <div className="text-gray-500 text-xs uppercase tracking-wider mb-1">Tahun Ajaran</div>
                          <div className="font-medium text-gray-700">{/* s.academicYearName would go here if fetched */} {s.academicYearId ? 'Tahun Ajaran Aktif' : ''}</div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            {historicalScholarships.length > 0 && (
              <section className="space-y-4 pt-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-gray-500" /> Riwayat Beasiswa
                </h2>
                <div className="grid gap-3">
                  {historicalScholarships.map(s => (
                    <div key={s.id} className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="font-semibold text-gray-900">{s.programName}</div>
                        <div className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                          <span>{formatBenefit(s)}</span>
                          <span className="w-1 h-1 rounded-full bg-gray-300" />
                          <span>{new Date(s.startDate).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })} – {s.endDate ? new Date(s.endDate).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }) : 'Selesai'}</span>
                        </div>
                      </div>
                      <Badge variant="neutral">Tidak Aktif</Badge>
                    </div>
                  ))}
                </div>
              </section>
            )}
            
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-3 mt-6">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-semibold mb-1">Informasi Beasiswa</p>
                <p>Riwayat beasiswa di atas adalah catatan pendaftaran program beasiswa. Rincian potongan beasiswa per tagihan dapat dilihat pada menu <b>Tagihan</b> pada rincian setiap invoice bulan terkait.</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
