import { requireAuth, hasPermission } from '@/lib/auth/rbac'
import { db } from '@/lib/db/client'
import { financeCampaigns, financeFunds } from '@/drizzle/schema'
import { desc, eq } from 'drizzle-orm'
import { Card } from '@/components/ui/Card'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function ProgramPage() {
  const { session } = await requireAuth()
  const canView = await hasPermission(session, 'finance.ziswaf.view')
  if (!canView) redirect('/admin')
  
  const campaigns = await db.select({
    campaign: financeCampaigns,
    fund: financeFunds
  })
  .from(financeCampaigns)
  .leftJoin(financeFunds, eq(financeCampaigns.defaultFundId, financeFunds.id))
  .where(eq(financeCampaigns.domain, 'ZISWAF'))
  .orderBy(desc(financeCampaigns.id))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Program / Campaign ZISWAF</h2>
          <p className="text-sm text-gray-500">Kelola program penggalangan dana</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="bg-[#18085A] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#18085A]/90 transition-colors">
            + Tambah Program
          </button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Kode</th>
                <th className="px-6 py-4">Nama Program</th>
                <th className="px-6 py-4">Periode</th>
                <th className="px-6 py-4">Dana Default</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {campaigns.map(c => (
                <tr key={c.campaign.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{c.campaign.code}</td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{c.campaign.name}</div>
                    {c.campaign.description && <div className="text-xs text-gray-500 line-clamp-1">{c.campaign.description}</div>}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {c.campaign.startDate ? new Date(c.campaign.startDate).toLocaleDateString('id-ID') : '-'} 
                    {' s/d '}
                    {c.campaign.endDate ? new Date(c.campaign.endDate).toLocaleDateString('id-ID') : '-'}
                  </td>
                  <td className="px-6 py-4">
                    {c.fund ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
                        {c.fund.name}
                      </span>
                    ) : (
                      <span className="text-gray-400 italic">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {campaigns.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    Tidak ada program/campaign ZISWAF.
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
