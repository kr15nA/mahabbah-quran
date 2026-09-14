'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatRupiah } from '@/lib/finance/utils'
import { Activity, Wallet, Receipt, AlertTriangle } from 'lucide-react'

export default function FinanceDashboardPage() {
  const [summary, setSummary] = useState<any>(null)
  const [funds, setFunds] = useState<any[]>([])
  const [activity, setActivity] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/finance/dashboard/summary').then(r => r.json()),
      fetch('/api/finance/dashboard/funds').then(r => r.json()),
      fetch('/api/finance/dashboard/activity').then(r => r.json()),
    ]).then(([sumData, fundsData, actData]) => {
      setSummary(sumData)
      setFunds(fundsData)
      setActivity(actData)
      setLoading(false)
    }).catch(console.error)
  }, [])

  if (loading) return <div className="p-8 text-center text-gray-500 animate-pulse">Memuat dashboard...</div>

  return (
    <div className="space-y-6">
      {summary?.configState && !summary.configState.configurationComplete && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
          <div>
            <h3 className="text-amber-800 font-medium">Konfigurasi Akun Belum Lengkap</h3>
            <p className="text-amber-700 text-sm mt-1">
              Ada {summary.configState.unclassifiedAssetAccounts} akun aset yang belum diklasifikasikan (CASH/BANK/dll). 
              Saldo Kas/Bank belum dapat ditampilkan secara lengkap. Harap konfigurasi di pengaturan akun.
            </p>
          </div>
        </div>
      )}

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-blue-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Kas & Bank (Liquid)</p>
              <h3 className="text-2xl font-bold mt-1">{formatRupiah(BigInt(summary?.currentLiquidBalance || 0))}</h3>
              <p className="text-xs text-gray-400 mt-1">Saldo saat ini</p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg"><Wallet className="w-5 h-5 text-blue-500" /></div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-amber-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500 font-medium">Piutang Akademik</p>
              <h3 className="text-2xl font-bold mt-1">{formatRupiah(BigInt(summary?.academicReceivables || 0))}</h3>
              <p className="text-xs text-gray-400 mt-1">Saldo saat ini</p>
            </div>
            <div className="p-2 bg-amber-50 rounded-lg"><Receipt className="w-5 h-5 text-amber-500" /></div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500 font-medium">Penerimaan Periode</p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-600">{formatRupiah(BigInt(summary?.periodIncome || 0))}</h3>
              <p className="text-xs text-gray-400 mt-1">Bulan ini</p>
            </div>
            <div className="p-2 bg-emerald-50 rounded-lg"><Activity className="w-5 h-5 text-emerald-500" /></div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-rose-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500 font-medium">Pengeluaran Periode</p>
              <h3 className="text-2xl font-bold mt-1 text-rose-600">{formatRupiah(BigInt(summary?.periodExpense || 0))}</h3>
              <p className="text-xs text-gray-400 mt-1">Bulan ini</p>
            </div>
            <div className="p-2 bg-rose-50 rounded-lg"><Activity className="w-5 h-5 text-rose-500" /></div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* FUND BALANCES */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Likuiditas Dana (Fund Balances)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {funds.map((f: any) => (
              <Card key={f.id} className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-gray-900">{f.name}</h4>
                  <Badge variant={f.restrictionType === 'RESTRICTED' ? 'warning' : 'neutral'}>
                    {f.restrictionType}
                  </Badge>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-gray-500">Saldo Liquid (Kas/Bank)</p>
                  <p className={`text-xl font-bold mt-1 ${BigInt(f.balance) < BigInt(0) ? 'text-red-600' : 'text-gray-900'}`}>
                    {formatRupiah(BigInt(f.balance))}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* RECENT ACTIVITY */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Aktivitas Terakhir</h2>
          <Card className="divide-y divide-gray-100">
            {activity.map((act: any) => (
              <div key={act.id} className="p-4 flex flex-col gap-1">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-mono text-gray-500">{act.documentNumber}</span>
                  <span className="text-xs text-gray-400">{new Date(act.date).toLocaleDateString('id-ID')}</span>
                </div>
                <p className="text-sm font-medium text-gray-900 line-clamp-1">{act.description}</p>
                <div className="flex justify-between items-center mt-2">
                  <Badge variant={act.status === 'REVERSED' ? 'danger' : 'success'}>{act.type}</Badge>
                  <span className="text-sm font-semibold">{formatRupiah(BigInt(act.amount))}</span>
                </div>
              </div>
            ))}
            {activity.length === 0 && (
              <div className="p-8 text-center text-gray-500 text-sm">Belum ada aktivitas</div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
