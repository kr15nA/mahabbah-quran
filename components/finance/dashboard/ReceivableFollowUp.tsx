'use client'

import { Card } from '@/components/ui/Card'
import { Users, AlertTriangle } from 'lucide-react'
import { formatRupiah } from '@/lib/finance/utils'
import Link from 'next/link'

interface ReceivableFollowUpProps {
  tunggakan: any
}

export function ReceivableFollowUp({ tunggakan }: ReceivableFollowUpProps) {
  return (
    <Card className="p-0 overflow-hidden shadow-sm border border-gray-100 flex flex-col h-full">
      <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-white">
        <div>
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" /> Tagihan yang Perlu Ditindaklanjuti
          </h3>
          <p className="text-xs text-gray-500 mt-1 ml-7">Daftar tagihan yang telah jatuh tempo.</p>
        </div>
        <Link href="/admin/keuangan/laporan/piutang" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors">
          Lihat Semua &rarr;
        </Link>
      </div>
      
      <div className="flex-1 overflow-x-auto">
        <div className="min-w-[600px] w-full">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <div className="col-span-4">Santri</div>
            <div className="col-span-3">Kelas / Program</div>
            <div className="col-span-3 text-right">Sisa Tagihan</div>
            <div className="col-span-2 text-right">Status</div>
          </div>

          <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
            {!tunggakan ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-rose-300 mb-3" />
                <p className="text-rose-600 text-sm font-medium">Data Tindak Lanjut belum dapat dimuat.</p>
              </div>
            ) : (
              <>
                {tunggakan.items?.map((item: any, i: number) => (
                  <div key={i} className="grid grid-cols-12 gap-4 px-5 py-4 hover:bg-rose-50/30 transition-colors items-center text-sm group">
                    <div className="col-span-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-sm shrink-0 border border-rose-200">
                        {item.studentName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 group-hover:text-rose-700 transition-colors">{item.studentName}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{item.invoiceNumber}</p>
                      </div>
                    </div>
                    
                    <div className="col-span-3">
                      <p className="text-sm text-gray-700 font-medium">{item.feeType}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Jatuh Tempo: {new Date(item.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                    </div>

                    <div className="col-span-3 text-right">
                      <p className="text-sm font-bold text-rose-600">{formatRupiah(BigInt(item.outstanding))}</p>
                    </div>

                    <div className="col-span-2 text-right">
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-rose-100 text-rose-700 text-xs font-semibold">
                        Telat {item.daysOverdue} hari
                      </span>
                    </div>
                  </div>
                ))}
                {(!tunggakan.items || tunggakan.items.length === 0) && (
                  <div className="p-12 text-center text-gray-500 flex flex-col items-center justify-center">
                    <Users className="w-8 h-8 text-emerald-300 mb-3" />
                    <p className="text-sm font-medium text-emerald-700">Alhamdulillah, tidak ada tunggakan jatuh tempo.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
