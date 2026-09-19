import { requirePermission } from '@/lib/auth/rbac'
import { getScholarshipFormOptions } from '@/lib/finance/scholarships/queries'
import { ProgramForm } from '../program-form'
import { Card } from '@/components/ui/Card'

export const dynamic = 'force-dynamic'

export default async function BaruPage() {
  await requirePermission('finance.billing.manage')
  
  const options = await getScholarshipFormOptions()

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Buat Program Beasiswa Baru</h2>
        <p className="text-sm text-gray-500 mt-1">
          Program yang baru dibuat akan berstatus DRAFT dan dapat diedit sebelum diaktifkan.
        </p>
      </div>

      <Card className="p-6">
        <ProgramForm 
          feeTypes={options.feeTypes} 
          funds={options.funds} 
          expenseAccounts={options.expenseAccounts} 
        />
      </Card>
    </div>
  )
}
