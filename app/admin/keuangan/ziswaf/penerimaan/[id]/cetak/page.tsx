import { requireAuth, hasPermission } from '@/lib/auth/rbac'
import { db } from '@/lib/db/client'
import { ziswafReceipts, ziswafReceiptAllocations, financeParties, financeCategories, financeCampaigns, financeFunds } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { formatRupiah } from '@/lib/finance/utils'

export const dynamic = 'force-dynamic'

export default async function CetakKuitansiZiswafPage(props: { params: Promise<{ id: string }> }) {
  const { session } = await requireAuth()
  const canView = await hasPermission(session, 'finance.ziswaf.view')
  if (!canView) redirect('/admin')
  
  const { id } = await props.params
  const receiptId = parseInt(id, 10)

  const [data] = await db.select({
    receipt: ziswafReceipts,
    party: financeParties,
    category: financeCategories,
    campaign: financeCampaigns
  })
  .from(ziswafReceipts)
  .leftJoin(financeParties, eq(ziswafReceipts.partyId, financeParties.id))
  .leftJoin(financeCategories, eq(ziswafReceipts.categoryId, financeCategories.id))
  .leftJoin(financeCampaigns, eq(ziswafReceipts.campaignId, financeCampaigns.id))
  .where(eq(ziswafReceipts.id, receiptId))

  if (!data || data.receipt.status !== 'CONFIRMED') {
    return <div className="p-8 text-center">Kuitansi tidak tersedia atau belum dikonfirmasi.</div>
  }

  const { receipt, party, category, campaign } = data

  const allocationsData = await db.select({
    alloc: ziswafReceiptAllocations,
    fund: financeFunds
  })
  .from(ziswafReceiptAllocations)
  .leftJoin(financeFunds, eq(ziswafReceiptAllocations.fundId, financeFunds.id))
  .where(eq(ziswafReceiptAllocations.receiptId, receiptId))

  return (
    <div className="max-w-3xl mx-auto p-8 bg-white text-gray-900 print:p-0">
      <div className="mb-4 print:hidden">
        <button 
          onClick={() => {
            // @ts-ignore
            if (typeof window !== 'undefined') window.print()
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded shadow text-sm"
        >
          Cetak Dokumen
        </button>
      </div>

      <div className="border-2 border-gray-900 p-8">
        <div className="flex justify-between items-start border-b-2 border-gray-900 pb-6 mb-6">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-wider">KUITANSI ZISWAF</h1>
            <p className="text-sm text-gray-600 mt-1">Mahabbah Qur'an</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-500">No. Penerimaan</p>
            <p className="text-xl font-bold">{receipt.receiptNumber}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <p className="text-sm text-gray-500 mb-1">Telah Diterima Dari:</p>
            <p className="font-semibold text-lg">{party ? party.name : 'Hamba Allah'}</p>
            {party?.phone && <p className="text-sm">{party.phone}</p>}
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500 mb-1">Tanggal</p>
            <p className="font-semibold">{new Date(receipt.receivedDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>

        <div className="mb-8">
          <p className="text-sm text-gray-500 mb-1">Keterangan / Kategori ZISWAF:</p>
          <p className="font-medium text-lg">
            {category?.name} {category?.ziswafType ? `(${category.ziswafType})` : ''}
            {campaign ? ` - Program: ${campaign.name}` : ''}
          </p>
        </div>

        <div className="mb-8 border-t border-gray-200 pt-6">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-300 text-gray-600">
                <th className="py-2 font-medium">Alokasi Dana</th>
                <th className="py-2 font-medium text-right">Jumlah (Rp)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {allocationsData.map((ad, idx) => (
                <tr key={idx}>
                  <td className="py-3">{ad.fund?.name}</td>
                  <td className="py-3 text-right font-medium">{formatRupiah(ad.alloc.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-900">
                <th className="py-4 font-bold text-lg">TOTAL DITERIMA</th>
                <th className="py-4 font-bold text-xl text-right">{formatRupiah(receipt.amount)}</th>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex justify-between items-end mt-12">
          <div>
            <p className="text-sm text-gray-500 italic">Metode: {receipt.paymentMethod}</p>
            {receipt.referenceNumber && <p className="text-sm text-gray-500 italic">Ref: {receipt.referenceNumber}</p>}
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-16">Penerima,</p>
            <p className="font-medium border-t border-gray-400 pt-1 px-8">Mahabbah Qur'an</p>
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-gray-500 italic border-t border-gray-100 pt-4">
          Semoga Allah memberikan pahala atas apa yang engkau berikan, dan menjadikannya pembersih bagimu, serta memberkahi hartamu yang tersisa.
        </div>
      </div>
    </div>
  )
}
