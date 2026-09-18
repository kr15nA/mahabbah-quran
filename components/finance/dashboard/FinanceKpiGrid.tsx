'use client'

import { Wallet, ArrowDownRight, ArrowUpRight, Activity, Receipt, AlertTriangle, Users } from 'lucide-react'
import { formatRupiah } from '@/lib/finance/utils'
import { FinanceKpiCard } from './FinanceKpiCard'

interface FinanceKpiGridProps {
  summary: any
}

export function FinanceKpiGrid({ summary }: FinanceKpiGridProps) {
  const surplusDeficit = BigInt(summary?.periodIncome || 0) - BigInt(summary?.periodExpense || 0)
  const isSurplus = surplusDeficit >= 0
  
  const invoiceTotalCount = (summary?.invoiceStatus?.PAID?.count || 0) + 
                            (summary?.invoiceStatus?.PARTIALLY_PAID?.count || 0) + 
                            (summary?.invoiceStatus?.ISSUED?.count || 0)
  const invoicePaidCount = summary?.invoiceStatus?.PAID?.count || 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {/* 1. Saldo Kas & Bank */}
      <FinanceKpiCard
        title="Saldo Kas & Bank"
        value={formatRupiah(BigInt(summary?.currentLiquidBalance || 0))}
        icon={<Wallet className="w-6 h-6" />}
        iconBgColor="bg-purple-100"
        iconColor="text-purple-600"
        valueColor="text-purple-900"
        subtext={<span className="text-purple-600/80">Saldo Kas & Bank Saat Ini</span>}
      />

      {/* 2. Pemasukan Bulan Ini */}
      <FinanceKpiCard
        title="Pemasukan Periode"
        value={formatRupiah(BigInt(summary?.periodIncome || 0))}
        icon={<ArrowDownRight className="w-6 h-6" />}
        iconBgColor="bg-emerald-100"
        iconColor="text-emerald-600"
        valueColor="text-gray-900"
      />

      {/* 3. Pengeluaran Bulan Ini */}
      <FinanceKpiCard
        title="Pengeluaran Periode"
        value={formatRupiah(BigInt(summary?.periodExpense || 0))}
        icon={<ArrowUpRight className="w-6 h-6" />}
        iconBgColor="bg-rose-100"
        iconColor="text-rose-600"
        valueColor="text-gray-900"
      />

      {/* 4. Surplus / Defisit */}
      <FinanceKpiCard
        title="Surplus / Defisit"
        value={`${isSurplus ? '+' : '-'}${formatRupiah(isSurplus ? surplusDeficit : -surplusDeficit)}`}
        icon={<Activity className="w-6 h-6" />}
        iconBgColor={isSurplus ? "bg-emerald-100" : "bg-rose-100"}
        iconColor={isSurplus ? "text-emerald-600" : "text-rose-600"}
        valueColor={isSurplus ? "text-emerald-600" : "text-rose-600"}
        subtext={<span className={isSurplus ? "text-emerald-600" : "text-rose-600"}>{isSurplus ? 'Surplus' : 'Defisit'} Periode</span>}
      />

      {/* 5. Status Tagihan */}
      <FinanceKpiCard
        title="Status Tagihan (Lunas)"
        value={
          <div className="flex items-baseline gap-1">
            <span>{invoicePaidCount}</span>
            <span className="text-sm font-medium text-gray-500">/ {invoiceTotalCount}</span>
          </div>
        }
        icon={<Users className="w-6 h-6" />}
        iconBgColor="bg-amber-100"
        iconColor="text-amber-600"
        valueColor="text-gray-900"
        subtext={
          <div className="flex justify-between items-center w-full">
            <span className="text-gray-500">Lunas / Total Tagihan</span>
            <span className="text-amber-600 font-semibold">{invoiceTotalCount > 0 ? Math.round((invoicePaidCount / invoiceTotalCount) * 100) : 0}%</span>
          </div>
        }
      />

      {/* 6. Tunggakan */}
      {summary?.tunggakan ? (
        <FinanceKpiCard
          title="Tunggakan Jatuh Tempo"
          value={formatRupiah(BigInt(summary.tunggakan.amount || 0))}
          icon={<Receipt className="w-6 h-6" />}
          iconBgColor="bg-rose-100"
          iconColor="text-rose-600"
          valueColor="text-gray-900"
          subtext={
            <span className="text-rose-600/80 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              {summary.tunggakan.count || 0} tagihan menunggak
            </span>
          }
          className="border-rose-100"
        />
      ) : (
        <FinanceKpiCard
          title="Tunggakan Jatuh Tempo"
          value="Belum dimuat"
          icon={<Receipt className="w-6 h-6" />}
          iconBgColor="bg-gray-100"
          iconColor="text-gray-400"
          valueColor="text-gray-400"
          subtext={<span>Data tunggakan belum tersedia</span>}
        />
      )}
    </div>
  )
}
