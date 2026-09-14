'use client'

import { useState, useEffect, use } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, Printer, ShieldCheck } from 'lucide-react'
import Link from 'next/link'

export default function ParentPaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  
  const [payment, setPayment] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchPayment()
  }, [id])

  const fetchPayment = async () => {
    try {
      const res = await fetch(`/api/orang-tua/pembayaran/${id}`)
      if (res.ok) {
        const json = await res.json()
        setPayment(json.data)
      } else {
        const json = await res.json()
        setError(json.error || 'Pembayaran tidak ditemukan')
      }
    } catch (e) {
      console.error(e)
      setError('Terjadi kesalahan koneksi')
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (val: string) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(Number(val))
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

  if (isLoading) return <div className="p-8 text-center text-gray-500">Memuat rincian...</div>
  if (!payment) return <div className="p-8 text-center text-red-500">{error}</div>

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="bg-[#18085A] text-white pt-10 pb-16 px-4 rounded-b-[2rem] relative">
        <Link href="/orang-tua/pembayaran" className="absolute top-6 left-4 text-white/80 hover:text-white">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div className="text-center space-y-2 mt-4">
          <div className="text-white/80 text-sm">Total Pembayaran</div>
          <div className="text-3xl font-mono font-bold tracking-tight">
            {formatCurrency(payment.amount)}
          </div>
          <div className="mt-2 inline-block">
            {getStatusBadge(payment.status)}
          </div>
        </div>
      </div>

      <div className="px-4 -mt-10 space-y-4">
        {/* Detail Card */}
        <Card className="p-5 shadow-md border-0 ring-1 ring-black/5">
          <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100">
            <ShieldCheck className="w-5 h-5 text-green-500" />
            <span className="font-medium text-gray-900">Rincian Transaksi</span>
          </div>
          
          <div className="space-y-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">No. Referensi</span>
              <span className="font-medium">{payment.paymentNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Tanggal Transaksi</span>
              <span className="font-medium">
                {new Date(payment.paymentDate).toLocaleDateString('id-ID', {
                  day: 'numeric', month: 'long', year: 'numeric'
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Nama Siswa</span>
              <span className="font-medium">{payment.studentName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Metode Pembayaran</span>
              <span className="font-medium bg-gray-100 px-2 py-0.5 rounded">{payment.paymentMethod}</span>
            </div>
            {payment.referenceNumber && (
              <div className="flex justify-between">
                <span className="text-gray-500">Ref Bank</span>
                <span className="font-medium">{payment.referenceNumber}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Allocations Card */}
        <Card className="p-5 shadow-sm border-0 ring-1 ring-black/5">
          <h3 className="font-medium text-gray-900 mb-4 pb-2 border-b border-gray-100">Tagihan yang Dibayar</h3>
          
          {payment.allocations?.length === 0 ? (
            <div className="text-center py-4 text-gray-500 text-sm">Data alokasi tidak tersedia.</div>
          ) : (
            <div className="space-y-4">
              {payment.allocations?.map((alloc: any) => (
                <div key={alloc.id} className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-gray-900">{alloc.feeTypeName}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      No: {alloc.invoiceNumber} {alloc.period ? `• ${alloc.period}` : ''}
                    </div>
                  </div>
                  <div className="font-mono font-medium text-[#18085A]">
                    {formatCurrency(alloc.allocatedAmount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Actions */}
        {payment.status === 'CONFIRMED' && (
          <Button variant="outline" className="w-full mt-4" onClick={() => alert('Fungsi cetak kuitansi PDF')}>
            <Printer className="w-4 h-4 mr-2" /> Unduh Kuitansi (PDF)
          </Button>
        )}
      </div>
    </div>
  )
}
