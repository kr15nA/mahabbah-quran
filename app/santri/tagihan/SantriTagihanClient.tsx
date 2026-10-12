'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Receipt, CheckCircle2, Clock, CreditCard, Sparkles, ShieldCheck } from 'lucide-react'
import type { ParentInvoiceListItem, ParentPaymentListItem } from '@/lib/finance/queries/parent-finance'

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
    case 'CONFIRMED':
      return <Badge variant="success">Berhasil</Badge>
    case 'PENDING':
      return <Badge variant="warning">Diproses</Badge>
    default:
      return <Badge variant="neutral">{status}</Badge>
  }
}

export default function SantriTagihanClient({
  studentName,
  invoices,
  payments,
}: {
  studentName: string
  invoices: ParentInvoiceListItem[]
  payments: ParentPaymentListItem[]
}) {
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments'>('invoices')

  const unpaidInvoices = invoices.filter(i => i.status === 'ISSUED' || i.status === 'PARTIALLY_PAID')
  const totalOutstanding = unpaidInvoices.reduce((sum, inv) => sum + Number(inv.outstandingAmount), 0)
  const paidCount = invoices.filter(i => i.status === 'PAID').length
  const totalPaymentsConfirmed = payments
    .filter(p => p.status === 'CONFIRMED')
    .reduce((sum, p) => sum + Number(p.amount), 0)

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 pb-24 md:pb-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Tagihan & Keuangan</h1>
        <p className="text-sm text-gray-500 mt-1">Transparansi status biaya dan riwayat pembayaran untuk {studentName}.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-amber-700 to-amber-900 text-white p-4 rounded-2xl shadow-sm">
          <div className="flex items-center gap-1.5 text-xs text-amber-200 mb-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Belum Lunas</span>
          </div>
          <div className="text-xl font-bold font-mono tracking-tight">
            {formatCurrency(totalOutstanding)}
          </div>
          <div className="text-[11px] text-amber-300 mt-1">
            {unpaidInvoices.length} tagihan aktif
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-xs text-green-700">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
            <span>Tagihan Lunas</span>
          </div>
          <div className="text-xl font-bold font-mono text-gray-900 mt-1">
            {paidCount}
          </div>
          <div className="text-[11px] text-gray-500">
            Telah diselesaikan
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-xs text-indigo-700">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>Total Terbayar</span>
          </div>
          <div className="text-xl font-bold font-mono text-gray-900 mt-1">
            {formatCurrency(totalPaymentsConfirmed)}
          </div>
          <div className="text-[11px] text-gray-500">
            {payments.filter(p => p.status === 'CONFIRMED').length} transaksi
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`pb-3 relative transition-colors ${
            activeTab === 'invoices' ? 'text-amber-900 border-b-2 border-amber-800' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          Tagihan Biaya ({invoices.length})
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`pb-3 relative transition-colors ${
            activeTab === 'payments' ? 'text-amber-900 border-b-2 border-amber-800' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          Riwayat Pembayaran ({payments.length})
        </button>
      </div>

      {/* Tab: Invoices */}
      {activeTab === 'invoices' && (
        <div className="space-y-3">
          {invoices.length === 0 ? (
            <Card className="p-8 flex flex-col items-center justify-center text-center">
              <Receipt className="w-12 h-12 text-gray-300 mb-3" />
              <div className="text-gray-900 font-medium mb-1">Belum Ada Tagihan</div>
              <div className="text-gray-500 text-sm">Tidak ada catatan tagihan biaya yang terdaftar untuk Anda.</div>
            </Card>
          ) : (
            invoices.map((inv) => {
              const isUnpaid = inv.status === 'ISSUED' || inv.status === 'PARTIALLY_PAID'
              const hasScholarship = Number(inv.scholarshipAmount) > 0

              return (
                <Card key={inv.id} className="p-4 shadow-sm border-gray-100 mb-3">
                  <div className="flex justify-between items-start mb-2.5">
                    <div>
                      <div className="text-xs text-gray-400 font-mono mb-0.5">{inv.invoiceNumber}</div>
                      <div className="font-bold text-gray-900 text-base">{inv.feeTypeName}</div>
                      {inv.period && (
                        <div className="text-xs text-amber-800 font-medium mt-0.5">Periode: {inv.period}</div>
                      )}
                    </div>
                    {getStatusBadge(inv.status)}
                  </div>

                  {/* Fee Components Breakdown */}
                  <div className="my-2.5 p-2.5 bg-gray-50 rounded-xl space-y-1.5 border border-gray-100 text-xs">
                    <div className="flex justify-between items-center text-gray-600">
                      <span>Biaya Pokok</span>
                      <span className="font-mono font-medium">{formatCurrency(inv.grossAmount)}</span>
                    </div>
                    {hasScholarship && (
                      <div className="flex justify-between items-center text-emerald-700">
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-emerald-600" />
                          Potongan Beasiswa
                        </span>
                        <span className="font-mono font-medium">-{formatCurrency(inv.scholarshipAmount)}</span>
                      </div>
                    )}
                    {Number(inv.paidAmount) > 0 && (
                      <div className="flex justify-between items-center text-indigo-700">
                        <span>Sudah Dibayar</span>
                        <span className="font-mono font-medium">-{formatCurrency(inv.paidAmount)}</span>
                      </div>
                    )}
                    {inv.description && (
                      <div className="text-[11px] text-gray-500 pt-1 border-t border-gray-200/60">
                        {inv.description}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs border-t border-gray-100 pt-3">
                    <div>
                      <span className="text-gray-400 block text-[11px]">Jatuh Tempo</span>
                      <span className="font-medium text-gray-700">
                        {new Date(inv.dueDate).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-gray-400 block text-[11px]">
                        {isUnpaid ? 'Sisa Tagihan' : 'Status'}
                      </span>
                      <span className="font-mono font-bold text-base text-amber-950">
                        {isUnpaid ? formatCurrency(inv.outstandingAmount) : 'Lunas'}
                      </span>
                    </div>
                  </div>
                </Card>
              )
            })
          )}
        </div>
      )}

      {/* Tab: Payments */}
      {activeTab === 'payments' && (
        <div className="space-y-3">
          {payments.length === 0 ? (
            <Card className="p-8 flex flex-col items-center justify-center text-center">
              <CreditCard className="w-12 h-12 text-gray-300 mb-3" />
              <div className="text-gray-900 font-medium mb-1">Belum Ada Transaksi</div>
              <div className="text-gray-500 text-sm">Belum ada catatan pembayaran yang tercatat di sistem.</div>
            </Card>
          ) : (
            payments.map((p) => (
              <Card key={p.id} className="p-4 shadow-sm border-gray-100 mb-3">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="text-xs text-gray-400 font-mono mb-0.5">{p.paymentNumber}</div>
                    <div className="text-sm font-semibold text-gray-900">
                      {new Date(p.paymentDate).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                  {getStatusBadge(p.status)}
                </div>

                {/* Allocations */}
                {p.allocations && p.allocations.length > 0 && (
                  <div className="my-2 p-2.5 bg-gray-50 rounded-xl space-y-1.5 border border-gray-100">
                    <div className="text-[11px] font-semibold text-gray-500">Alokasi Pembayaran:</div>
                    {p.allocations.map((alloc) => (
                      <div key={alloc.id} className="flex justify-between items-center text-xs">
                        <span className="text-gray-700 font-medium">
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
                    <div className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Jumlah Terbayar</div>
                    <div className="font-mono font-bold text-base text-amber-950">
                      {formatCurrency(p.amount)}
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}
