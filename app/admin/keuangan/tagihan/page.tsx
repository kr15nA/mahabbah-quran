'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Plus, Eye, Receipt, Layers } from 'lucide-react'
import Link from 'next/link'

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchInvoices()
  }, [])

  const fetchInvoices = async () => {
    try {
      const res = await fetch('/api/finance/invoices')
      if (res.ok) {
        const data = await res.json()
        setInvoices(data)
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
      case 'DRAFT': return <Badge variant="neutral">Draft</Badge>
      case 'ISSUED': return <Badge variant="warning">Ditagihkan</Badge>
      case 'PARTIALLY_PAID': return <Badge variant="primary">Sebagian</Badge>
      case 'PAID': return <Badge variant="success">Lunas</Badge>
      case 'CANCELLED': return <Badge variant="danger">Dibatalkan</Badge>
      default: return <Badge variant="neutral">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">Tagihan Santri</h2>
        <div className="flex gap-3">
          <Link href="/admin/keuangan/tagihan/berulang">
            <Button variant="outline">
              <Layers className="w-4 h-4 mr-2" />
              Buat Massal/Berulang
            </Button>
          </Link>
          <Button onClick={() => alert('Add single invoice modal not implemented in this skeleton')}>
            <Plus className="w-4 h-4 mr-2" />
            Buat Tagihan
          </Button>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 font-medium">No. Tagihan</th>
                <th className="px-6 py-4 font-medium">Siswa</th>
                <th className="px-6 py-4 font-medium">Periode</th>
                <th className="px-6 py-4 font-medium">Nominal</th>
                <th className="px-6 py-4 font-medium">Jatuh Tempo</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">Memuat data...</td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">Belum ada tagihan.</td>
                </tr>
              ) : invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4 font-medium text-[#18085A]">{invoice.invoiceNumber}</td>
                  <td className="px-6 py-4">ID Siswa: {invoice.studentId}</td>
                  <td className="px-6 py-4">{invoice.period || '-'}</td>
                  <td className="px-6 py-4 font-mono">{formatCurrency(invoice.amount)}</td>
                  <td className="px-6 py-4">{new Date(invoice.dueDate).toLocaleDateString('id-ID')}</td>
                  <td className="px-6 py-4">{getStatusBadge(invoice.status)}</td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/admin/keuangan/tagihan/${invoice.id}`}>
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
      </Card>
    </div>
  )
}
