export const dynamic = 'force-dynamic'
import { requirePermission } from '../../../../lib/auth/rbac'
import { db } from '../../../../lib/db/client'
import { financeDisbursements, financeCategories, financeFunds, users } from '../../../../drizzle/schema'
import { desc, eq } from 'drizzle-orm'
import Link from 'next/link'
import { Plus, ArrowRight } from 'lucide-react'
const formatRupiah = (val: string | bigint | number) => 'Rp' + parseInt(val.toString(), 10).toLocaleString('id-ID')

export default async function PengeluaranList() {
  await requirePermission('finance.disbursement.view')

  const records = await db.select({
    id: financeDisbursements.id,
    disbursementNumber: financeDisbursements.disbursementNumber,
    amount: financeDisbursements.amount,
    transactionDate: financeDisbursements.transactionDate,
    description: financeDisbursements.description,
    beneficiaryName: financeDisbursements.beneficiaryName,
    status: financeDisbursements.status,
    categoryName: financeCategories.name,
    fundName: financeFunds.name,
    requesterName: users.fullName,
  })
  .from(financeDisbursements)
  .leftJoin(financeCategories, eq(financeDisbursements.categoryId, financeCategories.id))
  .leftJoin(financeFunds, eq(financeDisbursements.fundId, financeFunds.id))
  .leftJoin(users, eq(financeDisbursements.requestedBy, users.id))
  .orderBy(desc(financeDisbursements.createdAt))
  .limit(50)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Daftar Pengeluaran</h2>
        <Link 
          href="/admin/keuangan/pengeluaran/baru" 
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#18085A] text-white text-sm font-medium rounded-lg hover:bg-[#18085A]/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Pengajuan Baru
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
              <tr>
                <th className="px-4 py-3">No. Ref / Tanggal</th>
                <th className="px-4 py-3">Penerima & Keterangan</th>
                <th className="px-4 py-3">Kategori & Dana</th>
                <th className="px-4 py-3 text-right">Jumlah</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Belum ada data pengeluaran.
                  </td>
                </tr>
              ) : records.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{r.disbursementNumber}</div>
                    <div className="text-gray-500">{new Date(r.transactionDate).toLocaleDateString('id-ID')}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{r.beneficiaryName || '-'}</div>
                    <div className="text-gray-500 text-xs line-clamp-1">{r.description}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-gray-900">{r.categoryName}</div>
                    <div className="text-gray-500 text-xs">{r.fundName}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {formatRupiah(typeof r.amount === 'bigint' ? r.amount.toString() : r.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      r.status === 'PAID' ? 'bg-green-50 text-green-700' :
                      r.status === 'APPROVED' ? 'bg-blue-50 text-blue-700' :
                      r.status === 'PENDING_APPROVAL' ? 'bg-yellow-50 text-yellow-700' :
                      r.status === 'CANCELLED' ? 'bg-red-50 text-red-700' :
                      r.status === 'REVERSED' ? 'bg-gray-100 text-gray-600' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link 
                      href={`/admin/keuangan/pengeluaran/${r.id}`}
                      className="inline-flex items-center gap-1 text-sm text-[#18085A] font-medium hover:underline"
                    >
                      Detail
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
