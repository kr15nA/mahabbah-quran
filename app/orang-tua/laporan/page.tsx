'use client'

import Link from 'next/link'
import { FileText, ChevronRight, CheckCircle2 } from 'lucide-react'

export default function ParentLaporanListPage() {
  const reports = [
    { id: 1, date: '4 Sep 2026', surah: 'An-Naba 1-10', score: 88, teacher: 'Ust. Aldi Solihin' },
    { id: 2, date: '3 Sep 2026', surah: 'An-Naba 11-20', score: 90, teacher: 'Ust. Aldi Solihin' },
    { id: 3, date: '2 Sep 2026', surah: "An-Nazi'at 1-10", score: 85, teacher: 'Ust. Aldi Solihin' },
    { id: 4, date: '1 Sep 2026', surah: 'An-Naba 1-10', score: 88, teacher: 'Ust. Aldi Solihin' },
  ]

  return (
    <div className="space-y-3">
      <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
        <h3 className="font-bold text-gray-900 text-xs">Riwayat Laporan Pembelajaran</h3>
        <span className="text-[10px] text-gray-400">Ahmad Zaki Ramadhan</span>
      </div>

      <div className="space-y-2.5">
        {reports.map((r) => (
          <Link
            key={r.id}
            href={`/orang-tua/laporan/${r.id}`}
            className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-center hover:border-[#4B21A2] transition-all block"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900 text-xs">QS. {r.surah}</span>
                <span className="px-2 py-0.2 bg-emerald-100 text-emerald-800 font-bold text-[9px] rounded-full">
                  Nilai: {r.score}
                </span>
              </div>
              <div className="text-[10px] text-gray-400">{r.date} · {r.teacher}</div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </Link>
        ))}
      </div>
    </div>
  )
}
