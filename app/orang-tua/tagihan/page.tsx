'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Eye, Receipt } from 'lucide-react'
import Link from 'next/link'
import TopBar from '@/components/layout/TopBar'

export default function ParentInvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchInvoices()
  }, [])

  const fetchInvoices = async () => {
    try {
      const res = await fetch('/api/orang-tua/tagihan')
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
      case 'ISSUED': return <Badge variant="warning">Belum Lunas</Badge>
      case 'PARTIALLY_PAID': return <Badge variant="primary">Sebagian</Badge>
      case 'PAID': return <Badge variant="success">Lunas</Badge>
      case 'CANCELLED': return <Badge variant="danger">Dibatalkan</Badge>
      default: return <Badge variant="neutral">{status}</Badge>
    }
  }

  return (
    <div className="pb-24">
      <TopBar title="Tagihan Biaya" showBack />
      
      <div className="p-4 space-y-4">
        {isLoading ? (
          <div className="text-center py-8 text-gray-500 text-sm">Memuat tagihan...</div>
        ) : invoices.length === 0 ? (
          <Card className="p-8 flex flex-col items-center justify-center text-center">
            <Receipt className="w-12 h-12 text-gray-300 mb-3" />
            <div className="text-gray-900 font-medium mb-1">Belum Ada Tagihan</div>
            <div className="text-gray-500 text-sm">Saat ini tidak ada tagihan untuk anak Anda.</div>
          </Card>
        ) : (
          invoices.map((invoice) => (
            <Link key={invoice.id} href={`/orang-tua/tagihan/${invoice.id}`}>
              <Card className="p-4 hover:border-[#18085A]/30 transition-colors active:bg-gray-50 cursor-pointer mb-3">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">{invoice.invoiceNumber}</div>
                    <div className="font-semibold text-gray-900">{invoice.period ? `Tagihan ${invoice.period}` : 'Tagihan'}</div>
                  </div>
                  {getStatusBadge(invoice.status)}
                </div>
                
                <div className="flex justify-between items-end">
                  <div className="text-xs text-gray-500">
                    Jatuh tempo: <br />
                    <span className="font-medium text-gray-700">{new Date(invoice.dueDate).toLocaleDateString('id-ID')}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-gray-500 mb-0.5">Total Tagihan</div>
                    <div className="font-mono font-bold text-[#18085A]">{formatCurrency(invoice.amount)}</div>
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
