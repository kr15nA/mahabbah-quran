export const dynamic = 'force-dynamic'

import { requireAuth } from '@/lib/auth/rbac'
import { getMyAcademicProfile, getMyCurrentTeachers, getMyScholarships } from '@/lib/student-portal/queries'
import { getMyAttendanceSummary } from '@/lib/student-portal/attendance'
import { getMyLatestHafalan } from '@/lib/student-portal/hafalan'
import { getMyLatestTahsin } from '@/lib/student-portal/tahsin'
import { getMyLatestTasmi } from '@/lib/student-portal/tasmi'
import { Sparkles, Users, BookOpen, GraduationCap, Calendar, Bookmark, Star, Mic, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default async function SantriDashboard() {
  const { session } = await requireAuth()
  
  // self-scoped queries taking userId
  const profile = await getMyAcademicProfile(session.userId)
  const teachers = await getMyCurrentTeachers(session.userId)
  const scholarships = await getMyScholarships(session.userId)

  const currentMonth = new Date().toISOString().substring(0, 7)
  const attendance = await getMyAttendanceSummary(session.userId, currentMonth)
  const latestHafalan = await getMyLatestHafalan(session.userId)
  const latestTahsin = await getMyLatestTahsin(session.userId)
  const latestTasmi = await getMyLatestTasmi(session.userId)

  // Derive active scholarship
  const activeScholarship = scholarships.find(s => {
    if (!s.startDate) return false
    const now = new Date()
    const start = new Date(s.startDate)
    if (now < start) return false
    if (s.endDate && now > new Date(s.endDate)) return false
    return true
  })

  // Format scholarship benefit
  const formatBenefit = (s: any) => {
    if (s.calculationType === 'FULL') return 'Beasiswa Penuh (100%)'
    if (s.calculationType === 'PERCENTAGE') return `Diskon Biaya ${s.percentageBasisPoints! / 100}%`
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(BigInt(s.fixedAmount || 0))
  }

  // Active teacher summary
  const activeTeacher = teachers.find(t => t.isActive && t.status === 'ACTIVE')

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Assalamu'alaikum, {profile?.fullName.split(' ')[0] || session.fullName.split(' ')[0]}
        </h1>
        <p className="text-sm text-gray-500 mt-1">Selamat datang di Portal Santri Mahabbah Qur'an</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Identity Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100">
              <GraduationCap className="w-5 h-5 text-amber-600" />
              <h2 className="text-lg font-bold">Identitas Santri</h2>
            </div>
            {profile ? (
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-gray-500">Nama Lengkap</p>
                  <p className="font-medium text-gray-900">{profile.fullName}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-500">Program</p>
                    <p className="font-medium text-gray-900">{profile.activeEnrollment?.programName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Kelas</p>
                    <p className="font-medium text-gray-900">{profile.activeEnrollment?.className || '-'}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">Data profil tidak tersedia.</p>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
            <span className="text-xs font-medium text-gray-500">Status</span>
            {profile?.status === 'active' ? (
              <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Aktif</span>
            ) : (
              <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">{profile?.status || 'Tidak Aktif'}</span>
            )}
          </div>
        </div>

        {/* Teacher & Scholarship Summary */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold">Pembimbing Saat Ini</h2>
            </div>
            {activeTeacher ? (
              <div>
                <p className="font-medium text-gray-900">{activeTeacher.teacherName}</p>
                <p className="text-sm text-gray-500">{activeTeacher.programName} - {activeTeacher.className}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">Belum ada pembimbing yang ditugaskan pada tahun ajaran ini.</p>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-[#4B21A2]" />
              <h2 className="text-lg font-bold">Beasiswa Aktif</h2>
            </div>
            {activeScholarship ? (
              <div>
                <h3 className="font-bold text-gray-900">{activeScholarship.programName}</h3>
                <p className="text-sm font-medium text-[#4B21A2] mt-1">{formatBenefit(activeScholarship)}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">Tidak ada beasiswa aktif.</p>
            )}
          </div>
        </div>
      </div>

      {/* Academic Summaries D2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Kehadiran */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-5 h-5 text-indigo-500" />
              <h3 className="font-semibold text-gray-900">Kehadiran</h3>
            </div>
            <p className="text-xs text-gray-500 mb-2">Bulan Ini</p>
            <div className="flex gap-2">
              <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">{attendance.hadir} Hadir</span>
              <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">{attendance.izin} Izin</span>
            </div>
          </div>
          <Link href="/santri/kehadiran" className="mt-4 text-sm font-medium text-indigo-600 flex items-center gap-1 hover:text-indigo-700">
            Lihat detail <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Hafalan */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Bookmark className="w-5 h-5 text-emerald-500" />
              <h3 className="font-semibold text-gray-900">Hafalan Terakhir</h3>
            </div>
            {latestHafalan ? (
              <div>
                <p className="font-medium text-gray-900">{latestHafalan.surah_name_latin}</p>
                <p className="text-sm text-gray-500">Ayat {latestHafalan.ayah_start}-{latestHafalan.ayah_end}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">Belum ada catatan hafalan</p>
            )}
          </div>
          <Link href="/santri/hafalan" className="mt-4 text-sm font-medium text-emerald-600 flex items-center gap-1 hover:text-emerald-700">
            Lihat riwayat <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Tahsin */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold text-gray-900">Tahsin Terakhir</h3>
            </div>
            {latestTahsin ? (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-gray-500">Makhraj:</span> <span className="font-medium">{latestTahsin.makhraj_score || '-'}</span></div>
                <div><span className="text-gray-500">Tajwid:</span> <span className="font-medium">{latestTahsin.tajwid_score || '-'}</span></div>
                <div><span className="text-gray-500">Lancar:</span> <span className="font-medium">{latestTahsin.kelancaran_score || '-'}</span></div>
                <div><span className="text-gray-500">Ghunnah:</span> <span className="font-medium">{latestTahsin.ghunnah_score || '-'}</span></div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">Belum ada catatan tahsin</p>
            )}
          </div>
          <Link href="/santri/tahsin" className="mt-4 text-sm font-medium text-amber-600 flex items-center gap-1 hover:text-amber-700">
            Lihat riwayat <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Tasmi */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Mic className="w-5 h-5 text-rose-500" />
              <h3 className="font-semibold text-gray-900">Tasmi Terakhir</h3>
            </div>
            {latestTasmi ? (
              <div>
                <p className="font-medium text-gray-900">
                  {latestTasmi.mode === 'SURAH' ? latestTasmi.surahNameLatin : `Juz ${latestTasmi.startJuz}-${latestTasmi.endJuz}`}
                </p>
                <p className={`text-xs font-medium mt-1 ${latestTasmi.status === 'PASSED' ? 'text-green-600' : 'text-orange-600'}`}>
                  {latestTasmi.status === 'PASSED' ? 'Lulus' : 'Perlu Ditinjau'}
                </p>
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">Belum ada riwayat tasmi</p>
            )}
          </div>
          <Link href="/santri/tasmi" className="mt-4 text-sm font-medium text-rose-600 flex items-center gap-1 hover:text-rose-700">
            Lihat riwayat <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
