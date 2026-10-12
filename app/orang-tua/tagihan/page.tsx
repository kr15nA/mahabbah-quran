import { Receipt, CheckCircle2, AlertCircle, Clock, CreditCard, ChevronRight, User, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { getSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { resolveParentFinanceContext, studentIdToDbNumber } from '@/lib/guardians/parent-context'
import { getStudentInvoices } from '@/lib/finance/queries/parent-finance'
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
    case 'ISSUED':
      return <Badge variant="warning">Belum Lunas</Badge>
    case 'PARTIALLY_PAID':
      return <Badge variant="primary">Sebagian</Badge>
    case 'PAID':
      return <Badge variant="success">Lunas</Badge>
    case 'CANCELLED':
      return <Badge variant="danger">Dibatalkan</Badge>
    default:
      return <Badge variant="neutral">{status}</Badge>
  }
}

export default async function ParentTagihanPage({
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
        <TopBar title="Tagihan Biaya" showBack />
        <div className="p-4 space-y-4 max-w-4xl mx-auto">
          <Card className="p-8 flex flex-col items-center justify-center text-center">
            <User className="w-12 h-12 text-gray-300 mb-3" />
            <h3 className="text-gray-900 font-bold mb-1">Akses Keuangan Belum Tersedia</h3>
            <p className="text-gray-500 text-sm max-w-md">
              Akun Anda belum dihubungkan dengan data santri atau belum diberikan hak akses keuangan (can_view_finance). Hubungi pihak administrasi sekolah untuk aktivasi.
            </p>
          </Card>
        </div>
      </div>
    )
  }

  if (context.status === 'INVALID_CHILD') {
    return (
      <div className="pb-24">
        <TopBar title="Tagihan Biaya" showBack />
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
        <TopBar title="Tagihan Biaya" showBack />
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
        <TopBar title="Tagihan Biaya" showBack />
        <div className="p-4 space-y-4 max-w-4xl mx-auto">
          <Card className="p-8 flex flex-col items-center justify-center text-center">
            <User className="w-12 h-12 text-gray-300 mb-3" />
            <h3 className="text-gray-900 font-bold mb-1">Pilih Santri</h3>
            <p className="text-gray-500 text-sm max-w-md mb-4">Silakan pilih santri untuk melihat rincian tagihan biaya.</p>
            <ChildSwitcher childrenData={context.children} activeChildId="" />
          </Card>
        </div>
      </div>
    )
  }

  const activeChild = context.child
  const allChildren = context.children
  const childIdNum = studentIdToDbNumber(activeChild.student_id)

  const invoices = await getStudentInvoices(childIdNum)

  // Calculations
  const unpaidInvoices = invoices.filter(i => i.status === 'ISSUED' || i.status === 'PARTIALLY_PAID')
  const totalOutstanding = unpaidInvoices.reduce((sum, inv) => sum + Number(inv.outstandingAmount), 0)
  const paidInvoicesCount = invoices.filter(i => i.status === 'PAID').length

  return (
    <div className="pb-24">
      <TopBar title="Tagihan Biaya" showBack />

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
            href={`/orang-tua/pembayaran?child_id=${activeChild.student_id}`}
            className="flex items-center gap-1 text-xs font-semibold text-[#18085A] hover:underline shrink-0 bg-indigo-50 px-3 py-1.5 rounded-lg"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Riwayat Bayar</span>
          </Link>
        </div>

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-[#18085A] to-[#2E1065] text-white p-4 rounded-2xl shadow-sm">
            <div className="flex items-center gap-1.5 text-xs text-indigo-200 mb-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Total Belum Lunas</span>
            </div>
            <div className="text-xl font-bold font-mono tracking-tight">
              {formatCurrency(totalOutstanding)}
            </div>
            <div className="text-[11px] text-indigo-300 mt-1">
              {unpaidInvoices.length} tagihan aktif
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-xs text-green-700">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
              <span>Tagihan Lunas</span>
            </div>
            <div className="text-xl font-bold font-mono text-gray-900 mt-1">
              {paidInvoicesCount}
            </div>
            <div className="text-[11px] text-gray-500">
              Selesai diverifikasi
            </div>
          </div>
        </div>

        {/* Invoice List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-bold text-gray-900 text-sm">Daftar Tagihan ({invoices.length})</h3>
          </div>

          {invoices.length === 0 ? (
            <Card className="p-8 flex flex-col items-center justify-center text-center">
              <Receipt className="w-12 h-12 text-gray-300 mb-3" />
              <div className="text-gray-900 font-medium mb-1">Belum Ada Tagihan</div>
              <div className="text-gray-500 text-sm">Saat ini tidak ada tagihan biaya untuk {activeChild.student_name}.</div>
            </Card>
          ) : (
            invoices.map((inv) => {
              const isUnpaid = inv.status === 'ISSUED' || inv.status === 'PARTIALLY_PAID'
              const hasScholarship = Number(inv.scholarshipAmount) > 0

              return (
                <Link key={inv.id} href={`/orang-tua/tagihan/${inv.id}`}>
                  <Card className="p-4 hover:border-[#18085A]/30 transition-all active:bg-gray-50 cursor-pointer mb-3">
                    <div className="flex justify-between items-start mb-2.5">
                      <div>
                        <div className="text-xs text-gray-400 font-mono mb-0.5">{inv.invoiceNumber}</div>
                        <div className="font-bold text-gray-900 text-base">{inv.feeTypeName}</div>
                        {inv.period && (
                          <div className="text-xs text-indigo-700 font-medium mt-0.5">Periode: {inv.period}</div>
                        )}
                      </div>
                      {getStatusBadge(inv.status)}
                    </div>

                    {hasScholarship && (
                      <div className="mb-2.5 px-2.5 py-1 bg-amber-50 border border-amber-200/60 rounded-lg flex items-center gap-1.5 text-xs text-amber-900">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Potongan Beasiswa: {formatCurrency(inv.scholarshipAmount)}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-end border-t border-gray-100 pt-3 text-xs">
                      <div className="text-gray-500">
                        <span>Jatuh Tempo:</span>
                        <div className="font-medium text-gray-800">
                          {new Date(inv.dueDate).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                          {isUnpaid ? 'Sisa Tagihan' : 'Total Tagihan'}
                        </div>
                        <div className="font-mono font-bold text-base text-[#18085A]">
                          {formatCurrency(isUnpaid ? inv.outstandingAmount : inv.netPayable)}
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
