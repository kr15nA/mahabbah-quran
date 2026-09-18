'use client'

import { AlertTriangle, Wallet } from 'lucide-react'
import { formatRupiah } from '@/lib/finance/utils'

interface FinanceHeaderProps {
  userName?: string
  period: string
  customRange: { from: string; to: string }
  onPeriodChange: (p: string) => void
  onCustomRangeChange: (r: { from: string; to: string }) => void
  reconciliationDifference?: string
  unclassifiedAssetAccounts?: number
}

export function FinanceHeader({ 
  userName, 
  period, 
  customRange, 
  onPeriodChange, 
  onCustomRangeChange, 
  reconciliationDifference, 
  unclassifiedAssetAccounts 
}: FinanceHeaderProps) {
  const diff = reconciliationDifference ? BigInt(reconciliationDifference) : BigInt(0)
  const hasReconDiff = reconciliationDifference !== undefined && diff !== BigInt(0)
  const hasUnclassified = (unclassifiedAssetAccounts ?? 0) > 0

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-2xl p-6 md:p-8 text-white shadow-md relative overflow-hidden">
        {/* Subtle background ornament */}
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none w-64 h-64 transform translate-x-16 -translate-y-16">
          <svg viewBox="0 0 100 100" fill="currentColor">
            <path d="M50 0L100 50L50 100L0 50Z" />
            <circle cx="50" cy="50" r="30" />
          </svg>
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-purple-200 text-sm font-medium mb-4 tracking-wide uppercase">
              <Wallet className="w-4 h-4" /> Manajemen Keuangan
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Assalamu'alaikum{userName ? `, ${userName}` : ''} 👋
            </h1>
            <p className="text-purple-100/90 text-sm md:text-base leading-relaxed">
              Selamat datang di Manajemen Keuangan Mahabbah Qur'an. Kelola tagihan, pembayaran, dan akuntansi lembaga secara aman, akurat, dan transparan.
            </p>
          </div>
          
          <div className="flex flex-col gap-3 md:items-end z-20">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-1 w-full md:w-auto shadow-sm">
              <select 
                value={period} 
                onChange={e => onPeriodChange(e.target.value)}
                className="bg-transparent text-white text-sm font-medium focus:outline-none py-2 px-3 rounded-md hover:bg-white/10 flex-1 md:flex-none cursor-pointer [&>option]:text-gray-900 transition-colors"
              >
                <option value="month">Bulan Ini</option>
                <option value="year">Tahun Ini</option>
                <option value="custom">Kustom Range</option>
              </select>
              {period === 'custom' && (
                <div className="flex items-center gap-2 border-l border-white/20 pl-3 pr-2">
                  <input type="date" value={customRange.from} onChange={e => onCustomRangeChange({ ...customRange, from: e.target.value })} className="text-sm bg-transparent outline-none text-white [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert" />
                  <span className="text-white/50">-</span>
                  <input type="date" value={customRange.to} onChange={e => onCustomRangeChange({ ...customRange, to: e.target.value })} className="text-sm bg-transparent outline-none text-white [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {hasUnclassified && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <h3 className="text-amber-800 font-medium text-sm">Konfigurasi Akun Belum Lengkap</h3>
            <p className="text-amber-700/80 text-xs mt-1 leading-relaxed">
              Ada {unclassifiedAssetAccounts} akun aset yang belum diklasifikasikan (CASH/BANK/dll). Saldo Kas/Bank belum dapat ditampilkan secara lengkap. Harap konfigurasi di pengaturan akun.
            </p>
          </div>
        </div>
      )}

      {reconciliationDifference !== undefined && (
        !hasReconDiff ? (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 ml-1" />
              <span className="text-sm text-emerald-800 font-medium">Rekonsiliasi Piutang: Seimbang</span>
            </div>
          </div>
        ) : (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <span className="text-sm text-rose-700 font-medium">Selisih Rekonsiliasi Piutang: {formatRupiah(diff)}</span>
            </div>
          </div>
        )
      )}
    </div>
  )
}
