import { Star, Download, Share2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { getLearningReportById } from '@/lib/db/queries/learning-reports'
import { requireReportAccess } from '@/lib/auth/rbac'
import { notFound } from 'next/navigation'

function formatDate(dateStr: string | Date) {
  return new Date(dateStr).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function ParentReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const reportId = Number(resolvedParams.id)
  if (isNaN(reportId)) notFound()

  try {
    await requireReportAccess(reportId)
  } catch (error) {
    notFound()
  }

  const report = await getLearningReportById(reportId)
  if (!report) notFound()

  const hafalanTypeMap: Record<string, string> = {
    'hafalan_baru': 'Hafalan Baru',
    'muraja_ah': "Muraja'ah"
  }

  const isHafalan = report.hafalan_record_id != null
  const isTahsin = report.tahsin_record_id != null

  return (
    <div className="space-y-4 pb-20">
      <Link href="/orang-tua/laporan" className="inline-flex items-center gap-1 text-xs text-[#4B21A2] font-semibold">
        <ArrowLeft className="w-4 h-4" /> Kembali ke Riwayat
      </Link>

      {/* Header */}
      <div className="bg-[#18085A] p-4 rounded-2xl text-white space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-[#FBBF24] font-bold">LAPORAN PEMBELAJARAN HARIAN</span>
          <span className={`px-2 py-0.5 text-white font-bold text-[9px] rounded-full uppercase ${
            report.attendance_status === 'hadir' ? 'bg-emerald-500' :
            report.attendance_status === 'izin' ? 'bg-blue-500' :
            report.attendance_status === 'sakit' ? 'bg-amber-500' : 'bg-red-500'
          }`}>
            {report.attendance_status}
          </span>
        </div>
        <h2 className="font-extrabold text-base text-white">{report.student_name}</h2>
        <p className="text-xs text-gray-300">
          {formatDate(report.report_date)} {report.teacher_name ? `· ${report.teacher_name}` : ''}
        </p>
      </div>

      {/* Hafalan Section */}
      {isHafalan && (
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-2">
          <h4 className="font-bold text-gray-900 text-xs text-[#4B21A2]">Hafalan Al-Qur'an</h4>
          <div className="p-3 bg-[#F0EDF9] rounded-xl flex justify-between items-center text-xs">
            <div>
              <div className="font-bold text-gray-900">QS. {report.surah_name_latin} (Ayat {report.ayah_start}-{report.ayah_end})</div>
              <div className="text-[10px] text-gray-500 font-medium">
                {report.hafalan_type ? hafalanTypeMap[report.hafalan_type] : 'Hafalan'}
              </div>
            </div>
            {report.hafalan_score != null && (
              <div className="text-right">
                <div className="font-extrabold text-[#4B21A2] text-sm">{report.hafalan_score} / 100</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tahsin Section */}
      {isTahsin && (
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-2">
          <h4 className="font-bold text-gray-900 text-xs text-[#4B21A2]">Evaluasi Tahsin & Tajwid</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {report.makhraj_score != null && (
              <div className="flex justify-between p-2 bg-[#FAFAFA] rounded-xl border">
                <span className="text-gray-600 font-medium">Makhraj</span>
                <span className="font-bold text-[#4B21A2] flex items-center gap-0.5">{report.makhraj_score} <Star className="w-3 h-3 fill-amber-400 text-amber-400" /></span>
              </div>
            )}
            {report.tajwid_score != null && (
              <div className="flex justify-between p-2 bg-[#FAFAFA] rounded-xl border">
                <span className="text-gray-600 font-medium">Tajwid</span>
                <span className="font-bold text-[#4B21A2] flex items-center gap-0.5">{report.tajwid_score} <Star className="w-3 h-3 fill-amber-400 text-amber-400" /></span>
              </div>
            )}
            {report.kelancaran_score != null && (
              <div className="flex justify-between p-2 bg-[#FAFAFA] rounded-xl border">
                <span className="text-gray-600 font-medium">Kelancaran</span>
                <span className="font-bold text-[#4B21A2] flex items-center gap-0.5">{report.kelancaran_score} <Star className="w-3 h-3 fill-amber-400 text-amber-400" /></span>
              </div>
            )}
            {report.ghunnah_score != null && (
              <div className="flex justify-between p-2 bg-[#FAFAFA] rounded-xl border">
                <span className="text-gray-600 font-medium">Ghunnah</span>
                <span className="font-bold text-[#4B21A2] flex items-center gap-0.5">{report.ghunnah_score} <Star className="w-3 h-3 fill-amber-400 text-amber-400" /></span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Teacher Notes & AI Advice */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3 text-xs">
        <div>
          <h4 className="font-bold text-gray-900 text-xs mb-1">Catatan Guru Tahfizh:</h4>
          <p className="text-gray-700 bg-gray-50 p-2.5 rounded-xl leading-relaxed whitespace-pre-wrap">
            {report.ai_report_text || report.teacher_notes || 'Tidak ada catatan.'}
          </p>
        </div>

        {report.ai_parent_advice && (
          <div>
            <h4 className="font-bold text-amber-900 text-xs mb-1">Saran Pendampingan Orang Tua:</h4>
            <p className="text-amber-900 bg-amber-50 p-2.5 rounded-xl leading-relaxed whitespace-pre-wrap">
              {report.ai_parent_advice}
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="pt-1">
        <a href={`/api/learning-reports/${report.id}/pdf`} target="_blank" rel="noopener noreferrer" className="w-full py-2.5 bg-[#4B21A2] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm">
          <Download className="w-4 h-4" /> Download PDF
        </a>
      </div>
    </div>
  )
}
