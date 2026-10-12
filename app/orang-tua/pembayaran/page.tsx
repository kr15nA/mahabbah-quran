import { Receipt, CheckCircle2, AlertCircle, CreditCard, ChevronRight, User, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { getSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { resolveParentFinanceContext, studentIdToDbNumber } from '@/lib/guardians/parent-context'
import { getStudentPayments } from '@/lib/finance/queries/parent-finance'
import ChildSwitcher from '@/components/orang-tua/ChildSwitcher'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import TopBar from '@/components/layout/TopBar'

function formatCurrency(amount: string | number) {
  const num = typeof amount === 'string' ? Number(amount) : amount
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num)
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'PENDING':
      return <Badge variant="warning">Sedang Diproses</Badge>
    case 'CONFIRMED':
      return <Badge variant="success">Berhasil</Badge>
    case 'REFUNDED':
      return <Badge variant="neutral">Dikembalikan</Badge>
    case 'CANCELLED':
      return <Badge variant="danger">Gagal/Dibatalkan</Badge>
    default:
      return <Badge variant="neutral">{status}</Badge>
  }
}

export default async function ParentPembayaranPage({
  searchParams,
}: {
  searchParams: Promise<{ child_id?: string }>
}) {
  const session = await getSession()
  if (!session || session.role !== 'orang_tua') {
    redirect('/login')
  }

  const resolvedParams = await searchParams
  const context = await resolveParentFinanceContext({
    userId: session.userId,
    requestedChildId: resolvedParams.child_id,
  })

  if (context.status === 'NO_CHILDREN') {
    return (
      <div className="pb-24">
        <TopBar title="Riwayat Pembayaran" showBack />
        <div className="p-4 space-y-4 max-w-4xl mx-auto">
          <Card className="p-8 flex flex-col items-center justify-center text-center">
            <User className="w-12 h-12 text-gray-300 mb-3" />
            <h3 className="text-gray-900 font-bold mb-1">Akses Keuangan Belum Tersedia</h3>
            <p className="text-gray-500 text-sm max-w-md">
              Akun Anda belum dihubungkan dengan data santri atau belum diberikan hak akses keuangan (can_view_finance).
            </p>
          </Card>
        </div>
      </div>
    )
  }

  if (context.status === 'INVALID_CHILD') {
    return (
      <div className="pb-24">
        <TopBar title="Riwayat Pembayaran" showBack />
        <div className="p-4 space-y-4 max-w-4xl mx-auto">
          <Card className="p-8 flex flex-col items-center justify-center text-center border-red-200 bg-red-50">
            <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
            <h3 className="text-red-900 font-bold mb-1">Identitas Santri Tidak Valid</h3>
            <p className="text-red-700 text-sm max-w-md">Format ID santri yang diminta tidak valid.</p>
          </Card>
        </div>
      </div>
    )
  }

  if (context.status === 'FORBIDDEN_CHILD') {
    return (
      <div className="pb-24">
        <TopBar title="Riwayat Pembayaran" showBack />
        <div className="p-4 space-y-4 max-w-4xl mx-auto">
          <Card className="p-8 flex flex-col items-center justify-center text-center border-red-200 bg-red-50">
            <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
            <h3 className="text-red-900 font-bold mb-1">Santri Tidak Ditemukan</h3>
            <p className="text-red-700 text-sm max-w-md mb-4">
              Anda tidak memiliki hak akses finansial untuk santri yang dipilih.
            </p>
            {context.children.length > 0 && (
              <ChildSwitcher childrenData={context.children} activeChildId="" />
            )}
          </Card>
        </div>
      </div>
    )
  }

  if (context.status === 'CHILD_REQUIRED') {
    return (
      <div className="pb-24">
        <TopBar title="Riwayat Pembayaran" showBack />
        <div className="p-4 space-y-4 max-w-4xl mx-auto">
          <Card className="p-8 flex flex-col items-center justify-center text-center">
            <User className="w-12 h-12 text-gray-300 mb-3" />
            <h3 className="text-gray-900 font-bold mb-1">Pilih Santri</h3>
            <p className="text-gray-500 text-sm max-w-md mb-4">Silakan pilih santri untuk melihat riwayat pembayaran.</p>
            <ChildSwitcher childrenData={context.children} activeChildId="" />
          </Card>
        </div>
      </div>
    )
  }

  const activeChild = context.child
  const allChildren = context.children
  const childIdNum = studentIdToDbNumber(activeChild.student_id)

  const payments = await getStudentPayments(childIdNum)
  const totalPaid = payments
    .filter(p => p.status === 'CONFIRMED')
    .reduce((sum, p) => sum + Number(p.amount), 0)

  return (
    <div className="pb-24">
      <TopBar title="Riwayat Pembayaran" showBack />

      <div className="p-4 space-y-5 max-w-4xl mx-auto">
        {/* Child Selector */}
        {allChildren.length > 1 && (
          <div className="space-y-1">
            <div className="text-xs font-semibold text-gray-500 px-1">Pilih Santri</div>
            <ChildSwitcher childrenData={allChildren} activeChildId={activeChild.student_id} />
          </div>
        )}

        {/* Selected Child Identity Banner */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-full bg-[#18085A] text-[#FBBF24] font-bold text-base flex items-center justify-center shrink-0">
              {activeChild.student_name.charAt(0)}
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-gray-900 text-base truncate">{activeChild.student_name}</h2>
              <p className="text-xs text-gray-500">{activeChild.class_name || 'Santri Mahabbah'}</p>
            </div>
          </div>
          <Link
            href={`/orang-tua/tagihan?child_id=${activeChild.student_id}`}
            className="flex items-center gap-1 text-xs font-semibold text-[#18085A] hover:underline shrink-0 bg-indigo-50 px-3 py-1.5 rounded-lg"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Lihat Tagihan</span>
          </Link>
        </div>

        {/* Total Confirmed Payments Card */}
        <div className="bg-gradient-to-br from-[#18085A] to-[#2E1065] text-white p-5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-1.5 text-xs text-indigo-200 mb-1">
            <ShieldCheck className="w-4 h-4 text-green-400" />
            <span>Total Pembayaran Berhasil</span>
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight">
            {formatCurrency(totalPaid)}
          </div>
          <div className="text-xs text-indigo-300 mt-1">
            {payments.filter(p => p.status === 'CONFIRMED').length} transaksi terkonfirmasi
          </div>
        </div>

        {/* Payment History List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-bold text-gray-900 text-sm">Transaksi Pembayaran ({payments.length})</h3>
          </div>

          {payments.length === 0 ? (
            <Card className="p-8 flex flex-col items-center justify-center text-center">
              <Receipt className="w-12 h-12 text-gray-300 mb-3" />
              <div className="text-gray-900 font-medium mb-1">Belum Ada Transaksi</div>
              <div className="text-gray-500 text-sm">Belum ada riwayat pembayaran untuk {activeChild.student_name}.</div>
            </Card>
          ) : (
            payments.map((p) => (
              <Link key={p.id} href={`/orang-tua/pembayaran/${p.id}`}>
                <Card className="p-4 hover:border-[#18085A]/30 transition-all active:bg-gray-50 cursor-pointer mb-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="text-xs text-gray-400 font-mono mb-0.5">{p.paymentNumber}</div>
                      <div className="text-sm font-semibold text-gray-800">
                        {new Date(p.paymentDate).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </div>
                    </div>
                    {getStatusBadge(p.status)}
                  </div>

                  {/* Allocations summary */}
                  {p.allocations && p.allocations.length > 0 && (
                    <div className="my-2 p-2.5 bg-gray-50 rounded-xl space-y-1.5 border border-gray-100">
                      {p.allocations.map((alloc) => (
                        <div key={alloc.id} className="flex justify-between items-center text-xs">
                          <span className="text-gray-600 font-medium">
                            {alloc.feeTypeName} {alloc.period ? `(${alloc.period})` : ''}
                          </span>
                          <span className="font-mono text-gray-900 font-semibold">
                            {formatCurrency(alloc.allocatedAmount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between items-end border-t border-gray-100 pt-3 text-xs mt-2">
                    <div className="text-gray-500">
                      <span>Metode:</span>
                      <span className="ml-1.5 font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                        {p.paymentMethod}
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Total Bayar</div>
                      <div className="font-mono font-bold text-base text-[#18085A]">
                        {formatCurrency(p.amount)}
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
