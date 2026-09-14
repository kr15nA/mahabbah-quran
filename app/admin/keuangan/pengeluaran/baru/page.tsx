export const dynamic = 'force-dynamic'
import { requirePermission } from '../../../../../lib/auth/rbac'
import { db } from '../../../../../lib/db/client'
import { financeCategories, financeFunds, financeCategoryFunds } from '../../../../../drizzle/schema'
import { eq, and, asc } from 'drizzle-orm'
import DisbursementForm from './DisbursementForm'

export default async function CreateDisbursementPage() {
  await requirePermission('finance.disbursement.manage')

  const categories = await db.select({
    id: financeCategories.id,
    name: financeCategories.name,
  })
  .from(financeCategories)
  .where(and(eq(financeCategories.isActive, true), eq(financeCategories.type, 'EXPENSE')))
  .orderBy(asc(financeCategories.name))

  const funds = await db.select({
    id: financeFunds.id,
    name: financeFunds.name,
  })
  .from(financeFunds)
  .where(eq(financeFunds.isActive, true))
  .orderBy(asc(financeFunds.name))

  const categoryFunds = await db.select()
    .from(financeCategoryFunds)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Pengajuan Pengeluaran Baru</h2>
        <p className="text-sm text-gray-500 mt-1">Buat draft pengajuan pengeluaran (DRAFT)</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <DisbursementForm 
          categories={categories} 
          funds={funds} 
          categoryFunds={categoryFunds} 
        />
      </div>
    </div>
  )
}
