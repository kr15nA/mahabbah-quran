import { requirePermission } from '@/lib/auth/rbac'
import { getScholarshipProgramDetail, getScholarshipFormOptions } from '@/lib/finance/scholarships/queries'
import { ProgramForm } from '../../program-form'
import { Card } from '@/components/ui/Card'
import { notFound, redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function EditProgramPage(props: { params: Promise<{ id: string }> }) {
  await requirePermission('finance.billing.manage')
  
  const params = await props.params
  const programId = parseInt(params.id, 10)
  if (isNaN(programId)) notFound()

  const program = await getScholarshipProgramDetail(programId)
  if (!program) notFound()

  if (program.status !== 'DRAFT') {
    // Only DRAFT programs can be edited fully. ACTIVE is read-only.
    redirect(`/admin/keuangan/beasiswa/${programId}`)
  }

  const options = await getScholarshipFormOptions()

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Edit Program Beasiswa</h2>
        <p className="text-sm text-gray-500 mt-1">
          Ubah konfigurasi program. Hanya program berstatus DRAFT yang dapat diubah.
        </p>
      </div>

      <Card className="p-6">
        <ProgramForm 
          initialData={program}
          feeTypes={options.feeTypes} 
          funds={options.funds} 
          expenseAccounts={options.expenseAccounts} 
        />
      </Card>
    </div>
  )
}
