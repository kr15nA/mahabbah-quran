'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FinanceHeader } from '@/components/finance/dashboard/FinanceHeader'
import { FinanceKpiGrid } from '@/components/finance/dashboard/FinanceKpiGrid'
import { FinanceTrendChart } from '@/components/finance/dashboard/FinanceTrendChart'
import { FundSummary } from '@/components/finance/dashboard/FundSummary'
import { ZiswafSummary } from '@/components/finance/dashboard/ZiswafSummary'
import { RecentTransactions } from '@/components/finance/dashboard/RecentTransactions'
import { ReceivableFollowUp } from '@/components/finance/dashboard/ReceivableFollowUp'

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse p-4">
      <div className="h-40 bg-gray-200 rounded-2xl w-full"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1,2,3,4,5,6].map(i => <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>)}
      </div>
      <div className="h-96 bg-gray-200 rounded-xl"></div>
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
  if (error) return (
    <div className="p-8 text-center flex flex-col items-center">
      <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-100 max-w-lg w-full">
        <p className="font-medium mb-2">{error}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors text-sm font-medium">
          Coba lagi
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-6 pb-20 md:pb-8 p-0 md:p-2 lg:p-4">
      <FinanceHeader 
        userName={summary?.userName}
        period={period}
        customRange={customRange}
        onPeriodChange={setPeriod}
        onCustomRangeChange={setCustomRange}
        reconciliationDifference={summary?.reconciliationDifference}
        unclassifiedAssetAccounts={summary?.configState?.unclassifiedAssetAccounts}
      />

      <FinanceKpiGrid summary={summary} />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Column: Trend (Span 6) */}
        <div className="xl:col-span-6 flex h-full">
          <FinanceTrendChart data={summary?.trend} />
        </div>

        {/* Middle Column: Funds (Span 3) */}
        <div className="xl:col-span-3 flex h-full">
          <FundSummary funds={funds} />
        </div>
        
        {/* Right Column: ZISWAF (Span 3) */}
        <div className="xl:col-span-3 flex h-full">
          <ZiswafSummary ziswaf={summary?.ziswaf} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Bottom Left: Recent Transactions (Span 7) */}
        <div className="xl:col-span-7">
          <RecentTransactions activity={activity} />
        </div>
        
        {/* Bottom Right: Receivable Follow Up (Span 5) */}
        <div className="xl:col-span-5">
          <ReceivableFollowUp tunggakan={summary?.tunggakan} />
        </div>
      </div>
    </div>
  )
}
