import { requirePermission } from '@/lib/auth/rbac'
import { getScholarshipAwards } from '@/lib/finance/scholarships/queries'
import { notFound, redirect } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import { ArrowLeft, Edit, Trash2 } from 'lucide-react'
import { revokeStudentScholarshipAction } from '../../actions'
import { formatRupiah } from '@/lib/finance/utils'

export const dynamic = 'force-dynamic'

export default async function AwardDetailPage(props: { params: Promise<{ id: string }> }) {
  await requirePermission('finance.billing.view')
  const { session } = await requirePermission('finance.billing.manage').catch(() => ({ session: null }))
  const canManage = !!session

  const params = await props.params
  const awardId = parseInt(params.id, 10)
  if (isNaN(awardId)) notFound()

  // We reuse the list query to fetch detail since it has all the joins
  const data = await getScholarshipAwards({ page: 1, limit: 1 }) // wait, we need to filter by ID...
  // Let me just import db and query directly here for simplicity, or we can use a getAwardById query.
  // Actually I will import db here since I just need one award.
  const { financeDb } = await import('@/lib/finance/tx')
  const { studentScholarships, scholarshipPrograms, students, academicYears } = await import('@/drizzle/schema')
  const { eq } = await import('drizzle-orm')
  const { serializeAmountForApi } = await import('@/lib/finance/utils')

  const [award] = await financeDb.select({
    id: studentScholarships.id,
    studentId: studentScholarships.studentId,
    studentName: students.fullName,
    programId: studentScholarships.scholarshipProgramId,
    programName: scholarshipPrograms.name,
    calculationType: scholarshipPrograms.calculationType,
    percentageBasisPoints: scholarshipPrograms.percentageBasisPoints,
    fixedAmount: scholarshipPrograms.fixedAmount,
    academicYearId: studentScholarships.academicYearId,
    academicYearName: academicYears.name,
    startDate: studentScholarships.startDate,
    endDate: studentScholarships.endDate,
    status: studentScholarships.status,
    notes: studentScholarships.notes
  })
  .from(studentScholarships)
  .innerJoin(students, eq(students.id, studentScholarships.studentId))
  .innerJoin(scholarshipPrograms, eq(scholarshipPrograms.id, studentScholarships.scholarshipProgramId))
  .innerJoin(academicYears, eq(academicYears.id, studentScholarships.academicYearId))
  .where(eq(studentScholarships.id, awardId))

  if (!award) notFound()



  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE': return <Badge variant="success">Aktif</Badge>
      case 'REVOKED': return <Badge variant="danger">Dicabut</Badge>
      default: return <Badge variant="neutral">{status}</Badge>
    }
  }

  const handleRevoke = async (formData: FormData) => {
    'use server'
    const notes = formData.get('notes') as string
    await revokeStudentScholarshipAction(awardId, notes)
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/admin/keuangan/beasiswa?tab=recipients">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
        </Link>
        <h2 className="text-xl font-bold text-gray-900 flex-1">Detail Penerima Beasiswa</h2>
        {getStatusBadge(award.status)}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Informasi Beasiswa</h3>
            
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
              <div>
                <dt className="text-sm font-medium text-gray-500">Santri</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900">
                  <Link href={`/admin/santri/${award.studentId}`} className="text-blue-600 hover:underline">
                    {award.studentName}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Program Beasiswa</dt>
                <dd className="mt-1 text-sm font-medium text-[#18085A]">
                  <Link href={`/admin/keuangan/beasiswa/${award.programId}`} className="hover:underline">
                    {award.programName}
                  </Link>
                </dd>
                <dd className="text-xs text-gray-500 mt-0.5">
                  Nilai: {award.calculationType === 'PERCENTAGE' 
                    ? `${(award.percentageBasisPoints || 0) / 100}%` 
                    : award.calculationType === 'FIXED_AMOUNT' 
                      ? formatRupiah(award.fixedAmount) 
                      : 'Penuh (100%)'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Tahun Ajaran</dt>
                <dd className="mt-1 text-sm text-gray-900">{award.academicYearName}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Periode</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {award.startDate} s.d {award.endDate ? award.endDate : '(Seterusnya)'}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Catatan</dt>
                <dd className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded-md border border-gray-100">
                  {award.notes || '-'}
                </dd>
              </div>
            </dl>
          </Card>
        </div>

        <div className="space-y-6">
          {canManage && (
            <Card className="p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">Aksi</h3>
              <div className="space-y-4 flex flex-col">
                {award.status === 'ACTIVE' && (
                  <>
                    <Link href={`/admin/keuangan/beasiswa/award/${award.id}/edit`} className="w-full">
                      <Button variant="outline" className="w-full justify-center">
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Periode & Catatan
                      </Button>
                    </Link>
                    
                    <div className="pt-4 border-t border-gray-200">
                      <p className="text-xs text-red-600 mb-3 text-center">
                        Mencabut beasiswa akan menghentikan beasiswa pada tagihan bulan berikutnya. Tagihan yang sudah terbit tidak akan berubah.
                      </p>
                      <form action={handleRevoke}>
                        <div className="space-y-3">
                          <textarea 
                            name="notes" 
                            placeholder="Alasan pencabutan..." 
                            required
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white h-20 resize-none"
                          />
                          <Button type="submit" variant="danger" className="w-full justify-center">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Cabut Beasiswa
                          </Button>
                        </div>
                      </form>
                    </div>
                  </>
                )}

                {award.status === 'REVOKED' && (
                  <div className="text-sm text-center text-gray-500 p-2 border border-dashed border-gray-300 rounded">
                    Beasiswa telah dicabut dan tidak dapat diedit kembali.
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
