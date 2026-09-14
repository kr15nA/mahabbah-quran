import { requireAuth, hasPermission } from '@/lib/auth/rbac'
import { db } from '@/lib/db/client'
import { financeParties, financeCategories, financeCampaigns, financeAccounts } from '@/drizzle/schema'
import { eq, and } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import ZiswafReceiptForm from './ZiswafReceiptForm'

export const dynamic = 'force-dynamic'

export default async function BaruPenerimaanPage() {
  const { session } = await requireAuth()
  const canManage = await hasPermission(session, 'finance.ziswaf.manage')
  if (!canManage) redirect('/admin/keuangan/ziswaf/penerimaan')
  
  // Load necessary reference data
  const parties = await db.select().from(financeParties).orderBy(financeParties.name)
  
  const categories = await db.select()
    .from(financeCategories)
    .where(and(eq(financeCategories.domain, 'ZISWAF'), eq(financeCategories.isActive, true), eq(financeCategories.type, 'INCOME')))
    .orderBy(financeCategories.name)
    
  const campaigns = await db.select()
    .from(financeCampaigns)
    .where(eq(financeCampaigns.domain, 'ZISWAF'))
    .orderBy(financeCampaigns.name)
    
  const assetAccounts = await db.select()
    .from(financeAccounts)
    .where(and(eq(financeAccounts.accountType, 'ASSET'), eq(financeAccounts.isActive, true)))
    .orderBy(financeAccounts.name)

  // Config validation check
  const isConfigComplete = categories.length > 0 && assetAccounts.length > 0

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Buat Penerimaan ZISWAF</h2>
        <p className="text-sm text-gray-500">Catat penerimaan donasi, zakat, infaq, sedekah, atau wakaf baru.</p>
      </div>

      {!isConfigComplete ? (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg">
          <h3 className="font-semibold mb-1">Konfigurasi ZISWAF belum lengkap</h3>
          <p className="text-sm">
            Lengkapi kategori (bertipe INCOME dan domain ZISWAF) dan akun keuangan (bertipe ASSET) terlebih dahulu.
          </p>
        </div>
      ) : (
        <ZiswafReceiptForm 
          parties={parties} 
          categories={categories} 
          campaigns={campaigns} 
          assetAccounts={assetAccounts} 
        />
      )}
    </div>
  )
}
