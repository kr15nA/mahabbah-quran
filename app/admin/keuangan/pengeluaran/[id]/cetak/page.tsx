export const dynamic = 'force-dynamic'
import { requirePermission } from '../../../../../../lib/auth/rbac'
import { db } from '../../../../../../lib/db/client'
import { financeDisbursements, financeCategories, financeFunds, financeAccounts, users } from '../../../../../../drizzle/schema'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
const formatRupiah = (val: string | bigint | number) => 'Rp' + parseInt(val.toString(), 10).toLocaleString('id-ID')

export default async function CetakVoucherPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission('finance.disbursement.view')
  const paramsObj = await params;
  const id = parseInt(paramsObj.id, 10)

  const [disbursement] = await db.select({
      id: financeDisbursements.id,
      disbursement_number: financeDisbursements.disbursementNumber,
      amount: financeDisbursements.amount,
      transaction_date: financeDisbursements.transactionDate,
      description: financeDisbursements.description,
      beneficiary_name: financeDisbursements.beneficiaryName,
      status: financeDisbursements.status,
      category_name: financeCategories.name,
      fund_name: financeFunds.name,
      payment_account_name: db.select({ name: financeAccounts.name }).from(financeAccounts).where(eq(financeAccounts.id, financeDisbursements.paymentAccountId)).as('payment_account_name'),
      requester_name: db.select({ name: users.fullName }).from(users).where(eq(users.id, financeDisbursements.requestedBy)).as('requester_name'),
      approver_name: db.select({ name: users.fullName }).from(users).where(eq(users.id, financeDisbursements.approvedBy)).as('approver_name'),
      payer_name: db.select({ name: users.fullName }).from(users).where(eq(users.id, financeDisbursements.paidBy)).as('payer_name'),
    })
    .from(financeDisbursements)
    .leftJoin(financeCategories, eq(financeDisbursements.categoryId, financeCategories.id))
    .leftJoin(financeFunds, eq(financeDisbursements.fundId, financeFunds.id))
    .where(eq(financeDisbursements.id, id))

  if (!disbursement || !['PAID', 'REVERSED'].includes(disbursement.status)) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8 flex justify-center print:bg-white print:p-0">
      <div className="bg-white w-full max-w-3xl shadow-lg print:shadow-none">
        <div className="p-10">
          <div className="flex justify-between items-start border-b-2 border-gray-900 pb-6 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Voucher Pengeluaran</h1>
              <p className="text-gray-600 mt-1">Lembaga Pendidikan Mahabbah Qur&apos;an</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-500">No. Referensi</p>
              <p className="text-xl font-bold text-gray-900">{disbursement.disbursement_number}</p>
              {disbursement.status === 'REVERSED' && (
                <p className="text-sm font-bold text-red-600 mt-1 border border-red-600 inline-block px-2 py-0.5 rounded uppercase">Dibatalkan / Reversed</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8">
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Dibayarkan Kepada</p>
                <p className="font-semibold text-gray-900">{disbursement.beneficiary_name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Keterangan</p>
                <p className="font-medium text-gray-900">{disbursement.description}</p>
              </div>
            </div>
            
            <div className="space-y-4 text-right">
              <div>
                <p className="text-sm text-gray-500 mb-1">Tanggal Transaksi</p>
                <p className="font-medium text-gray-900">{new Date(disbursement.transaction_date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Sumber Dana / Kategori</p>
                <p className="font-medium text-gray-900">{disbursement.fund_name} / {disbursement.category_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Akun Pembayaran</p>
                <p className="font-medium text-gray-900">{disbursement.payment_account_name || '-'}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 flex justify-between items-center mb-12">
            <span className="text-gray-600 font-semibold">Total Jumlah</span>
            <span className="text-3xl font-bold text-gray-900">{formatRupiah(disbursement.amount)}</span>
          </div>

          <div className="grid grid-cols-3 gap-8 pt-8">
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-16">Dibuat Oleh,</p>
              <p className="font-medium text-gray-900 border-b border-gray-300 pb-1">{disbursement.requester_name || '-'}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-16">Disetujui Oleh,</p>
              <p className="font-medium text-gray-900 border-b border-gray-300 pb-1">{disbursement.approver_name || '-'}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-16">Dibayar Oleh,</p>
              <p className="font-medium text-gray-900 border-b border-gray-300 pb-1">{disbursement.payer_name || '-'}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 p-6 text-center text-sm text-gray-500 print:hidden border-t border-gray-200">
          <button onClick={() => window.print()} className="px-6 py-2 bg-[#18085A] text-white font-medium rounded-lg hover:bg-[#18085A]/90 transition-colors">
            Cetak Dokumen
          </button>
        </div>
      </div>
    </div>
  )
}
