'use client'

import Link from 'next/link'
import { Sparkles, Calendar, BookOpen, Award, CheckCircle2, ChevronRight } from 'lucide-react'
import ProgressRing from '@/components/ui/ProgressRing'

export default function ParentBerandaPage() {
  return (
    <div className="space-y-4">
      {/* Child Header Card */}
      <div className="bg-gradient-to-r from-[#18085A] to-[#4B21A2] p-4 rounded-2xl text-white shadow-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#FBBF24] text-[#18085A] font-bold text-sm flex items-center justify-center border-2 border-white">
            AZ
          </div>
          <div>
            <h2 className="font-extrabold text-sm text-white">Ahmad Zaki Ramadhan</h2>
            <p className="text-[11px] text-gray-300">Kelompok A · Tahfizh Juz 30</p>
            <p className="text-[10px] text-[#FBBF24] font-semibold mt-0.5">Guru: Ustadz Aldi Solihin</p>
          </div>
        </div>
        <ProgressRing pct={75} size={48} />
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-white p-3 rounded-xl border border-gray-200 text-center shadow-sm">
          <div className="text-base font-extrabold text-[#4B21A2]">75%</div>
          <div className="text-[10px] text-gray-500 font-medium">Hafalan Juz 30</div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-gray-200 text-center shadow-sm">
          <div className="text-base font-extrabold text-[#16A34A]">92%</div>
          <div className="text-[10px] text-gray-500 font-medium">Presensi</div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-gray-200 text-center shadow-sm">
          <div className="text-base font-extrabold text-amber-500">88 / 100</div>
          <div className="text-[10px] text-gray-500 font-medium">Nilai Rata</div>
        </div>
      </div>

      {/* Latest Report Card */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-2.5">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900">
            <Sparkles className="w-4 h-4 text-[#FBBF24]" /> Laporan Hari Ini (4 Sep 2026)
          </div>
          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded-full">
            BARU
          </span>
        </div>

        <div className="p-3 bg-[#F0EDF9] rounded-xl text-xs space-y-1.5">
          <div className="font-bold text-[#4B21A2] text-xs">Setoran: QS. An-Naba 1-10</div>
          <p className="text-gray-700 text-[11px] leading-relaxed">
            "Alhamdulillah, Ahmad menunjukkan perkembangan yang baik dalam hafalan. Setoran QS. An-Naba ayat 1-10 dinilai 88/100."
          </p>
        </div>

        <div className="p-3 bg-amber-50 rounded-xl text-xs space-y-1">
          <span className="font-bold text-amber-900 text-[10px]">Saran Pendampingan Orang Tua:</span>
          <p className="text-amber-800 text-[11px] leading-relaxed">
            "Latihan ghunnah dan muraja'ah minimal 10 menit setiap hari."
          </p>
        </div>

        <Link
          href="/orang-tua/laporan/1"
          className="w-full py-2.5 bg-[#4B21A2] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 hover:bg-[#3a1880]"
        >
          Lihat Laporan Selengkapnya <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}
