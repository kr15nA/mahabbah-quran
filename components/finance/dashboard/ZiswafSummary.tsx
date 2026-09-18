'use client'

import { Card } from '@/components/ui/Card'
import { Heart } from 'lucide-react'
import { formatRupiah } from '@/lib/finance/utils'
import Link from 'next/link'

interface ZiswafSummaryProps {
  ziswaf: any
}

export function ZiswafSummary({ ziswaf }: ZiswafSummaryProps) {
  return (
    <Card className="p-6 h-full shadow-sm border border-emerald-100 bg-gradient-to-br from-emerald-500 to-teal-600 text-white relative overflow-hidden flex flex-col">
      {/* Subtle background ornament */}
      <div className="absolute -right-8 -top-8 opacity-10 pointer-events-none">
        <Heart className="w-32 h-32" />
      </div>

      <div className="relative z-10 flex justify-between items-center mb-6">
        <h3 className="font-bold flex items-center gap-2">
          <Heart className="w-5 h-5 text-emerald-100" /> Ringkasan ZISWAF
        </h3>
        <Link href="/admin/keuangan/ziswaf" className="text-xs font-medium text-emerald-100 hover:text-white transition-colors bg-white/10 px-2 py-1 rounded">
          Kelola ZISWAF
        </Link>
      </div>

      {!ziswaf ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="p-4 bg-emerald-700/40 text-emerald-50 text-sm rounded-lg border border-emerald-500/30 w-full text-center backdrop-blur-sm">
            Data ZISWAF belum dapat dimuat.
          </div>
        </div>
      ) : (
        <div className="relative z-10 space-y-4 flex-1 flex flex-col justify-center">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <p className="text-emerald-100 text-sm font-medium mb-1">Penerimaan ZISWAF Bersih</p>
            <p className="text-2xl md:text-3xl font-bold tracking-tight">{formatRupiah(BigInt(ziswaf.netReceived || 0))}</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <p className="text-emerald-100 text-sm font-medium mb-1">Penyaluran ZISWAF</p>
            <p className="text-2xl md:text-3xl font-bold tracking-tight">{formatRupiah(BigInt(ziswaf.distributed || 0))}</p>
          </div>
        </div>
      )}
    </Card>
  )
}
