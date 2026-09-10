'use client'

import { Star, Download, Share2, CheckCircle2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function ParentReportDetailPage() {
  return (
    <div className="space-y-4">
      <Link href="/orang-tua/laporan" className="inline-flex items-center gap-1 text-xs text-[#4B21A2] font-semibold">
        <ArrowLeft className="w-4 h-4" /> Kembali ke Riwayat
      </Link>

      {/* Header */}
      <div className="bg-[#18085A] p-4 rounded-2xl text-white space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-[#FBBF24] font-bold">LAPORAN PEMBELAJARAN HARIAN</span>
          <span className="px-2 py-0.5 bg-emerald-500 text-white font-bold text-[9px] rounded-full">HADIR</span>
        </div>
        <h2 className="font-extrabold text-base text-white">Ahmad Zaki Ramadhan</h2>
        <p className="text-xs text-gray-300">Kamis, 4 September 2026 · Ustadz Aldi Solihin</p>
      </div>

      {/* Hafalan Section */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-2">
        <h4 className="font-bold text-gray-900 text-xs text-[#4B21A2]">Hafalan Al-Qur'an</h4>
        <div className="p-3 bg-[#F0EDF9] rounded-xl flex justify-between items-center text-xs">
          <div>
            <div className="font-bold text-gray-900">QS. An-Naba (Ayat 1-10)</div>
            <div className="text-[10px] text-gray-500 font-medium">Hafalan Baru</div>
          </div>
          <div className="text-right">
            <div className="font-extrabold text-[#4B21A2] text-sm">88 / 100</div>
            <div className="text-[9px] text-emerald-600 font-bold">Sangat Baik</div>
          </div>
        </div>
      </div>

      {/* Tahsin Section */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-2">
        <h4 className="font-bold text-gray-900 text-xs text-[#4B21A2]">Evaluasi Tahsin & Tajwid</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between p-2 bg-[#FAFAFA] rounded-xl border">
            <span className="text-gray-600 font-medium">Makhraj</span>
            <span className="font-bold text-[#4B21A2] flex items-center gap-0.5">4 <Star className="w-3 h-3 fill-amber-400 text-amber-400" /></span>
          </div>
          <div className="flex justify-between p-2 bg-[#FAFAFA] rounded-xl border">
            <span className="text-gray-600 font-medium">Tajwid</span>
            <span className="font-bold text-[#4B21A2] flex items-center gap-0.5">5 <Star className="w-3 h-3 fill-amber-400 text-amber-400" /></span>
          </div>
          <div className="flex justify-between p-2 bg-[#FAFAFA] rounded-xl border">
            <span className="text-gray-600 font-medium">Kelancaran</span>
            <span className="font-bold text-[#4B21A2] flex items-center gap-0.5">4 <Star className="w-3 h-3 fill-amber-400 text-amber-400" /></span>
          </div>
          <div className="flex justify-between p-2 bg-[#FAFAFA] rounded-xl border">
            <span className="text-gray-600 font-medium">Ghunnah</span>
            <span className="font-bold text-[#4B21A2] flex items-center gap-0.5">3 <Star className="w-3 h-3 fill-amber-400 text-amber-400" /></span>
          </div>
        </div>
      </div>

      {/* Teacher Notes & AI Advice */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3 text-xs">
        <div>
          <h4 className="font-bold text-gray-900 text-xs mb-1">Catatan Guru Tahfizh:</h4>
          <p className="text-gray-700 bg-gray-50 p-2.5 rounded-xl leading-relaxed">
            "Alhamdulillah, Ahmad menunjukkan perkembangan yang baik dalam hafalan Juz 30. Menyelesaikan QS. An-Naba ayat 1-10 dengan nilai 88/100. Bacaan masih perlu meningkatkan ketepatan ghunnah."
          </p>
        </div>

        <div>
          <h4 className="font-bold text-amber-900 text-xs mb-1">Saran Pendampingan Orang Tua:</h4>
          <p className="text-amber-900 bg-amber-50 p-2.5 rounded-xl leading-relaxed">
            "Mohon bantu Ahmad latihan ghunnah dan muraja'ah minimal 10 menit setiap hari setelah sholat Maghrib."
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button className="py-2.5 bg-[#4B21A2] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm">
          <Download className="w-4 h-4" /> Download PDF
        </button>
        <button className="py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm">
          <Share2 className="w-4 h-4" /> Bagikan Laporan
        </button>
      </div>
    </div>
  )
}
