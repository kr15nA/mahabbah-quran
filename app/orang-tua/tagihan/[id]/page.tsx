'use client'

import { useState, useEffect, use } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Receipt, CheckCircle2, History, ChevronRight } from 'lucide-react'
import TopBar from '@/components/layout/TopBar'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ParentInvoiceDetail({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [invoice, setInvoice] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const resolvedParams = use(params)

  useEffect(() => {
    fetchInvoice()
  }, [])

  const fetchInvoice = async () => {
    try {
      const res = await fetch(`/api/orang-tua/tagihan/${resolvedParams.id}`)
      if (res.ok) {
        const data = await res.json()
        setInvoice(data)
      } else {
        router.push('/orang-tua/tagihan')
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(Number(amount))
  }

  if (isLoading) return <div className="p-8 text-center text-gray-500 text-sm">Memuat detail...</div>
  if (!invoice) return <div className="p-8 text-center text-red-500 text-sm">Tagihan tidak ditemukan</div>

  const isPaid = invoice.status === 'PAID'

  return (
    <div className="pb-24 bg-gray-50 min-h-screen">
      <TopBar title="Detail Tagihan" showBack />
      
      <div className="p-4 space-y-4">
        {isPaid ? (
          <div className="bg-green-600 text-white p-6 rounded-2xl flex flex-col items-center text-center shadow-sm">
            <CheckCircle2 className="w-12 h-12 mb-3 text-green-100" />
            <div className="font-bold text-lg mb-1">Tagihan Lunas</div>
            <div className="text-green-100 text-sm">Terima kasih telah menyelesaikan pembayaran ini.</div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-[#18085A] to-[#2B1B75] text-white p-6 rounded-2xl shadow-md">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="text-[#A78BFA] text-xs font-medium tracking-wider uppercase mb-1">Total Tagihan</div>
                <div className="text-3xl font-mono font-bold tracking-tight">{formatCurrency(invoice.outstandingAmount)}</div>
              </div>
              <Receipt className="w-8 h-8 text-white/20" />
            </div>
            
            <div className="flex justify-between items-end text-sm border-t border-white/10 pt-4 mt-2">
              <div className="text-white/70">Jatuh Tempo</div>
              <div className="font-medium">{new Date(invoice.dueDate).toLocaleDateString('id-ID')}</div>
            </div>
          </div>
        )}

        <Card className="p-5 space-y-4 shadow-sm border-gray-100">
          <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-3">Rincian Tagihan</h3>
          
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">No. Tagihan</span>
              <span className="font-medium text-gray-900">{invoice.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Periode</span>
              <span className="font-medium text-gray-900">{invoice.period || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Keterangan</span>
              <span className="font-medium text-gray-900">{invoice.description || '-'}</span>
            </div>
            
            <div className="pt-3 border-t border-gray-100 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Nilai Tagihan</span>
                <span className="font-mono text-gray-900">{formatCurrency(invoice.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Sudah Dibayar</span>
                <span className="font-mono text-green-600">{formatCurrency(invoice.paidAmount)}</span>
              </div>
            </div>
          </div>
        </Card>
        <Card className="p-5 space-y-4 shadow-sm border-gray-100">
          <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center">
            <History className="w-4 h-4 mr-2 text-gray-500" />
            Riwayat Pembayaran
          </h3>
          
          {!invoice.payments || invoice.payments.length === 0 ? (
            <div className="text-center py-4 text-gray-500 text-sm">Belum ada riwayat pembayaran.</div>
          ) : (
            <div className="space-y-3">
              {invoice.payments.map((payment: any) => (
                <Link key={payment.id} href={`/orang-tua/pembayaran/${payment.id}`} className="block">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border hover:border-[#18085A]/30 transition-colors">
                    <div>
                      <div className="text-sm font-medium text-[#18085A]">{payment.paymentNumber}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(payment.paymentDate).toLocaleDateString('id-ID')} • {payment.paymentMethod}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-mono font-semibold text-gray-900">{formatCurrency(payment.allocatedAmount)}</div>
                        <div className="text-[10px] uppercase font-medium text-gray-500">{payment.status}</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
