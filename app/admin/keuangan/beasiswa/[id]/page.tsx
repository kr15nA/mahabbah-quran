import { requirePermission } from '@/lib/auth/rbac'
import { getScholarshipProgramDetail } from '@/lib/finance/scholarships/queries'
import { notFound } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'
import { Edit, CheckCircle, XCircle, ArrowLeft } from 'lucide-react'
import { activateScholarshipProgramAction, deactivateScholarshipProgramAction } from '../actions'
import { revalidatePath } from 'next/cache'
import { formatRupiah } from '@/lib/finance/utils'

export const dynamic = 'force-dynamic'

export default async function ProgramDetailPage(props: { params: Promise<{ id: string }> }) {
  await requirePermission('finance.billing.view')
  const { session } = await requirePermission('finance.billing.manage').catch(() => ({ session: null }))
  const canManage = !!session

  const params = await props.params
  const programId = parseInt(params.id, 10)
  if (isNaN(programId)) notFound()

  const program = await getScholarshipProgramDetail(programId)
  if (!program) notFound()



  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT': return <Badge variant="neutral">Draft</Badge>
      case 'ACTIVE': return <Badge variant="success">Aktif</Badge>
      case 'INACTIVE': return <Badge variant="danger">Nonaktif</Badge>
      default: return <Badge variant="neutral">{status}</Badge>
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'FULL': return 'Penuh'
      case 'PERCENTAGE': return 'Persentase'
      case 'FIXED_AMOUNT': return 'Nominal Tetap'
      default: return type
    }
  }

  // Server actions for this page (could also be imported if "use client" on a separate form component)
  const handleActivate = async () => {
    'use server'
    await activateScholarshipProgramAction(program.id)
  }

  const handleDeactivate = async () => {
    'use server'
    await deactivateScholarshipProgramAction(program.id)
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/admin/keuangan/beasiswa">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
        </Link>
        <h2 className="text-xl font-bold text-gray-900 flex-1">Detail Program Beasiswa</h2>
        {getStatusBadge(program.status)}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">{program.name}</h3>
            
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
              <div>
                <dt className="text-sm font-medium text-gray-500">Jenis Perhitungan</dt>
                <dd className="mt-1 text-sm text-gray-900">{getTypeLabel(program.calculationType)}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Nilai Manfaat</dt>
                <dd className="mt-1 text-sm font-mono text-[#18085A] font-bold">
                  {program.calculationType === 'PERCENTAGE' 
                    ? `${(program.percentageBasisPoints || 0) / 100}%` 
                    : program.calculationType === 'FIXED_AMOUNT' 
                      ? formatRupiah(program.fixedAmount || '0') 
                      : '100%'}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Deskripsi</dt>
                <dd className="mt-1 text-sm text-gray-900">{program.description || '-'}</dd>
              </div>
            </dl>
          </Card>

          <Card className="p-6">
            <h3 className="text-md font-bold text-gray-900 mb-4">Jenis Biaya yang Ditanggung</h3>
            <ul className="space-y-3">
              {program.feeTypes.map((f: any) => (
                <li key={f.id} className="flex justify-between items-center text-sm border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                  <span className="text-gray-700">{f.name}</span>
                  <span className="font-mono text-gray-500">{formatRupiah(f.defaultAmount)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6 bg-gray-50">
            <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">Konfigurasi Akuntansi</h3>
            <dl className="space-y-4">
              <div>
                <dt className="text-xs font-medium text-gray-500">Fund Sumber</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900">{program.fundName || '-'}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">Akun Beban (Expense)</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900">{program.accountName || '-'}</dd>
              </div>
            </dl>
          </Card>

          {canManage && (
            <Card className="p-6">
              <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">Aksi</h3>
              <div className="space-y-3 flex flex-col">
                {program.status === 'DRAFT' && (
                  <>
                    <Link href={`/admin/keuangan/beasiswa/${program.id}/edit`} className="w-full">
                      <Button variant="outline" className="w-full justify-center">
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Program
                      </Button>
                    </Link>
                    <form action={handleActivate}>
                      <Button type="submit" variant="primary" className="w-full justify-center">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Aktifkan Program
                      </Button>
                    </form>
                    <p className="text-xs text-gray-500 text-center">
                      Pastikan akun beban dan jenis biaya sudah sesuai sebelum mengaktifkan.
                    </p>
                  </>
                )}
                
                {program.status === 'ACTIVE' && (
                  <>
                    <div className="bg-blue-50 text-blue-700 p-3 rounded text-xs mb-2 text-center">
                      Program Aktif bersifat Read-Only untuk menjaga konsistensi finansial.
                    </div>
                    <form action={handleDeactivate}>
                      <Button type="submit" variant="danger" className="w-full justify-center">
                        <XCircle className="w-4 h-4 mr-2" />
                        Nonaktifkan
                      </Button>
                    </form>
                    <p className="text-xs text-gray-500 text-center">
                      Tagihan yang sudah terbentuk tidak akan berubah. Tagihan baru tidak akan menerima beasiswa ini.
                    </p>
                  </>
                )}

                {program.status === 'INACTIVE' && (
                  <div className="text-sm text-center text-gray-500 p-2 border border-dashed border-gray-300 rounded">
                    Program Nonaktif tidak dapat diedit atau digunakan kembali. Silakan buat program baru.
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
