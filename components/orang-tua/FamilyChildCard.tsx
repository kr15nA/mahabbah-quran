import Link from 'next/link'
import Image from 'next/image'
import { Sparkles, Calendar, BookOpen, User, ChevronRight, FileText } from 'lucide-react'
import { FamilyChildDashboardDTO } from '@/lib/guardians/family-dashboard'
import { buildParentChildHref } from '@/lib/guardians/parent-context'

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function FamilyChildCard({ child }: { child: FamilyChildDashboardDTO }) {
  const { attendance, hafalan, tahsin, report } = child

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col h-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#18085A] to-[#4B21A2] p-4 sm:p-5 text-white flex items-start sm:items-center gap-4 rounded-t-2xl">
        {child.student_photo ? (
          <div className="w-14 h-14 rounded-full border-2 border-white overflow-hidden relative flex-shrink-0 mt-1 sm:mt-0">
            <Image src={child.student_photo} alt={child.student_name} fill className="object-cover" />
          </div>
        ) : (
          <div className="w-14 h-14 rounded-full bg-[#FBBF24] text-[#18085A] font-bold text-base flex items-center justify-center border-2 border-white flex-shrink-0 mt-1 sm:mt-0">
            {getInitials(child.student_name)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="font-extrabold text-base text-white break-words leading-tight">{child.student_name}</h2>
          <p className="text-xs text-gray-300 break-words leading-relaxed mt-1">
            {child.class_name || 'Tanpa Kelas'} {child.program_name ? `· ${child.program_name}` : ''}
          </p>
          {child.teacher_name && (
            <p className="text-[11px] text-[#FBBF24] font-semibold mt-1.5 break-words">Guru: {child.teacher_name}</p>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-6 flex-1">
        {/* Attendance */}
        <section>
          <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5 mb-3">
            <Calendar className="w-3.5 h-3.5 text-[#4B21A2]" /> Kehadiran Bulan Ini
          </h3>
          {!attendance.available ? (
            <p className="text-xs text-red-500 italic bg-red-50 p-2.5 rounded-lg border border-red-100">Data absensi sementara tidak tersedia</p>
          ) : !attendance.hasData ? (
            <p className="text-xs text-gray-500 italic bg-gray-50 p-2.5 rounded-lg border border-gray-100">Belum ada data absensi bulan ini</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex flex-col items-center justify-center text-center">
                <div className="text-base font-extrabold text-[#16A34A]">{attendance.hadir}</div>
                <div className="text-[10px] font-medium text-gray-500 mt-0.5">Hadir</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex flex-col items-center justify-center text-center">
                <div className="text-base font-extrabold text-blue-600">{attendance.izin}</div>
                <div className="text-[10px] font-medium text-gray-500 mt-0.5">Izin</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex flex-col items-center justify-center text-center">
                <div className="text-base font-extrabold text-amber-500">{attendance.sakit}</div>
                <div className="text-[10px] font-medium text-gray-500 mt-0.5">Sakit</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex flex-col items-center justify-center text-center">
                <div className="text-base font-extrabold text-red-600">{attendance.alfa}</div>
                <div className="text-[10px] font-medium text-gray-500 mt-0.5">Alfa</div>
              </div>
            </div>
          )}
        </section>

        {/* Hafalan & Tahsin */}
        <div className="flex flex-col gap-6">
          <section>
            <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5 mb-3">
              <BookOpen className="w-3.5 h-3.5 text-[#4B21A2]" /> Setoran Terakhir
            </h3>
            {!hafalan.available ? (
              <p className="text-xs text-red-500 italic bg-red-50 p-2.5 rounded-lg border border-red-100">Data hafalan sementara tidak tersedia</p>
            ) : !hafalan.record ? (
              <p className="text-xs text-gray-500 italic bg-gray-50 p-2.5 rounded-lg border border-gray-100">Belum ada data hafalan</p>
            ) : (
              <div className="bg-[#F0EDF9] p-3.5 rounded-xl border border-[#E9E4F5]">
                <div className="font-bold text-sm text-[#4B21A2] break-words">
                  QS. {hafalan.record.surahName}
                </div>
                <div className="text-xs text-gray-700 mt-1">Ayat {hafalan.record.startAyah} – {hafalan.record.endAyah}</div>
                <div className="text-[11px] text-gray-500 mt-2.5 flex justify-between items-center flex-wrap gap-2">
                  <span>{formatDate(hafalan.record.date)}</span>
                  {hafalan.record.score !== null && (
                    <span className="font-bold text-[#18085A] bg-white px-2 py-1 rounded-md shadow-sm border border-gray-100">
                      Nilai: {hafalan.record.score}
                    </span>
                  )}
                </div>
              </div>
            )}
          </section>

          <section>
            <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-[#4B21A2]" /> Tahsin Terakhir
            </h3>
            {!tahsin.available ? (
              <p className="text-xs text-red-500 italic bg-red-50 p-2.5 rounded-lg border border-red-100">Data tahsin sementara tidak tersedia</p>
            ) : !tahsin.record ? (
              <p className="text-xs text-gray-500 italic bg-gray-50 p-2.5 rounded-lg border border-gray-100">Belum ada data tahsin</p>
            ) : (
              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                <div className="text-sm font-bold text-gray-900">{formatDate(tahsin.record.date)}</div>
                <div className="text-xs text-gray-600 mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
                  {tahsin.record.makhrajScore !== null && <span>Makhraj: <b>{tahsin.record.makhrajScore}</b></span>}
                  {tahsin.record.tajwidScore !== null && <span>Tajwid: <b>{tahsin.record.tajwidScore}</b></span>}
                  {tahsin.record.kelancaranScore !== null && <span>Kelancaran: <b>{tahsin.record.kelancaranScore}</b></span>}
                  {tahsin.record.ghunnahScore !== null && <span>Ghunnah: <b>{tahsin.record.ghunnahScore}</b></span>}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Report Preview */}
        <section>
          <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5 mb-3">
            <FileText className="w-3.5 h-3.5 text-[#4B21A2]" /> Laporan Terbaru
          </h3>
          {!report.available ? (
            <p className="text-xs text-red-500 italic bg-red-50 p-2.5 rounded-lg border border-red-100">Data laporan sementara tidak tersedia</p>
          ) : !report.record ? (
            <p className="text-xs text-gray-500 italic bg-gray-50 p-2.5 rounded-lg border border-gray-100">Belum ada laporan terbaru</p>
          ) : (
            <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-100 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-bold text-amber-900 break-words leading-snug">
                  {report.record.title || `Laporan ${formatDate(report.record.date)}`}
                </div>
                <div className="text-xs text-amber-700 mt-1.5">{formatDate(report.record.date)}</div>
              </div>
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full whitespace-nowrap self-start">
                FINAL
              </span>
            </div>
          )}
        </section>
      </div>

      {/* Actions */}
      <div className="p-4 sm:p-5 pt-0 mt-auto flex flex-col sm:flex-row gap-3">
        <Link
          href={buildParentChildHref('/orang-tua/absensi', child.student_id)}
          className="flex-1 py-3 bg-white border-2 border-gray-200 text-gray-700 text-sm font-bold rounded-xl flex items-center justify-center hover:bg-gray-50 transition-colors text-center px-3 shadow-sm"
        >
          Lihat Absensi
        </Link>
        {report.available && report.record && (
          <Link
            href={`/orang-tua/laporan/${report.record.id}`}
            className="flex-1 py-3 bg-[#4B21A2] text-white text-sm font-bold rounded-xl flex items-center justify-center gap-1 hover:bg-[#3a1880] transition-colors text-center px-3 shadow-sm"
          >
            Lihat Laporan <ChevronRight className="w-4 h-4 flex-shrink-0" />
          </Link>
        )}
      </div>
    </div>
  )
}
