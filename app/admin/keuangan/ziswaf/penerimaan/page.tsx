import { requireAuth, hasPermission } from '@/lib/auth/rbac'
import { db } from '@/lib/db/client'
import { ziswafReceipts, financeParties, financeCategories, financeCampaigns } from '@/drizzle/schema'
import { desc, eq } from 'drizzle-orm'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatRupiah } from '@/lib/finance/utils'

export const dynamic = 'force-dynamic'

export default async function PenerimaanPage() {
  const { session } = await requireAuth()
  const canView = await hasPermission(session, 'finance.ziswaf.view')
  if (!canView) redirect('/admin')
  
  const receipts = await db.select({
    receipt: ziswafReceipts,
    party: financeParties,
    category: financeCategories,
    campaign: financeCampaigns
  })
  .from(ziswafReceipts)
  .leftJoin(financeParties, eq(ziswafReceipts.partyId, financeParties.id))
  .leftJoin(financeCategories, eq(ziswafReceipts.categoryId, financeCategories.id))
  .leftJoin(financeCampaigns, eq(ziswafReceipts.campaignId, financeCampaigns.id))
  .orderBy(desc(ziswafReceipts.createdAt))
  .limit(50) // Paginate later

  const statusColors: Record<string, 'neutral' | 'success' | 'warning' | 'danger' | 'primary'> = {
    DRAFT: 'warning',
    CONFIRMED: 'success',
    CANCELLED: 'neutral',
    REFUNDED: 'danger'
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Penerimaan ZISWAF</h2>
          <p className="text-sm text-gray-500">Daftar penerimaan zakat, infaq, sedekah, dan wakaf</p>
        </div>
        <div className="flex items-center gap-2">
          <Link 
            href="/admin/keuangan/ziswaf/penerimaan/baru"
            className="bg-[#18085A] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#18085A]/90 transition-colors"
          >
            + Buat Penerimaan
          </Link>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">No. Penerimaan</th>
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4">Donatur</th>
                <th className="px-6 py-4">Kategori / Program</th>
                <th className="px-6 py-4 text-right">Jumlah (Rp)</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {receipts.map(r => (
                <tr key={r.receipt.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{r.receipt.receiptNumber}</td>
                  <td className="px-6 py-4 text-gray-600">{new Date(r.receipt.receivedDate).toLocaleDateString('id-ID')}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {r.party ? r.party.name : 'Hamba Allah'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-gray-900 font-medium">{r.category?.name || r.receipt.ziswafType}</div>
                    {r.campaign && <div className="text-xs text-gray-500 line-clamp-1">{r.campaign.name}</div>}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-gray-900">
                    {formatRupiah(r.receipt.amount)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Badge variant={statusColors[r.receipt.status] || 'neutral'}>
                      {r.receipt.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link 
                      href={`/admin/keuangan/ziswaf/penerimaan/${r.receipt.id}`}
                      className="text-[#18085A] hover:underline font-medium text-sm"
                    >
                      Detail
                    </Link>
                  </td>
                </tr>
              ))}
              {receipts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    Belum ada data penerimaan ZISWAF.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
