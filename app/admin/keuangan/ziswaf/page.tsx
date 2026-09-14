'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatRupiah } from '@/lib/finance/utils'
import { HandCoins, ArrowDownToLine, ArrowUpFromLine, RefreshCcw } from 'lucide-react'

export default function ZiswafDashboardPage() {
  const [metrics, setMetrics] = useState<any>(null)
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/finance/ziswaf/summary').then(r => r.json()),
      fetch('/api/finance/ziswaf/campaign-summary').then(r => r.json())
    ]).then(([met, camp]) => {
      setMetrics(met)
      setCampaigns(camp)
      setLoading(false)
    }).catch(console.error)
  }, [])

  if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse">Memuat ZISWAF dashboard...</div>

  return (
    <div className="space-y-6">
      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-emerald-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500 font-medium">Penerimaan Kotor</p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-600">{formatRupiah(BigInt(metrics?.grossReceived || 0))}</h3>
              <p className="text-xs text-gray-400 mt-1">Total donasi masuk</p>
            </div>
            <div className="p-2 bg-emerald-50 rounded-lg"><HandCoins className="w-5 h-5 text-emerald-500" /></div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-rose-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500 font-medium">Pengembalian (Refunds)</p>
              <h3 className="text-2xl font-bold mt-1 text-rose-600">{formatRupiah(BigInt(metrics?.refunds || 0))}</h3>
              <p className="text-xs text-gray-400 mt-1">Donasi dikembalikan</p>
            </div>
            <div className="p-2 bg-rose-50 rounded-lg"><RefreshCcw className="w-5 h-5 text-rose-500" /></div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-blue-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500 font-medium">Penerimaan Bersih</p>
              <h3 className="text-2xl font-bold mt-1 text-blue-600">{formatRupiah(BigInt(metrics?.netReceived || 0))}</h3>
              <p className="text-xs text-gray-400 mt-1">Gross dikurangi refund</p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg"><ArrowDownToLine className="w-5 h-5 text-blue-500" /></div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-amber-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500 font-medium">Dana Disalurkan</p>
              <h3 className="text-2xl font-bold mt-1 text-amber-600">{formatRupiah(BigInt(metrics?.distributed || 0))}</h3>
              <p className="text-xs text-gray-400 mt-1">Telah didistribusikan</p>
            </div>
            <div className="p-2 bg-amber-50 rounded-lg"><ArrowUpFromLine className="w-5 h-5 text-amber-500" /></div>
          </div>
        </Card>
      </div>

      {/* CAMPAIGNS */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Performa Program/Campaign</h2>
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-600">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-6 py-4 font-medium">Kode</th>
                  <th className="px-6 py-4 font-medium">Nama Program</th>
                  <th className="px-6 py-4 font-medium text-center">Jumlah Transaksi</th>
                  <th className="px-6 py-4 font-medium text-right">Penerimaan Kotor</th>
                  <th className="px-6 py-4 font-medium text-right">Refund</th>
                  <th className="px-6 py-4 font-medium text-right">Penerimaan Bersih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {campaigns.map((camp: any) => (
                  <tr key={camp.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-xs">{camp.code}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{camp.name}</td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant="neutral">{camp.receiptCount}</Badge>
                    </td>
                    <td className="px-6 py-4 text-right text-emerald-600 font-medium">
                      {formatRupiah(BigInt(camp.grossReceived))}
                    </td>
                    <td className="px-6 py-4 text-right text-rose-600 font-medium">
                      {formatRupiah(BigInt(camp.refunded))}
                    </td>
                    <td className="px-6 py-4 text-right text-blue-600 font-bold">
                      {formatRupiah(BigInt(camp.netReceived))}
                    </td>
                  </tr>
                ))}
                {campaigns.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Belum ada campaign aktif</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
