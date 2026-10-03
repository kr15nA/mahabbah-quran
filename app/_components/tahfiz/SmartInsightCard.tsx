'use client'

import { AlertCircle, Target, TrendingUp, CalendarDays, BrainCircuit } from 'lucide-react'
import type { NextFocusRange, ActivitySummary, MurajaahRecency } from '@/lib/tahfiz/smart'

export type SmartInsightData = {
  hasActiveTarget: boolean
  remainingAyahs: number
  nextFocus?: NextFocusRange
  activity30d: ActivitySummary
  murajaahRecency: MurajaahRecency
  isStalled?: boolean
}

type Props = {
  title: string
  data: SmartInsightData
  showNextFocus?: boolean
  showStalled?: boolean
}

export default function SmartInsightCard({ title, data, showNextFocus = false, showStalled = false }: Props) {
  if (!data.hasActiveTarget && data.activity30d.hafalanBaru === 0 && data.activity30d.murajaah === 0) {
    return (
      <div className="bg-white rounded-lg border shadow-sm p-5">
        <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
          <BrainCircuit className="h-5 w-5 text-indigo-500" />
          {title}
        </h3>
        <p className="text-gray-500 text-sm">Belum cukup data untuk menampilkan insight ini.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm p-5 space-y-4">
      <h3 className="font-semibold text-lg flex items-center gap-2">
        <BrainCircuit className="h-5 w-5 text-indigo-500" />
        {title}
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        {/* Next Focus (Santri/Guru) */}
        {showNextFocus && data.hasActiveTarget && (
          <div className="bg-indigo-50 p-4 rounded-md border border-indigo-100">
            <p className="text-indigo-800 text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">
              <Target className="h-3 w-3" /> Fokus Berikutnya
            </p>
            {data.nextFocus ? (
              <>
                <p className="font-medium text-indigo-900">
                  {data.nextFocus.surahNameLatin} {data.nextFocus.ayahStart}-{data.nextFocus.ayahEnd}
                </p>
                <p className="text-xs text-indigo-700 mt-1 opacity-80">
                  Bagian ini belum tercakup dalam target aktif.
                </p>
              </>
            ) : (
              <p className="text-sm text-indigo-900">Target aktif telah tercakup sepenuhnya.</p>
            )}
          </div>
        )}

        {/* Target Remaining */}
        {data.hasActiveTarget && (
          <div className="bg-emerald-50 p-4 rounded-md border border-emerald-100">
            <p className="text-emerald-800 text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Sisa Target
            </p>
            {data.remainingAyahs > 0 ? (
              <p className="font-medium text-emerald-900">{data.remainingAyahs} ayat belum dihafal</p>
            ) : (
              <p className="font-medium text-emerald-900">Target selesai (0 ayat tersisa)</p>
            )}
          </div>
        )}

        {/* Activity 30D */}
        <div className="bg-slate-50 p-4 rounded-md border border-slate-100">
          <p className="text-slate-800 text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">
            <CalendarDays className="h-3 w-3" /> 30 Hari Terakhir
          </p>
          <div className="flex gap-4">
            <div>
              <p className="font-medium text-slate-900">{data.activity30d.hafalanBaru}</p>
              <p className="text-xs text-slate-500">Hafalan Baru</p>
            </div>
            <div>
              <p className="font-medium text-slate-900">{data.activity30d.murajaah}</p>
              <p className="text-xs text-slate-500">Murajaah</p>
            </div>
          </div>
        </div>

        {/* Murajaah Recency */}
        <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
          <p className="text-blue-800 text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> Riwayat Murajaah
          </p>
          {data.murajaahRecency.status === 'HAS_MURAJAAH' ? (
            <p className="font-medium text-blue-900">
              Murajaah terakhir {data.murajaahRecency.daysSinceLast === 0 ? 'hari ini' : `${data.murajaahRecency.daysSinceLast} hari lalu`}.
            </p>
          ) : (
            <p className="text-sm text-blue-900">Belum ada catatan Murajaah untuk target ini.</p>
          )}
        </div>

        {/* Stalled Target (Guru Only) */}
        {showStalled && data.hasActiveTarget && data.isStalled && (
          <div className="bg-amber-50 p-4 rounded-md border border-amber-200 sm:col-span-2">
            <p className="text-amber-800 text-xs font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> Perlu Diperhatikan
            </p>
            <p className="text-sm text-amber-900">
              Belum ada aktivitas terkait target (Hafalan Baru / Murajaah) selama 14 hari terakhir.
            </p>
          </div>
        )}

      </div>
    </div>
  )
}
