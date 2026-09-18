'use client'

import { useEffect, useState, useMemo, Suspense } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatRupiah } from '@/lib/finance/utils'
import { Activity, Wallet, Receipt, AlertTriangle, ArrowUpRight, ArrowDownRight, Users, CreditCard, Clock, FileText } from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { useRouter, useSearchParams } from 'next/navigation'

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-20 bg-gray-200 rounded-lg"></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1,2,3,4,5,6].map(i => <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>)}
      </div>
      <div className="h-64 bg-gray-200 rounded-xl"></div>
    </div>
  )
}

function TrendChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return <div className="h-64 flex items-center justify-center text-gray-500 bg-gray-50 rounded-xl border border-gray-100">Belum ada data tren</div>
  }

  // Format data
  const chartData = data.map(d => ({
    date: new Date(d.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
    Pemasukan: Number(BigInt(d.income)) / 1000,
    Pengeluaran: Number(BigInt(d.expense)) / 1000
  }))

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(v) => `${v}k`} width={50} />
          <Tooltip 
            formatter={(value: any) => [formatRupiah(BigInt(Number(value) * 1000)), '']}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Area type="monotone" dataKey="Pemasukan" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
          <Area type="monotone" dataKey="Pengeluaran" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function FinanceDashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <FinanceDashboardContent />
    </Suspense>
  )
}

function FinanceDashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const fromParam = searchParams.get('from')
  const toParam = searchParams.get('to')
  
  const [period, setPeriod] = useState(
    fromParam && toParam ? 'custom' : 'month'
  )
  const [customRange, setCustomRange] = useState({ 
    from: fromParam || '', 
    to: toParam || '' 
  })

  const [summary, setSummary] = useState<any>(null)
  const [funds, setFunds] = useState<any[]>([])
  const [activity, setActivity] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboard = async (from?: string, to?: string) => {
    setLoading(true)
    setError(null)
    try {
      const q = new URLSearchParams()
      if (from) q.set('from', from)
      if (to) q.set('to', to)
      const qs = q.toString() ? `?${q.toString()}` : ''

      const [sumRes, fundsRes, actRes] = await Promise.all([
        fetch(`/api/finance/dashboard/summary${qs}`),
        fetch(`/api/finance/dashboard/funds`),
        fetch(`/api/finance/dashboard/activity${qs}`)
      ])

      if (!sumRes.ok) throw new Error('Gagal memuat ringkasan')

      const sumData = await sumRes.json()
      const fundsData = await fundsRes.json()
      const actData = await actRes.json()

      setSummary(sumData)
      setFunds(fundsData)
      setActivity(actData)
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let from, to
    if (period === 'month') {
      const d = new Date()
      from = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
      to = new Date().toISOString().split('T')[0] // today
    } else if (period === 'year') {
      const d = new Date()
      from = new Date(d.getFullYear(), 0, 1).toISOString().split('T')[0]
      to = new Date().toISOString().split('T')[0]
    } else if (period === 'custom') {
      from = customRange.from
      to = customRange.to
    }

    if (from && to) {
      router.replace(`?from=${from}&to=${to}`, { scroll: false })
      fetchDashboard(from, to)
    } else {
      router.replace('?', { scroll: false })
      fetchDashboard()
    }
  }, [period, customRange.from, customRange.to]) // eslint-disable-line

  if (loading && !summary) return <DashboardSkeleton />
  if (error) return <div className="p-8 text-center text-red-500 bg-red-50 rounded-lg">{error} <button onClick={() => window.location.reload()} className="underline ml-2">Coba lagi</button></div>

  const surplusDeficit = BigInt(summary?.periodIncome || 0) - BigInt(summary?.periodExpense || 0)
  const isSurplus = surplusDeficit >= 0
  
  const fundsRestricted = funds.filter(f => f.restrictionType === 'RESTRICTED')
  const fundsUnrestricted = funds.filter(f => f.restrictionType !== 'RESTRICTED')

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* HEADER & PERIOD FILTER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Keuangan</h1>
          <p className="text-gray-500 text-sm mt-1">Ringkasan transaksi dan likuiditas dana institusi.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1 shadow-sm w-full md:w-auto">
          <select 
            value={period} 
            onChange={e => setPeriod(e.target.value)}
            className="bg-transparent text-sm font-medium focus:outline-none py-1.5 px-3 rounded-md hover:bg-gray-50 flex-1 md:flex-none cursor-pointer"
          >
            <option value="month">Bulan Ini</option>
            <option value="year">Tahun Ini</option>
            <option value="custom">Kustom Range</option>
          </select>
          {period === 'custom' && (
            <div className="flex items-center gap-1 border-l pl-2">
              <input type="date" value={customRange.from} onChange={e => setCustomRange(p => ({ ...p, from: e.target.value }))} className="text-sm bg-transparent outline-none" />
              <span className="text-gray-400">-</span>
              <input type="date" value={customRange.to} onChange={e => setCustomRange(p => ({ ...p, to: e.target.value }))} className="text-sm bg-transparent outline-none" />
            </div>
          )}
        </div>
      </div>

      {summary?.configState && !summary.configState.configurationComplete && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <h3 className="text-amber-800 font-medium">Konfigurasi Akun Belum Lengkap</h3>
            <p className="text-amber-700 text-sm mt-1">
              Ada {summary.configState.unclassifiedAssetAccounts} akun aset yang belum diklasifikasikan (CASH/BANK/dll). 
              Saldo Kas/Bank belum dapat ditampilkan secara lengkap. Harap konfigurasi di pengaturan akun.
            </p>
          </div>
        </div>
      )}

      {/* RECONCILIATION ALERT */}
      {summary?.reconciliationDifference && BigInt(summary.reconciliationDifference) !== BigInt(0) && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <span className="text-sm text-rose-700 font-medium">Selisih Rekonsiliasi Piutang: {formatRupiah(BigInt(summary.reconciliationDifference))}</span>
          </div>
        </div>
      )}

      {/* PRIMARY KPIS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Kas & Bank */}
        <Card className="p-5 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm text-gray-500 font-medium flex items-center gap-1.5"><Wallet className="w-4 h-4" /> Total Kas & Bank (Saat Ini)</p>
              <h3 className="text-3xl font-bold mt-2 text-gray-900">{formatRupiah(BigInt(summary?.currentLiquidBalance || 0))}</h3>
            </div>
          </div>
          <div className="pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-500">
            <span>Kas/Bank liquid</span>
            <span>Tidak termasuk piutang</span>
          </div>
        </Card>

        {/* Pemasukan & Pengeluaran (Merged into one card visually or split) */}
        <div className="grid grid-cols-2 gap-4 lg:col-span-2">
          <Card className="p-5">
            <p className="text-sm text-gray-500 font-medium flex items-center gap-1.5"><ArrowDownRight className="w-4 h-4 text-emerald-500" /> Pemasukan Periode</p>
            <h3 className="text-2xl font-bold mt-2 text-emerald-600">{formatRupiah(BigInt(summary?.periodIncome || 0))}</h3>
          </Card>
          <Card className="p-5">
            <p className="text-sm text-gray-500 font-medium flex items-center gap-1.5"><ArrowUpRight className="w-4 h-4 text-rose-500" /> Pengeluaran Periode</p>
            <h3 className="text-2xl font-bold mt-2 text-rose-600">{formatRupiah(BigInt(summary?.periodExpense || 0))}</h3>
          </Card>
          <Card className="p-5 col-span-2">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500 font-medium">Surplus / Defisit Periode</p>
                <h3 className={`text-2xl font-bold mt-1 ${isSurplus ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {isSurplus ? '+' : '-'}{formatRupiah(isSurplus ? surplusDeficit : -surplusDeficit)}
                </h3>
              </div>
              <Activity className={`w-8 h-8 ${isSurplus ? 'text-emerald-100' : 'text-rose-100'}`} />
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status Tagihan (Invoice Status) */}
        <Card className="p-4 lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2"><Receipt className="w-4 h-4 text-blue-500" /> Status Tagihan</h3>
            <Badge variant="neutral">Periode Ini</Badge>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-100">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Lunas</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{summary?.invoiceStatus?.PAID?.count || 0}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-100">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Sebagian</p>
              <p className="text-lg font-bold text-amber-600 mt-1">{summary?.invoiceStatus?.PARTIALLY_PAID?.count || 0}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-100">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Belum</p>
              <p className="text-lg font-bold text-rose-600 mt-1">{summary?.invoiceStatus?.ISSUED?.count || 0}</p>
            </div>
          </div>
        </Card>

        {/* Tunggakan Jatuh Tempo */}
        <Card className="p-4 lg:col-span-2 border-rose-100 bg-gradient-to-br from-white to-rose-50/30">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-rose-900 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-rose-500" /> Tunggakan Jatuh Tempo</h3>
              <p className="text-3xl font-bold text-rose-700 mt-3 tracking-tight">{formatRupiah(BigInt(summary?.tunggakan?.amount || 0))}</p>
              <p className="text-sm text-rose-600/80 mt-1">{summary?.tunggakan?.count || 0} tagihan telah melewati batas waktu (as of today)</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Trend & Follow-up */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-5">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Trend Pemasukan vs Pengeluaran</h3>
            <TrendChart data={summary?.trend} />
          </Card>

          <Card className="p-0 overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Tagihan yang Perlu Ditindaklanjuti</h3>
              <p className="text-sm text-gray-500 mt-1">Daftar tagihan yang telah jatuh tempo.</p>
            </div>
            <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
              {summary?.tunggakan?.items?.map((item: any, i: number) => (
                <div key={i} className="p-4 hover:bg-gray-50 flex justify-between items-center group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-sm shrink-0">
                      {item.studentName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.studentName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.feeType} • {item.invoiceNumber}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-rose-600">{formatRupiah(BigInt(item.outstanding))}</p>
                    <p className="text-xs text-rose-400 mt-0.5">Telat {item.daysOverdue} hari</p>
                  </div>
                </div>
              ))}
              {(!summary?.tunggakan?.items || summary.tunggakan.items.length === 0) && (
                <div className="p-8 text-center text-gray-500 text-sm">Tidak ada tunggakan jatuh tempo.</div>
              )}
            </div>
          </Card>
        </div>

        {/* RIGHT COLUMN: Funds, ZISWAF, Activity */}
        <div className="space-y-6">
          
          {/* ZISWAF Widget */}
          {summary?.ziswaf && (
            <Card className="p-5 bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-none shadow-md">
              <h3 className="font-semibold flex items-center gap-2"><Activity className="w-4 h-4 opacity-80" /> Ringkasan ZISWAF</h3>
              <div className="mt-4 space-y-3">
                <div className="flex justify-between items-end border-b border-emerald-400/30 pb-2">
                  <span className="text-sm text-emerald-100">Penerimaan Bersih</span>
                  <span className="font-bold">{formatRupiah(BigInt(summary.ziswaf.netReceived))}</span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-sm text-emerald-100">Telah Disalurkan</span>
                  <span className="font-bold">{formatRupiah(BigInt(summary.ziswaf.distributed))}</span>
                </div>
              </div>
            </Card>
          )}

          {/* FUND BALANCES */}
          <Card className="p-5">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><CreditCard className="w-4 h-4 text-gray-400" /> Likuiditas Dana (Saat Ini)</h3>
            
            <div className="space-y-5">
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Dana Bebas (Unrestricted)</h4>
                <div className="space-y-2">
                  {fundsUnrestricted.map(f => (
                    <div key={f.id} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-md">
                      <span className="text-sm font-medium text-gray-700">{f.name}</span>
                      <span className={`text-sm font-bold ${BigInt(f.balance) < BigInt(0) ? 'text-red-600' : 'text-gray-900'}`}>{formatRupiah(BigInt(f.balance))}</span>
                    </div>
                  ))}
                  {fundsUnrestricted.length === 0 && <div className="text-xs text-gray-400 italic p-2">Tidak ada data</div>}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Dana Terikat (Restricted)</h4>
                <div className="space-y-2">
                  {fundsRestricted.map(f => (
                    <div key={f.id} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-md">
                      <span className="text-sm font-medium text-gray-700">{f.name}</span>
                      <span className={`text-sm font-bold ${BigInt(f.balance) < BigInt(0) ? 'text-red-600' : 'text-gray-900'}`}>{formatRupiah(BigInt(f.balance))}</span>
                    </div>
                  ))}
                  {fundsRestricted.length === 0 && <div className="text-xs text-gray-400 italic p-2">Tidak ada data</div>}
                </div>
              </div>
            </div>
          </Card>

          {/* RECENT ACTIVITY */}
          <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 flex items-center gap-2"><Clock className="w-4 h-4 text-gray-400" /> Aktivitas Terbaru</h3>
            </div>
            <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
              {activity.map((act: any) => (
                <div key={act.id} className="p-3 hover:bg-gray-50 text-sm">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-gray-900 line-clamp-1 flex-1 pr-2" title={act.description}>{act.description}</span>
                    <span className="font-semibold whitespace-nowrap">{formatRupiah(BigInt(act.amount))}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-gray-500">{new Date(act.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                    <div className="scale-90 origin-right"><Badge variant={act.status === 'REVERSED' ? 'danger' : 'neutral'}>{act.type}</Badge></div>
                  </div>
                </div>
              ))}
              {activity.length === 0 && (
                <div className="p-6 text-center text-gray-500 text-xs">Belum ada aktivitas</div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
