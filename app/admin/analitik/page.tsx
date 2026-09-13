import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/rbac'
import { getAdminAnalytics, getLearningProgressChartData } from '@/lib/db/queries/analytics'
import { getMonthlyAttendanceStats } from '@/lib/db/queries/attendance'
import AnalitikClient from './AnalitikClient'

export const dynamic = 'force-dynamic'

interface SearchParams {
  period?: string
}

export default async function AdminAnalitikPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { role } = await requireAuth()
  if (role !== 'SUPER_ADMIN') {
    redirect('/login')
  }

  const resolvedParams = await searchParams
  
  // Default to current month if no period specified
  const period = resolvedParams.period || new Date().toISOString().substring(0, 7)

  // Fetch real aggregated metrics
  const analyticsData = await getAdminAnalytics(period)
  
  // Fetch chart data (always last 8 months)
  const progressChartData = await getLearningProgressChartData(8)
  
  // Attendance Bar Chart data expects keys: m, hadir, izin, sakit, alfa
  const attendanceChartDataRaw = await getMonthlyAttendanceStats(undefined, 8)
  const attendanceChartData = attendanceChartDataRaw.map(r => ({
    m: r.month,
    hadir: r.hadir,
    izin: r.izin,
    sakit: r.sakit,
    alfa: r.alfa
  }))

  return (
    <AnalitikClient 
      analyticsData={analyticsData}
      progressChartData={progressChartData as any}
      attendanceChartData={attendanceChartData}
    />
  )
}
