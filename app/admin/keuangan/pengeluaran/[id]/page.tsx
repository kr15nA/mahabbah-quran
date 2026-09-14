export const dynamic = 'force-dynamic'
import { requirePermission, hasPermission } from '../../../../../lib/auth/rbac'
import { db } from '../../../../../lib/db/client'
import { financeDisbursements, financeCategories, financeFunds, financeAccounts, users } from '../../../../../drizzle/schema'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import DisbursementActions from './DisbursementActions'
const formatRupiah = (val: string | bigint | number) => 'Rp' + parseInt(val.toString(), 10).toLocaleString('id-ID')

export default async function DisbursementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { session } = await requirePermission('finance.disbursement.view')
  const paramsObj = await params;
  const id = parseInt(paramsObj.id, 10)

  // Use aliases for the users table joins
  const requester = {
    id: users.id,
    fullName: users.fullName
  }
  const approver = {
    id: users.id,
    fullName: users.fullName
  }
  const payer = {
    id: users.id,
    fullName: users.fullName
  }

  const [disbursement] = await db.select({
      id: financeDisbursements.id,
      disbursement_number: financeDisbursements.disbursementNumber,
      amount: financeDisbursements.amount,
      transaction_date: financeDisbursements.transactionDate,
      description: financeDisbursements.description,
      beneficiary_name: financeDisbursements.beneficiaryName,
      status: financeDisbursements.status,
      category_name: financeCategories.name,
      expense_account_name: db.select({ name: financeAccounts.name }).from(financeAccounts).where(eq(financeAccounts.id, financeCategories.defaultAccountId)).as('expense_account_name'),
      fund_name: financeFunds.name,
      payment_account_name: db.select({ name: financeAccounts.name }).from(financeAccounts).where(eq(financeAccounts.id, financeDisbursements.paymentAccountId)).as('payment_account_name'),
      requester_name: db.select({ name: users.fullName }).from(users).where(eq(users.id, financeDisbursements.requestedBy)).as('requester_name'),
      requester_id: financeDisbursements.requestedBy,
      approver_name: db.select({ name: users.fullName }).from(users).where(eq(users.id, financeDisbursements.approvedBy)).as('approver_name'),
      payer_name: db.select({ name: users.fullName }).from(users).where(eq(users.id, financeDisbursements.paidBy)).as('payer_name'),
      approved_at: financeDisbursements.approvedAt,
      paid_at: financeDisbursements.paidAt,
      created_at: financeDisbursements.createdAt
    })
    .from(financeDisbursements)
    .leftJoin(financeCategories, eq(financeDisbursements.categoryId, financeCategories.id))
    .leftJoin(financeFunds, eq(financeDisbursements.fundId, financeFunds.id))
    .where(eq(financeDisbursements.id, id))

  if (!disbursement) notFound()

  const assetAccounts = await db.select({ id: financeAccounts.id, name: financeAccounts.name })
    .from(financeAccounts)
    .where(eq(financeAccounts.accountType, 'ASSET'))

  const canManage = await hasPermission(session, 'finance.disbursement.manage')
  const canApprove = await hasPermission(session, 'finance.disbursement.approve')
  const canPay = await hasPermission(session, 'finance.disbursement.pay')
  const canReverse = await hasPermission(session, 'finance.disbursement.reverse')

  const statusColors = {
    'DRAFT': 'bg-gray-100 text-gray-700',
    'PENDING_APPROVAL': 'bg-yellow-50 text-yellow-700',
    'APPROVED': 'bg-blue-50 text-blue-700',
    'PAID': 'bg-green-50 text-green-700',
    'CANCELLED': 'bg-red-50 text-red-700',
    'REVERSED': 'bg-gray-100 text-gray-600'
  } as Record<string, string>

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900">{disbursement.disbursement_number}</h2>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${statusColors[disbursement.status]}`}>
              {disbursement.status}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Dibuat pada {new Date(disbursement.created_at).toLocaleString('id-ID')}
          </p>
        </div>

        <DisbursementActions 
          id={id}
          status={disbursement.status}
          requesterId={disbursement.requester_id || 0}
          currentUserId={session.userId}
          canManage={canManage}
          canApprove={canApprove}
          canPay={canPay}
          canReverse={canReverse}
          assetAccounts={assetAccounts}
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Penerima (Beneficiary)</h3>
                <p className="text-base text-gray-900 font-medium">{disbursement.beneficiary_name || '-'}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Tanggal Transaksi</h3>
                <p className="text-base text-gray-900 font-medium">{new Date(disbursement.transaction_date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Keterangan</h3>
                <p className="text-base text-gray-900">{disbursement.description}</p>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <h3 className="text-sm font-medium text-gray-500 mb-1">Kategori Pengeluaran</h3>
                <p className="text-base text-gray-900 font-medium">{disbursement.category_name}</p>
                <p className="text-xs text-gray-500 mt-0.5">Akun Beban: {disbursement.expense_account_name || '-'}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Sumber Dana (Fund)</h3>
                <p className="text-base text-gray-900 font-medium">{disbursement.fund_name}</p>
              </div>
            </div>

            <div className="space-y-6 md:border-l md:border-gray-100 md:pl-8">
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Total Pengeluaran</h3>
                <p className="text-3xl font-bold text-gray-900">{formatRupiah(disbursement.amount)}</p>
              </div>

              {disbursement.payment_account_name && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">Akun Pembayaran (Asset)</h3>
                  <p className="text-base text-gray-900 font-medium">{disbursement.payment_account_name}</p>
                </div>
              )}

              <div className="pt-4 border-t border-gray-100 space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Pembuat:</span>
                  <span className="font-medium text-gray-900">{disbursement.requester_name || '-'}</span>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Disetujui Oleh:</span>
                  <div className="text-right">
                    <span className="block font-medium text-gray-900">{disbursement.approver_name || '-'}</span>
                    {disbursement.approved_at && (
                      <span className="block text-xs text-gray-500">{new Date(disbursement.approved_at).toLocaleString('id-ID')}</span>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Dibayar Oleh:</span>
                  <div className="text-right">
                    <span className="block font-medium text-gray-900">{disbursement.payer_name || '-'}</span>
                    {disbursement.paid_at && (
                      <span className="block text-xs text-gray-500">{new Date(disbursement.paid_at).toLocaleString('id-ID')}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
