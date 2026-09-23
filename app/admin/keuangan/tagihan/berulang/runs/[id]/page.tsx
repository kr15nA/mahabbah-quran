import { requirePermission } from '@/lib/auth/rbac'
import { getBillingRunDetails } from '@/lib/finance/queries/recurring-billing'
import { db } from '@/lib/db/client'
import { financeBillingRuns, financeFeeTypes, academicYears } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, AlertTriangle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import Pagination from '@/components/ui/Pagination'
import { mapRecurringError } from '@/lib/finance/recurring-generator-ui-errors'

export const dynamic = 'force-dynamic'

export default async function RunDetailPage(props: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ page?: string, search?: string, status?: string }>
}) {
  await requirePermission('finance.billing.view')

  const params = await props.params
  const searchParams = await props.searchParams
  const runId = parseInt(params.id, 10)
  const page = parseInt(searchParams.page || '1', 10)

  const [run] = await db.select({
    id: financeBillingRuns.id,
    period: financeBillingRuns.period,
    status: financeBillingRuns.status,
    academicYear: academicYears.name,
    feeTypeName: financeFeeTypes.name
  })
    .from(financeBillingRuns)
    .innerJoin(academicYears, eq(academicYears.id, financeBillingRuns.academicYearId))
    .innerJoin(financeFeeTypes, eq(financeFeeTypes.id, financeBillingRuns.feeTypeId))
    .where(eq(financeBillingRuns.id, runId))

  if (!run) {
    return <div className="p-8 text-center text-gray-500">Proses generate tidak ditemukan.</div>
  }

  const data = await getBillingRunDetails(runId, {
    page,
    limit: 20,
    search: searchParams.search,
    status: searchParams.status
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/keuangan/tagihan/berulang?tab=history">
          <div className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer text-gray-500">
            <ArrowLeft className="w-5 h-5" />
          </div>
        </Link>
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
            Detail Run #{run.id}
            <Badge variant="neutral">{run.status}</Badge>
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {run.feeTypeName} — {run.academicYear} — {run.period}
          </p>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 font-medium">Santri</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Keterangan / Invoice</th>
                <th className="px-6 py-4 font-medium text-right">Diperbarui</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">Belum ada item yang diproses dalam run ini.</td>
                </tr>
              ) : (
                data.items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-medium text-[#18085A]">{item.studentName}</td>
                    <td className="px-6 py-4">
                      {item.status === 'PENDING' && <Badge variant="warning">Menunggu</Badge>}
                      {item.status === 'GENERATED' && <Badge variant="success">Dibuat</Badge>}
                      {item.status === 'SKIPPED_EXISTING' && <Badge variant="primary">Sudah Ada</Badge>}
                      {item.status === 'FAILED' && <Badge variant="danger">Gagal</Badge>}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {item.invoiceId ? (
                        <Link 
                          href={`/admin/keuangan/tagihan/${item.invoiceId}`}
                          className="flex items-center gap-1 text-blue-600 hover:underline"
                        >
                          {item.invoiceNumber || `INV-${item.invoiceId}`}
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      ) : (
                        <div className="flex items-start gap-1">
                          {item.errorMessage && <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />}
                          <span className={item.status === 'FAILED' ? 'text-red-600' : ''}>
                            {item.errorMessage ? mapRecurringError(item.errorMessage) : '-'}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-500 text-xs">
                      {item.updatedAt ? new Date(item.updatedAt).toLocaleString('id-ID') : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination 
          currentPage={data.page} 
          totalPages={data.totalPages} 
          totalItems={data.total} 
          limit={20} 
        />
      </Card>
    </div>
  )
}
