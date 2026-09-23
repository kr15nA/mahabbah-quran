export const dynamic = 'force-dynamic'

import { requireAuth } from '@/lib/auth/rbac'
import { getMyEnrollmentHistory, getMyTeacherHistory } from '@/lib/student-portal/queries'
import { BookOpen, Users, GraduationCap, Calendar } from 'lucide-react'

export default async function SantriAkademikPage() {
  const { session } = await requireAuth()
  const enrollments = await getMyEnrollmentHistory(session.userId)
  const teachers = await getMyTeacherHistory(session.userId)

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Akademik</h1>
        <p className="text-sm text-gray-500 mt-1">Riwayat penempatan kelas dan pembimbing.</p>
      </div>

      <div className="space-y-6">
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
            <Users className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-gray-900">Riwayat Pembimbing</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {teachers.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">
                Belum ada data pembimbing.
              </div>
            ) : (
              teachers.map((teacher) => (
                <div key={teacher.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <UserIcon className="w-5 h-5 text-blue-700" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{teacher.teacherName}</p>
                      <p className="text-sm text-gray-500">{teacher.programName} - {teacher.className}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{teacher.academicYearName}</span>
                    {teacher.isActive && teacher.status === 'ACTIVE' && (
                      <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Aktif</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
            <GraduationCap className="w-5 h-5 text-indigo-600" />
            <h2 className="font-bold text-gray-900">Riwayat Penempatan Kelas</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {enrollments.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">
                Belum ada riwayat penempatan kelas.
              </div>
            ) : (
              enrollments.map((enrollment) => (
                <div key={enrollment.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-gray-900">{enrollment.academicYearName}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {enrollment.programName} • Kelas {enrollment.className}
                    </p>
                  </div>
                  <div>
                    {enrollment.isActive ? (
                      <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Tahun Ajaran Aktif</span>
                    ) : (
                      <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">Selesai</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function UserIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}
