import { Star, Download } from 'lucide-react'
import { getLearningReportById } from '@/lib/db/queries/learning-reports'
import { validateShareToken } from '@/lib/auth/share-token'
import { notFound } from 'next/navigation'

function formatDate(dateStr: string | Date) {
  return new Date(dateStr).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function SharedReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!token) notFound()

  const share = await validateShareToken(token)
  if (!share) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border text-center max-w-sm w-full space-y-3">
          <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </div>
          <h2 className="font-bold text-gray-900">Tautan Tidak Berlaku</h2>
          <p className="text-sm text-gray-500">
            Tautan laporan ini tidak valid, sudah kadaluarsa, atau telah dicabut aksesnya oleh pihak sekolah.
          </p>
        </div>
      </div>
    )
  }

  const report = await getLearningReportById(share.reportId)
  if (!report) notFound()

  const hafalanTypeMap: Record<string, string> = {
    'hafalan_baru': 'Hafalan Baru',
    'muraja_ah': "Muraja'ah"
  }

  const isHafalan = report.hafalan_record_id != null
  const isTahsin = report.tahsin_record_id != null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto p-4 space-y-4 pb-20">
        <div className="text-center py-4">
          <h1 className="font-extrabold text-[#4B21A2] text-xl">Mahabbah Qur'an</h1>
          <p className="text-xs text-gray-500 font-medium tracking-wide">Laporan Perkembangan Santri</p>
        </div>

        {/* Header */}
        <div className="bg-[#18085A] p-4 rounded-2xl text-white space-y-2 shadow-sm">
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
        <div className="pt-2">
          <a href={`/api/share/${token}/pdf`} target="_blank" rel="noopener noreferrer" className="py-3 bg-[#4B21A2] text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm w-full hover:bg-[#3A1882] transition-colors">
            <Download className="w-5 h-5" /> Download PDF
          </a>
        </div>
      </div>
    </div>
  )
}
