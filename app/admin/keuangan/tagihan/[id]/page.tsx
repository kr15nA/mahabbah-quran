'use client'

import { useState, useEffect, use } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [invoice, setInvoice] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const resolvedParams = use(params)

  useEffect(() => {
    fetchInvoice()
  }, [])

  const fetchInvoice = async () => {
    try {
      const res = await fetch(`/api/finance/invoices/${resolvedParams.id}`)
      if (res.ok) {
        const data = await res.json()
        setInvoice(data)
      } else {
        router.push('/admin/keuangan/tagihan')
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  const handleIssue = async () => {
    if (!confirm('Terbitkan tagihan ini? Ini akan memposting jurnal akuntansi dan tidak dapat dibatalkan dengan mudah.')) return
    try {
      await fetch(`/api/finance/invoices/${resolvedParams.id}/issue`, { method: 'POST' })
      fetchInvoice()
    } catch (e) {
      console.error(e)
    }
  }

  const handleCancel = async () => {
    if (!confirm('Batalkan tagihan ini?')) return
    try {
      await fetch(`/api/finance/invoices/${resolvedParams.id}/cancel`, { method: 'POST' })
      fetchInvoice()
    } catch (e) {
      console.error(e)
    }
  }

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(Number(amount))
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT': return <Badge variant="neutral">Draft</Badge>
      case 'ISSUED': return <Badge variant="warning">Ditagihkan</Badge>
      case 'PARTIALLY_PAID': return <Badge variant="primary">Sebagian</Badge>
      case 'PAID': return <Badge variant="success">Lunas</Badge>
      case 'CANCELLED': return <Badge variant="danger">Dibatalkan</Badge>
      default: return <Badge variant="neutral">{status}</Badge>
    }
  }

  if (isLoading) return <div className="p-8 text-center text-gray-500">Memuat detail tagihan...</div>
  if (!invoice) return <div className="p-8 text-center text-red-500">Tagihan tidak ditemukan</div>

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href="/admin/keuangan/tagihan">
          <Button variant="outline" size="sm" className="w-10 h-10 p-0 rounded-full">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Button>
        </Link>
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
            Tagihan {invoice.invoiceNumber}
            {getStatusBadge(invoice.status)}
          </h2>
          <p className="text-sm text-gray-500 mt-1">Siswa ID: {invoice.studentId}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 p-6 space-y-6">
          <h3 className="text-lg font-semibold border-b pb-2">Rincian Tagihan</h3>
          
          <div className="grid grid-cols-2 gap-y-4 text-sm">
            <div className="text-gray-500">Jenis Tagihan</div>
            <div className="font-medium">Fee Type ID: {invoice.feeTypeId}</div>

            <div className="text-gray-500">Tahun Ajaran</div>
            <div className="font-medium">Year ID: {invoice.academicYearId}</div>

            <div className="text-gray-500">Periode</div>
            <div className="font-medium">{invoice.period || '-'}</div>

            <div className="text-gray-500">Jatuh Tempo</div>
            <div className="font-medium">{new Date(invoice.dueDate).toLocaleDateString('id-ID')}</div>
            
            <div className="text-gray-500">Keterangan</div>
            <div className="font-medium">{invoice.description || '-'}</div>
          </div>
        </Card>

        <Card className="p-6 space-y-6 bg-gray-50">
          <h3 className="text-lg font-semibold border-b border-gray-200 pb-2">Ringkasan Nilai</h3>
          
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Total Tagihan</span>
              <span className="font-mono font-medium">{formatCurrency(invoice.amount)}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Sudah Dibayar</span>
              <span className="font-mono font-medium">{formatCurrency(invoice.paidAmount)}</span>
            </div>
            <div className="pt-3 border-t border-gray-200 flex justify-between font-bold text-lg">
              <span>Sisa Tagihan</span>
              <span className="font-mono text-[#18085A]">{formatCurrency(invoice.outstandingAmount)}</span>
            </div>
          </div>

          <div className="pt-6 space-y-3">
            {invoice.status === 'DRAFT' && (
              <Button onClick={handleIssue} className="w-full bg-[#18085A] hover:bg-[#18085A]/90 text-white">
                <CheckCircle className="w-4 h-4 mr-2" />
                Terbitkan Tagihan
              </Button>
            )}
            
            {(invoice.status === 'DRAFT' || invoice.status === 'ISSUED') && (
              <Button onClick={handleCancel} variant="outline" className="w-full text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200">
                <XCircle className="w-4 h-4 mr-2" />
                Batalkan Tagihan
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
