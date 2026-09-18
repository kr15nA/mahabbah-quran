'use client'

import { Card } from '@/components/ui/Card'
import { Layers } from 'lucide-react'
import { formatRupiah } from '@/lib/finance/utils'
import Link from 'next/link'

interface FundSummaryProps {
  funds: any[]
}

export function FundSummary({ funds }: FundSummaryProps) {
  if (!funds || funds.length === 0) {
    return (
      <Card className="p-6 h-full shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-500" /> Ringkasan Dana
          </h3>
        </div>
        <div className="py-8 text-center text-gray-500 text-sm">
          Belum ada saldo dana.
        </div>
      </Card>
    )
  }

  const fundsRestricted = funds.filter(f => f.restrictionType === 'RESTRICTED')
  const fundsUnrestricted = funds.filter(f => f.restrictionType !== 'RESTRICTED')

  return (
    <Card className="p-6 h-full shadow-sm border border-gray-100 flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-500" /> Ringkasan Dana
        </h3>
        <Link href="/admin/keuangan/laporan/mutasi-dana" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
          Lihat Detail &rarr;
        </Link>
      </div>
      
      <div className="space-y-6 flex-1 overflow-y-auto pr-2">
        <div>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Dana Terikat (Restricted)</h4>
          <div className="space-y-3">
            {fundsRestricted.map(f => (
              <div key={f.id} className="flex justify-between items-center group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <Layers className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 group-hover:text-indigo-700 transition-colors">{f.name}</span>
                </div>
                <span className={`text-sm font-bold ${BigInt(f.balance) < BigInt(0) ? 'text-rose-600' : 'text-gray-900'}`}>
                  {formatRupiah(BigInt(f.balance))}
                </span>
              </div>
            ))}
            {fundsRestricted.length === 0 && <div className="text-xs text-gray-400 italic">Tidak ada data</div>}
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Dana Tidak Terikat (Unrestricted)</h4>
          <div className="space-y-3">
            {fundsUnrestricted.map(f => (
              <div key={f.id} className="flex justify-between items-center group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-500">
                    <Layers className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">{f.name}</span>
                </div>
                <span className={`text-sm font-bold ${BigInt(f.balance) < BigInt(0) ? 'text-rose-600' : 'text-gray-900'}`}>
                  {formatRupiah(BigInt(f.balance))}
                </span>
              </div>
            ))}
            {fundsUnrestricted.length === 0 && <div className="text-xs text-gray-400 italic">Tidak ada data</div>}
          </div>
        </div>
      </div>
    </Card>
  )
}
