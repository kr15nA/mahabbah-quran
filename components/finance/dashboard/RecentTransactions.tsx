'use client'

import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Clock } from 'lucide-react'
import { formatRupiah } from '@/lib/finance/utils'
import Link from 'next/link'

interface RecentTransactionsProps {
  activity: any[]
}

export function RecentTransactions({ activity }: RecentTransactionsProps) {
  return (
    <Card className="p-0 overflow-hidden shadow-sm border border-gray-100 flex flex-col h-full">
      <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-white">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-500" /> Transaksi Terbaru
        </h3>
        <Link href="/admin/keuangan/laporan/jurnal" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
          Lihat Semua &rarr;
        </Link>
      </div>
      
      <div className="flex-1 overflow-x-auto">
        <div className="min-w-[600px] w-full">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <div className="col-span-2">Tanggal</div>
            <div className="col-span-2">Jenis</div>
            <div className="col-span-5">Keterangan</div>
            <div className="col-span-3 text-right">Nominal</div>
          </div>
          
          {/* Table Body */}
          <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
            {activity.map((act: any) => (
              <div key={act.id} className="grid grid-cols-12 gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors items-center text-sm group">
                <div className="col-span-2 text-gray-500 font-medium">
                  {new Date(act.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
                <div className="col-span-2">
                  <Badge variant={act.status === 'REVERSED' ? 'danger' : 'neutral'}>
                    {act.type}
                  </Badge>
                </div>
                <div className="col-span-5">
                  <p className="font-medium text-gray-900 line-clamp-1 group-hover:text-indigo-700 transition-colors" title={act.description}>
                    {act.description}
                  </p>
                  {act.documentNumber && (
                    <p className="text-xs text-gray-400 mt-0.5">{act.documentNumber}</p>
                  )}
                </div>
                <div className="col-span-3 text-right font-bold text-gray-900">
                  {formatRupiah(BigInt(act.amount))}
                </div>
              </div>
            ))}
            
            {activity.length === 0 && (
              <div className="p-8 text-center text-gray-500 flex flex-col items-center justify-center">
                <Clock className="w-8 h-8 text-gray-300 mb-3" />
                <p>Belum ada aktivitas pada periode ini.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
