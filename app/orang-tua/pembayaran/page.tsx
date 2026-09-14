'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Receipt, Search } from 'lucide-react'
import Link from 'next/link'

export default function ParentPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchPayments()
  }, [])

  const fetchPayments = async () => {
    try {
      const res = await fetch('/api/orang-tua/pembayaran')
      if (res.ok) {
        const json = await res.json()
        setPayments(json.data || [])
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING': return <Badge variant="warning">Sedang Diproses</Badge>
      case 'CONFIRMED': return <Badge variant="success">Berhasil</Badge>
      case 'REFUNDED': return <Badge variant="neutral">Dikembalikan</Badge>
      case 'CANCELLED': return <Badge variant="danger">Gagal/Dibatalkan</Badge>
      default: return <Badge variant="neutral">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      <div className="px-4 pt-6">
        <h2 className="text-xl font-bold text-gray-900">Riwayat Pembayaran</h2>
        <p className="text-sm text-gray-500 mt-1">Laporan pembayaran tagihan anak-anak Anda</p>
      </div>

      <div className="px-4">
        <div className="relative">
          <Search className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
          <input 
            type="text" 
            placeholder="Cari no. pembayaran atau nama anak..." 
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-[#18085A] text-sm"
          />
        </div>
      </div>

      <div className="px-4 space-y-4">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Memuat riwayat pembayaran...</div>
        ) : payments.length === 0 ? (
          <div className="text-center py-12 text-gray-500 flex flex-col items-center bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <Receipt className="w-8 h-8 text-gray-300" />
            </div>
            <p>Belum ada riwayat pembayaran.</p>
          </div>
        ) : (
          payments.map((payment) => (
            <Link key={payment.id} href={`/orang-tua/pembayaran/${payment.id}`} className="block">
              <Card className="p-5 hover:border-[#18085A]/30 transition-colors shadow-sm active:scale-[0.98]">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="text-xs text-gray-500 font-medium mb-1">
                      {new Date(payment.paymentDate).toLocaleDateString('id-ID', {
                        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </div>
                    <div className="font-semibold text-[#18085A]">{payment.studentName}</div>
                  </div>
                  {getStatusBadge(payment.status)}
                </div>
                
                <div className="flex justify-between items-end border-t border-gray-50 pt-3 mt-3">
                  <div className="text-sm text-gray-500">
                    <div className="mb-0.5">No: {payment.paymentNumber}</div>
                    <div className="text-xs bg-gray-100 px-2 py-1 rounded inline-block mt-1">
                      {payment.paymentMethod}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500 mb-0.5">Total Bayar</div>
                    <div className="font-bold text-gray-900 font-mono">
                      {formatCurrency(payment.amount)}
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
