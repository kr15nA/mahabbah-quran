import { requireAuth, hasPermission } from '@/lib/auth/rbac'
import { db } from '@/lib/db/client'
import { ziswafReceipts, ziswafReceiptAllocations, financeParties, financeCategories, financeCampaigns, financeFunds, financeAccounts } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatRupiah } from '@/lib/finance/utils'
import ZiswafDetailActions from './ZiswafDetailActions'

export const dynamic = 'force-dynamic'

export default async function PenerimaanDetailPage(props: { params: Promise<{ id: string }> }) {
  const { session } = await requireAuth()
  const canView = await hasPermission(session, 'finance.ziswaf.view')
  if (!canView) redirect('/admin/keuangan/ziswaf/penerimaan')
  
  const { id } = await props.params
  const receiptId = parseInt(id, 10)

  const [data] = await db.select({
    receipt: ziswafReceipts,
    party: financeParties,
    category: financeCategories,
    campaign: financeCampaigns,
    account: financeAccounts
  })
  .from(ziswafReceipts)
  .leftJoin(financeParties, eq(ziswafReceipts.partyId, financeParties.id))
  .leftJoin(financeCategories, eq(ziswafReceipts.categoryId, financeCategories.id))
  .leftJoin(financeCampaigns, eq(ziswafReceipts.campaignId, financeCampaigns.id))
  .leftJoin(financeAccounts, eq(ziswafReceipts.destinationAccountId, financeAccounts.id))
  .where(eq(ziswafReceipts.id, receiptId))

  if (!data) {
    return (
      <div className="p-8 text-center text-gray-500">
        Penerimaan tidak ditemukan.
      </div>
    )
  }

  const { receipt, party, category, campaign, account } = data

  const allocationsData = await db.select({
    alloc: ziswafReceiptAllocations,
    fund: financeFunds
  })
  .from(ziswafReceiptAllocations)
  .leftJoin(financeFunds, eq(ziswafReceiptAllocations.fundId, financeFunds.id))
  .where(eq(ziswafReceiptAllocations.receiptId, receiptId))

  const statusColors: Record<string, 'neutral' | 'success' | 'warning' | 'danger' | 'primary'> = {
    DRAFT: 'warning',
    CONFIRMED: 'success',
    CANCELLED: 'neutral',
    REFUNDED: 'danger'
  }

  const canManage = await hasPermission(session, 'finance.ziswaf.manage')
  const canRefund = await hasPermission(session, 'finance.ziswaf.refund')

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link href="/admin/keuangan/ziswaf/penerimaan" className="text-sm text-blue-600 hover:underline mb-2 inline-block">
            &larr; Kembali ke Daftar Penerimaan
          </Link>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            {receipt.receiptNumber}
            <Badge variant={statusColors[receipt.status] || 'neutral'}>{receipt.status}</Badge>
          </h2>
          <p className="text-sm text-gray-500 mt-1">Detail penerimaan ZISWAF</p>
        </div>
        
        <div className="flex items-center gap-2">
          {receipt.status === 'CONFIRMED' && (
            <Link 
              href={`/admin/keuangan/ziswaf/penerimaan/${receipt.id}/cetak`}
              target="_blank"
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              Cetak Kuitansi
            </Link>
          )}
          <ZiswafDetailActions 
            receiptId={receipt.id} 
            status={receipt.status} 
            canManage={canManage} 
            canRefund={canRefund} 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="p-6">
            <h3 className="font-semibold text-lg border-b pb-2 mb-4">Informasi Transaksi</h3>
            <div className="grid grid-cols-2 gap-y-4 gap-x-8">
              <div>
                <p className="text-sm text-gray-500">Tanggal Terima</p>
                <p className="font-medium">{new Date(receipt.receivedDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Jumlah (Rp)</p>
                <p className="font-medium text-lg text-[#18085A]">{formatRupiah(receipt.amount)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Kategori ZISWAF</p>
                <p className="font-medium">{category?.name} {category?.ziswafType ? `(${category.ziswafType})` : ''}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Program / Campaign</p>
                <p className="font-medium">{campaign?.name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Metode Pembayaran</p>
                <p className="font-medium">{receipt.paymentMethod}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Akun Kas/Bank Tujuan</p>
                <p className="font-medium">{account?.name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Nomor Referensi</p>
                <p className="font-medium">{receipt.referenceNumber || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Catatan</p>
                <p className="font-medium">{receipt.notes || '-'}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-lg border-b pb-2 mb-4">Alokasi Dana</h3>
            {allocationsData.length === 0 ? (
              <p className="text-gray-500 text-sm">Belum ada alokasi dana.</p>
            ) : (
              <div className="space-y-3">
                {allocationsData.map((ad, idx) => (
                  <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                    <span className="font-medium text-gray-800">{ad.fund?.name || 'Unknown'}</span>
                    <span className="font-semibold text-gray-900">{formatRupiah(ad.alloc.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-3 mt-3 border-t-2 border-gray-100 font-bold">
                  <span>Total Alokasi</span>
                  <span className="text-[#18085A]">{formatRupiah(allocationsData.reduce((acc, a) => acc + a.alloc.amount, BigInt(0)))}</span>
                </div>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="font-semibold text-lg border-b pb-2 mb-4">Data Donatur</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Nama</p>
                <p className="font-semibold text-gray-900">{party ? party.name : 'Hamba Allah (Anonim)'}</p>
              </div>
              {party && (
                <>
                  <div>
                    <p className="text-sm text-gray-500">Tipe Donatur</p>
                    <p className="font-medium">{party.partyType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Kontak</p>
                    <p className="font-medium">{party.phone || '-'}</p>
                    <p className="text-sm text-gray-500">{party.email}</p>
                  </div>
                </>
              )}
            </div>
          </Card>

          <Card className="p-6 bg-gray-50">
            <h3 className="font-semibold text-gray-900 mb-2">Riwayat Sistem</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Dibuat Pada</span>
                <span className="font-medium">{receipt.createdAt.toLocaleDateString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Terakhir Diupdate</span>
                <span className="font-medium">{receipt.updatedAt.toLocaleDateString('id-ID')}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
