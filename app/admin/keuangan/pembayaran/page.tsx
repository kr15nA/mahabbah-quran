'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Plus, Eye, Search, Filter } from 'lucide-react'
import Link from 'next/link'

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchPayments()
  }, [])

  const fetchPayments = async () => {
    try {
      const res = await fetch('/api/finance/payments')
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
      case 'PENDING': return <Badge variant="warning">Menunggu</Badge>
      case 'CONFIRMED': return <Badge variant="success">Dikonfirmasi</Badge>
      case 'REFUNDED': return <Badge variant="neutral">Dikembalikan</Badge>
      case 'CANCELLED': return <Badge variant="danger">Dibatalkan</Badge>
      default: return <Badge variant="neutral">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Pembayaran Santri</h2>
          <p className="text-sm text-gray-500">Daftar penerimaan pembayaran tagihan</p>
        </div>
        <div className="flex w-full sm:w-auto gap-3">
          <Link href="/admin/keuangan/pembayaran/baru" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto bg-[#D4AF37] hover:bg-[#B3932F] text-[#18085A]">
              <Plus className="w-4 h-4 mr-2" />
              Input Pembayaran
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input 
            type="text" 
            placeholder="Cari siswa atau no. pembayaran..." 
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#18085A]"
          />
        </div>
        <Button variant="outline" className="sm:w-auto">
          <Filter className="w-4 h-4 mr-2" /> Filter
        </Button>
      </Card>

      <Card>
        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 font-medium">No. Pembayaran</th>
                <th className="px-6 py-4 font-medium">Siswa</th>
                <th className="px-6 py-4 font-medium">Tanggal</th>
                <th className="px-6 py-4 font-medium">Metode</th>
                <th className="px-6 py-4 font-medium">Nominal</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">Memuat data...</td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">Belum ada pembayaran.</td>
                </tr>
              ) : payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4 font-medium text-[#18085A]">{payment.paymentNumber}</td>
                  <td className="px-6 py-4">{payment.studentName}</td>
                  <td className="px-6 py-4">{new Date(payment.paymentDate).toLocaleDateString('id-ID')}</td>
                  <td className="px-6 py-4">{payment.paymentMethod}</td>
                  <td className="px-6 py-4 font-mono">{formatCurrency(payment.amount)}</td>
                  <td className="px-6 py-4">{getStatusBadge(payment.status)}</td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/admin/keuangan/pembayaran/${payment.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-2" /> Detail
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-gray-100">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Memuat data...</div>
          ) : payments.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Belum ada pembayaran.</div>
          ) : payments.map((payment) => (
            <div key={payment.id} className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium text-[#18085A]">{payment.paymentNumber}</div>
                  <div className="text-sm font-medium">{payment.studentName}</div>
                </div>
                {getStatusBadge(payment.status)}
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>{new Date(payment.paymentDate).toLocaleDateString('id-ID')} • {payment.paymentMethod}</span>
                <span className="font-mono font-medium text-gray-900">{formatCurrency(payment.amount)}</span>
              </div>
              <Link href={`/admin/keuangan/pembayaran/${payment.id}`} className="block">
                <Button variant="outline" size="sm" className="w-full">
                  Lihat Detail
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
