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
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#18085A] to-[#4B21A2] p-4 text-white flex items-center gap-4">
        {child.student_photo ? (
          <div className="w-14 h-14 rounded-full border-2 border-white overflow-hidden relative flex-shrink-0">
            <Image src={child.student_photo} alt={child.student_name} fill className="object-cover" />
          </div>
        ) : (
          <div className="w-14 h-14 rounded-full bg-[#FBBF24] text-[#18085A] font-bold text-base flex items-center justify-center border-2 border-white flex-shrink-0">
            {getInitials(child.student_name)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="font-extrabold text-base text-white truncate">{child.student_name}</h2>
          <p className="text-xs text-gray-300 truncate">
            {child.class_name || 'Tanpa Kelas'} {child.program_name ? `· ${child.program_name}` : ''}
          </p>
          {child.teacher_name && (
            <p className="text-[11px] text-[#FBBF24] font-semibold mt-1 truncate">Guru: {child.teacher_name}</p>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4 flex-1">
        {/* Attendance */}
        <section>
          <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5 mb-2">
            <Calendar className="w-3.5 h-3.5 text-[#4B21A2]" /> Kehadiran Bulan Ini
          </h3>
          {!attendance.available ? (
            <p className="text-xs text-red-500 italic">Data absensi sementara tidak tersedia</p>
          ) : !attendance.hasData ? (
            <p className="text-xs text-gray-500 italic">Belum ada data absensi bulan ini</p>
          ) : (
            <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-around text-center border border-gray-100">
              <div>
                <div className="text-sm font-extrabold text-[#16A34A]">{attendance.hadir}</div>
                <div className="text-[10px] font-medium text-gray-500">Hadir</div>
              </div>
              <div className="w-px h-6 bg-gray-200" />
              <div>
                <div className="text-sm font-extrabold text-blue-600">{attendance.izin}</div>
                <div className="text-[10px] font-medium text-gray-500">Izin</div>
              </div>
              <div className="w-px h-6 bg-gray-200" />
              <div>
                <div className="text-sm font-extrabold text-amber-500">{attendance.sakit}</div>
                <div className="text-[10px] font-medium text-gray-500">Sakit</div>
              </div>
              <div className="w-px h-6 bg-gray-200" />
              <div>
                <div className="text-sm font-extrabold text-red-600">{attendance.alfa}</div>
                <div className="text-[10px] font-medium text-gray-500">Alfa</div>
              </div>
            </div>
          )}
        </section>

        {/* Hafalan & Tahsin Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <section>
            <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5 mb-2">
              <BookOpen className="w-3.5 h-3.5 text-[#4B21A2]" /> Setoran Terakhir
            </h3>
            {!hafalan.available ? (
              <p className="text-xs text-red-500 italic">Data hafalan sementara tidak tersedia</p>
            ) : !hafalan.record ? (
              <p className="text-xs text-gray-500 italic">Belum ada data hafalan</p>
            ) : (
              <div className="bg-[#F0EDF9] p-3 rounded-xl">
                <div className="font-bold text-sm text-[#4B21A2] truncate">
                  QS. {hafalan.record.surahName}
                </div>
                <div className="text-xs text-gray-700 mt-0.5">Ayat {hafalan.record.startAyah} – {hafalan.record.endAyah}</div>
                <div className="text-[10px] text-gray-500 mt-1.5 flex justify-between items-center">
                  <span>{formatDate(hafalan.record.date)}</span>
                  {hafalan.record.score !== null && (
                    <span className="font-bold text-[#18085A] bg-white px-1.5 py-0.5 rounded shadow-sm">
                      Nilai: {hafalan.record.score}
                    </span>
                  )}
                </div>
              </div>
            )}
          </section>

          <section>
            <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#4B21A2]" /> Tahsin Terakhir
            </h3>
            {!tahsin.available ? (
              <p className="text-xs text-red-500 italic">Data tahsin sementara tidak tersedia</p>
            ) : !tahsin.record ? (
              <p className="text-xs text-gray-500 italic">Belum ada data tahsin</p>
            ) : (
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div className="text-sm font-bold text-gray-900">{formatDate(tahsin.record.date)}</div>
                <div className="text-[10px] text-gray-500 mt-1 flex gap-2">
                  {tahsin.record.makhrajScore !== null && <span>Makhraj: {tahsin.record.makhrajScore}</span>}
                  {tahsin.record.tajwidScore !== null && <span>Tajwid: {tahsin.record.tajwidScore}</span>}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Report Preview */}
        <section>
          <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5 mb-2">
            <FileText className="w-3.5 h-3.5 text-[#4B21A2]" /> Laporan Terbaru
          </h3>
          {!report.available ? (
            <p className="text-xs text-red-500 italic">Data laporan sementara tidak tersedia</p>
          ) : !report.record ? (
            <p className="text-xs text-gray-500 italic">Belum ada laporan terbaru</p>
          ) : (
            <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-amber-900">
                  {report.record.title || `Laporan ${formatDate(report.record.date)}`}
                </div>
                <div className="text-[10px] text-amber-700">{formatDate(report.record.date)}</div>
              </div>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded-full">
                FINAL
              </span>
            </div>
          )}
        </section>
      </div>

      {/* Actions */}
      <div className="p-4 pt-0 mt-auto flex flex-col sm:flex-row gap-2">
        <Link
          href={buildParentChildHref('/orang-tua/absensi', child.student_id)}
          className="flex-1 py-2.5 bg-white border border-gray-300 text-gray-700 text-xs font-bold rounded-xl flex items-center justify-center hover:bg-gray-50 transition-colors"
        >
          Lihat Absensi
        </Link>
        {report.available && report.record && (
          <Link
            href={`/orang-tua/laporan/${report.record.id}`}
            className="flex-1 py-2.5 bg-[#4B21A2] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 hover:bg-[#3a1880] transition-colors"
          >
            Lihat Laporan <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>
    </div>
  )
}
