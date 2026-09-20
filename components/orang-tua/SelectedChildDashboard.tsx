import Link from 'next/link'
import { Sparkles, Calendar, BookOpen, ChevronRight, FileText } from 'lucide-react'
import { FamilyChildDashboardDTO } from '@/lib/guardians/family-dashboard'
import { buildParentChildHref } from '@/lib/guardians/parent-context'
import { ProfileAvatar } from '@/components/ui/ProfileAvatar'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function SelectedChildDashboard({ child }: { child: FamilyChildDashboardDTO }) {
  const { attendance, hafalan, tahsin, report } = child

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col w-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#18085A] to-[#4B21A2] p-5 sm:p-6 text-white flex items-start sm:items-center gap-5 rounded-t-2xl">
        <ProfileAvatar 
          src={child.student_photo} 
          name={child.student_name} 
          size={80} 
          className="border-[3px] border-white flex-shrink-0 shadow-sm mt-1 sm:mt-0 bg-[#FBBF24] text-[#18085A] font-bold text-xl"
        />
        <div className="min-w-0 flex-1">
          <h2 className="font-extrabold text-lg sm:text-xl text-white break-words leading-tight">{child.student_name}</h2>
          <p className="text-sm text-gray-300 break-words leading-relaxed mt-1.5">
            {child.class_name || 'Tanpa Kelas'} {child.program_name ? `· ${child.program_name}` : ''}
          </p>
          {child.teacher_name && (
            <p className="text-xs text-[#FBBF24] font-semibold mt-2 break-words">Guru: {child.teacher_name}</p>
          )}
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-8 flex-1">
        {/* Attendance */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#4B21A2]" /> Kehadiran Bulan Ini
            </h3>
            <Link
              href={buildParentChildHref('/orang-tua/absensi', child.student_id)}
              className="text-xs font-bold text-[#4B21A2] hover:text-[#3a1880] flex items-center gap-0.5"
            >
              Lihat Riwayat <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          
          {!attendance.available ? (
            <p className="text-sm text-red-500 italic bg-red-50 p-4 rounded-xl border border-red-100">Data absensi sementara tidak tersedia</p>
          ) : !attendance.hasData ? (
            <p className="text-sm text-gray-500 italic bg-gray-50 p-4 rounded-xl border border-gray-100">Belum ada data absensi bulan ini</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex flex-col items-center justify-center text-center">
                <div className="text-2xl font-extrabold text-[#16A34A]">{attendance.hadir}</div>
                <div className="text-xs font-semibold text-gray-500 mt-1">Hadir</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex flex-col items-center justify-center text-center">
                <div className="text-2xl font-extrabold text-blue-600">{attendance.izin}</div>
                <div className="text-xs font-semibold text-gray-500 mt-1">Izin</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex flex-col items-center justify-center text-center">
                <div className="text-2xl font-extrabold text-amber-500">{attendance.sakit}</div>
                <div className="text-xs font-semibold text-gray-500 mt-1">Sakit</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex flex-col items-center justify-center text-center">
                <div className="text-2xl font-extrabold text-red-600">{attendance.alfa}</div>
                <div className="text-xs font-semibold text-gray-500 mt-1">Alfa</div>
              </div>
            </div>
          )}
        </section>

        {/* Hafalan & Tahsin */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          <section>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-4">
              <BookOpen className="w-4 h-4 text-[#4B21A2]" /> Setoran Terakhir
            </h3>
            {!hafalan.available ? (
              <p className="text-sm text-red-500 italic bg-red-50 p-4 rounded-xl border border-red-100">Data hafalan sementara tidak tersedia</p>
            ) : !hafalan.record ? (
              <p className="text-sm text-gray-500 italic bg-gray-50 p-4 rounded-xl border border-gray-100">Belum ada data hafalan</p>
            ) : (
              <div className="bg-[#F0EDF9] p-4 sm:p-5 rounded-xl border border-[#E9E4F5] h-[calc(100%-2rem)] flex flex-col">
                <div className="font-bold text-base text-[#4B21A2] break-words">
                  QS. {hafalan.record.surahName}
                </div>
                <div className="text-sm text-gray-700 mt-1.5">Ayat {hafalan.record.startAyah} – {hafalan.record.endAyah}</div>
                <div className="text-xs text-gray-500 mt-auto pt-4 flex justify-between items-center flex-wrap gap-2">
                  <span>{formatDate(hafalan.record.date)}</span>
                  {hafalan.record.score !== null && (
                    <span className="font-bold text-[#18085A] bg-white px-3 py-1.5 rounded-lg shadow-sm border border-gray-100">
                      Nilai: {hafalan.record.score}
                    </span>
                  )}
                </div>
              </div>
            )}
          </section>

          <section>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-[#4B21A2]" /> Tahsin Terakhir
            </h3>
            {!tahsin.available ? (
              <p className="text-sm text-red-500 italic bg-red-50 p-4 rounded-xl border border-red-100">Data tahsin sementara tidak tersedia</p>
            ) : !tahsin.record ? (
              <p className="text-sm text-gray-500 italic bg-gray-50 p-4 rounded-xl border border-gray-100">Belum ada data tahsin</p>
            ) : (
              <div className="bg-gray-50 p-4 sm:p-5 rounded-xl border border-gray-100 h-[calc(100%-2rem)] flex flex-col">
                <div className="text-sm font-bold text-gray-900 mb-3">{formatDate(tahsin.record.date)}</div>
                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm text-gray-600 mt-auto">
                  {tahsin.record.makhrajScore !== null && <div>Makhraj: <b className="text-gray-900">{tahsin.record.makhrajScore}</b></div>}
                  {tahsin.record.tajwidScore !== null && <div>Tajwid: <b className="text-gray-900">{tahsin.record.tajwidScore}</b></div>}
                  {tahsin.record.kelancaranScore !== null && <div>Kelancaran: <b className="text-gray-900">{tahsin.record.kelancaranScore}</b></div>}
                  {tahsin.record.ghunnahScore !== null && <div>Ghunnah: <b className="text-gray-900">{tahsin.record.ghunnahScore}</b></div>}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Beasiswa Preview */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#4B21A2]" /> Beasiswa
            </h3>
            <Link
              href={buildParentChildHref('/orang-tua/beasiswa', child.student_id)}
              className="text-xs font-bold text-[#4B21A2] hover:text-[#3a1880] flex items-center gap-0.5"
            >
              Lihat Detail <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          
          {!child.scholarship.available ? (
            <p className="text-sm text-red-500 italic bg-red-50 p-4 rounded-xl border border-red-100">Data beasiswa sementara tidak tersedia</p>
          ) : !child.scholarship.record ? (
            <p className="text-sm text-gray-500 italic bg-gray-50 p-4 rounded-xl border border-gray-100">Belum ada program beasiswa aktif</p>
          ) : (
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-4 sm:p-5 rounded-xl border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-base font-bold text-[#18085A] break-words leading-snug">
                  {child.scholarship.record.programName}
                </div>
                <div className="text-sm text-gray-700 mt-1.5 flex flex-col sm:flex-row gap-1 sm:gap-4">
                  <span className="font-semibold text-indigo-700">
                    {child.scholarship.record.calculationType === 'FULL' ? 'Penuh (100%)' :
                     child.scholarship.record.calculationType === 'PERCENTAGE' ? `Diskon ${child.scholarship.record.percentageBasisPoints! / 100}%` :
                     new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(BigInt(child.scholarship.record.fixedAmount || 0))}
                  </span>
                  <span className="hidden sm:inline text-gray-300">•</span>
                  <span>
                    Periode: {new Date(child.scholarship.record.startDate).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })} – {child.scholarship.record.endDate ? new Date(child.scholarship.record.endDate).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }) : 'Seterusnya'}
                  </span>
                </div>
              </div>
              <span className="px-3 py-1 bg-indigo-100 text-indigo-800 text-xs font-bold rounded-full whitespace-nowrap self-start sm:self-auto shadow-sm">
                AKTIF
              </span>
            </div>
          )}
        </section>

        {/* Report Preview */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#4B21A2]" /> Laporan Terbaru
            </h3>
            {report.available && report.record && (
              <Link
                href={`/orang-tua/laporan/${report.record.id}`}
                className="text-xs font-bold text-[#4B21A2] hover:text-[#3a1880] flex items-center gap-0.5"
              >
                Lihat Laporan <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
          
          {!report.available ? (
            <p className="text-sm text-red-500 italic bg-red-50 p-4 rounded-xl border border-red-100">Data laporan sementara tidak tersedia</p>
          ) : !report.record ? (
            <p className="text-sm text-gray-500 italic bg-gray-50 p-4 rounded-xl border border-gray-100">Belum ada laporan terbaru</p>
          ) : (
            <div className="bg-amber-50 p-4 sm:p-5 rounded-xl border border-amber-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-base font-bold text-amber-900 break-words leading-snug">
                  {report.record.title || `Laporan ${formatDate(report.record.date)}`}
                </div>
                <div className="text-sm text-amber-700 mt-1.5">{formatDate(report.record.date)}</div>
              </div>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full whitespace-nowrap self-start sm:self-auto shadow-sm">
                FINAL
              </span>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
