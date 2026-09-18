import { Calendar, CheckCircle2, Clock, AlertCircle, ChevronLeft, ChevronRight, User } from 'lucide-react'
import Link from 'next/link'
import { getSession } from '@/lib/auth/session'
import { resolveParentChildContext, studentIdToDbNumber } from '@/lib/guardians/parent-context'
import { getAttendanceSummaryByStudent, getAttendanceByStudentMonth } from '@/lib/db/queries/attendance'
import { redirect } from 'next/navigation'
import ChildSwitcher from '@/components/orang-tua/ChildSwitcher'

function formatDate(dateStr: string | Date) {
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getMonthName(monthStr: string) {
  const [year, month] = monthStr.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
}

export default async function ParentAbsensiPage({ searchParams }: { searchParams: Promise<{ child_id?: string; month?: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'orang_tua') {
    redirect('/login')
  }

  const resolvedParams = await searchParams
  const context = await resolveParentChildContext({
    userId: session.userId,
    requestedChildId: resolvedParams.child_id
  })

  if (context.status === 'NO_CHILDREN') {
    return (
      <div className="space-y-4 pb-20">
        <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="font-bold text-gray-900 mb-1">Belum Ada Data Anak</h3>
          <p className="text-sm text-gray-500">Anda belum dihubungkan dengan data santri.</p>
        </div>
      </div>
    )
  }

  if (context.status === 'CHILD_REQUIRED') {
    return (
      <div className="space-y-4 pb-20">
        <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="font-bold text-gray-900 mb-1">Pilih Santri</h3>
          <p className="text-sm text-gray-500 mb-4">Pilih santri untuk melihat riwayat absensi.</p>
          <div className="flex justify-center">
            <ChildSwitcher childrenData={context.children} activeChildId="" />
          </div>
        </div>
      </div>
    )
  }

  if (context.status === 'INVALID_CHILD') {
    return (
      <div className="space-y-4 pb-20">
        <div className="bg-red-50 p-4 rounded-2xl border border-red-200 text-center">
          <h3 className="font-bold text-red-900 mb-1">Data Tidak Valid</h3>
          <p className="text-sm text-red-700">Identitas santri tidak valid.</p>
        </div>
      </div>
    )
  }

  if (context.status === 'FORBIDDEN_CHILD') {
    return (
      <div className="space-y-4 pb-20">
        <div className="bg-red-50 p-4 rounded-2xl border border-red-200 text-center">
          <h3 className="font-bold text-red-900 mb-1">Akses Ditolak</h3>
          <p className="text-sm text-red-700">Santri ini tidak terhubung dengan akun Anda.</p>
        </div>
      </div>
    )
  }

  // context.status === 'AUTHORIZED'
  const { child, children, childId } = context

  // Determine active month
  const today = new Date()
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const month = resolvedParams.month && /^\d{4}-\d{2}$/.test(resolvedParams.month) ? resolvedParams.month : defaultMonth

  // Calculate prev/next month for pagination
  const [mYear, mMonth] = month.split('-').map(Number)
  const prevDate = new Date(mYear, mMonth - 2, 1)
  const nextDate = new Date(mYear, mMonth, 1)
  const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
  const nextMonthStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`

  // Fetch real attendance using DB numeric ID
  const dbStudentId = studentIdToDbNumber(childId)
  const [summary, history] = await Promise.all([
    getAttendanceSummaryByStudent(dbStudentId, month),
    getAttendanceByStudentMonth(dbStudentId, month)
  ])

  return (
    <div className="space-y-4 pb-20">
      <ChildSwitcher childrenData={children} activeChildId={childId} />

      {/* Month Filter */}
      <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
        <Link href={`?child_id=${childId}&month=${prevMonthStr}`} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div className="text-center">
          <h3 className="font-bold text-gray-900 text-xs">{getMonthName(month)}</h3>
          <p className="text-[10px] text-gray-500">{child.student_name}</p>
        </div>
        <Link href={`?child_id=${childId}&month=${nextMonthStr}`} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600">
          <ChevronRight className="w-5 h-5" />
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-2 text-center text-xs">
        <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl">
          <div className="font-extrabold text-emerald-700 text-base">{summary.hadir}</div>
          <div className="text-[10px] text-emerald-800 font-semibold">Hadir</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl">
          <div className="font-extrabold text-amber-700 text-base">{summary.izin}</div>
          <div className="text-[10px] text-amber-800 font-semibold">Izin</div>
        </div>
        <div className="bg-orange-50 border border-orange-200 p-2.5 rounded-xl">
          <div className="font-extrabold text-orange-700 text-base">{summary.sakit}</div>
          <div className="text-[10px] text-orange-800 font-semibold">Sakit</div>
        </div>
        <div className="bg-red-50 border border-red-200 p-2.5 rounded-xl">
          <div className="font-extrabold text-red-700 text-base">{summary.alfa}</div>
          <div className="text-[10px] text-red-800 font-semibold">Alfa</div>
        </div>
      </div>

      {/* History List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100 text-xs overflow-hidden">
        {history.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            Tidak ada catatan absensi untuk bulan ini.
          </div>
        ) : (
          history.map((record) => (
            <div key={record.id} className="p-3.5 flex justify-between items-center hover:bg-gray-50">
              <div>
                <span className="font-bold text-gray-900 block">{formatDate(record.attendance_date)}</span>
                {record.notes && <span className="text-[10px] text-gray-500 block mt-0.5">{record.notes}</span>}
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  record.status === 'hadir' ? 'bg-emerald-100 text-emerald-800' :
                  record.status === 'izin' ? 'bg-blue-100 text-blue-800' :
                  record.status === 'sakit' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                }`}
              >
                {record.status}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
