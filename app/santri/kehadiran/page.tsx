export const dynamic = 'force-dynamic'

import { requireAuth } from '@/lib/auth/rbac'
import { getMyAttendanceHistory, getMyAttendanceSummary } from '@/lib/student-portal/attendance'
import { Calendar, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react'
import Link from 'next/link'

export default async function KehadiranPage(props: {
  searchParams: Promise<{ month?: string; page?: string }>
}) {
  const searchParams = await props.searchParams
  const { session } = await requireAuth()

  const currentMonth = searchParams.month || new Date().toISOString().substring(0, 7)
  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1
  const limit = 20

  const summary = await getMyAttendanceSummary(session.userId, currentMonth)
  const history = await getMyAttendanceHistory(session.userId, currentMonth, page, limit)

  // Quick navigation for month (Last 3 months)
  const months = []
  const date = new Date()
  for (let i = 0; i < 3; i++) {
    const d = new Date(date.getFullYear(), date.getMonth() - i, 1)
    const val = d.toISOString().substring(0, 7)
    const label = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(d)
    months.push({ val, label })
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-indigo-600" /> Kehadiran
          </h1>
          <p className="text-sm text-gray-500 mt-1">Rekap absensi bulanan Anda</p>
        </div>
        
        <div className="flex gap-2 bg-white rounded-lg p-1 border border-gray-200">
          {months.map(m => (
            <Link 
              key={m.val} 
              href={`/santri/kehadiran?month=${m.val}`}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${currentMonth === m.val ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:text-gray-900'}`}
            >
              {m.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
          <div className="bg-green-100 p-2 rounded-lg text-green-600"><CheckCircle className="w-5 h-5" /></div>
          <div>
            <p className="text-sm font-medium text-gray-500">Hadir</p>
            <p className="text-xl font-bold text-gray-900">{summary.hadir}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><AlertCircle className="w-5 h-5" /></div>
          <div>
            <p className="text-sm font-medium text-gray-500">Izin</p>
            <p className="text-xl font-bold text-gray-900">{summary.izin}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
          <div className="bg-yellow-100 p-2 rounded-lg text-yellow-600"><Clock className="w-5 h-5" /></div>
          <div>
            <p className="text-sm font-medium text-gray-500">Sakit</p>
            <p className="text-xl font-bold text-gray-900">{summary.sakit}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
          <div className="bg-red-100 p-2 rounded-lg text-red-600"><XCircle className="w-5 h-5" /></div>
          <div>
            <p className="text-sm font-medium text-gray-500">Alfa</p>
            <p className="text-xl font-bold text-gray-900">{summary.alfa}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Riwayat Kehadiran</h2>
        </div>
        
        {history.items.length === 0 ? (
          <div className="p-8 text-center text-gray-500 italic">
            Belum ada data kehadiran pada periode ini.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {history.items.map((row) => (
              <li key={row.id} className="p-4 sm:px-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(row.attendance_date))}
                  </p>
                </div>
                <div>
                  {row.status === 'hadir' && <span className="inline-flex items-center rounded-md bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Hadir</span>}
                  {row.status === 'izin' && <span className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">Izin</span>}
                  {row.status === 'sakit' && <span className="inline-flex items-center rounded-md bg-yellow-50 px-2.5 py-1 text-xs font-medium text-yellow-700 ring-1 ring-inset ring-yellow-600/20">Sakit</span>}
                  {row.status === 'alfa' && <span className="inline-flex items-center rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">Alfa</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pagination */}
      {history.total > limit && (
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <p className="text-sm text-gray-500">
            Menampilkan {history.items.length} dari {history.total} data
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={`/santri/kehadiran?month=${currentMonth}&page=${page - 1}`} className="px-3 py-1 text-sm bg-gray-50 border border-gray-200 rounded hover:bg-gray-100">
                Sebelumnya
              </Link>
            )}
            {page * limit < history.total && (
              <Link href={`/santri/kehadiran?month=${currentMonth}&page=${page + 1}`} className="px-3 py-1 text-sm bg-gray-50 border border-gray-200 rounded hover:bg-gray-100">
                Selanjutnya
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
