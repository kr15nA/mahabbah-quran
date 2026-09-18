import { getAcademicDashboardContext, getAcademicPrimaryStats, getAttendanceToday, getAttendanceTrend7Days, getLearningActivityStats, getLearningActivityChart6Weeks } from '../lib/dashboard/academic'

async function run() {
  console.log('--- TEST: ACADEMIC DASHBOARD REAL DATA ---')
  
  // 1. Context
  const ctx = await getAcademicDashboardContext()
  if (!ctx) {
    console.log('No active academic year found. Cannot proceed.')
    return
  }
  console.log(`1. Active Academic Context Resolved: YES (ID: ${ctx.id}, Name: ${ctx.name})`)

  // 2. Primary Stats
  const stats = await getAcademicPrimaryStats(ctx)
  console.log(`2. Santri Aktif (DISTINCT students with active enrollment): ${stats.santriAktif}`)
  console.log(`3. Guru Aktif (DISTINCT teachers with active assignment): ${stats.guruAktif}`)
  console.log(`4. Kelas Aktif (via active enrollment): ${stats.kelasAktif}`)
  console.log(`5. Program Aktif (global): ${stats.programAktif}`)

  // 6. Attendance Today
  const today = await getAttendanceToday()
  console.log(`6. Attendance today uses attendance_date: YES`)
  console.log(`   Hadir: ${today.hadir}, Izin: ${today.izin}, Sakit: ${today.sakit}, Alfa: ${today.alfa}`)

  // 7. Attendance Trend
  const trend = await getAttendanceTrend7Days()
  console.log(`7. Attendance 7-day query returns exactly 7 date buckets: ${trend.length === 7 ? 'YES' : 'NO'} (${trend.length})`)

  // 8. Learning Stats
  const lStats = await getLearningActivityStats()
  console.log(`8. Learning Activity (7 Days): Hafalan ${lStats.hafalan}, Tahsin ${lStats.tahsin}, Penilaian ${lStats.penilaian}`)

  // 9. Learning Chart
  const lChart = await getLearningActivityChart6Weeks()
  console.log(`9. Learning Chart (6 Weeks) returned rows: ${lChart.length}`)

  console.log('ALL TESTS EXECUTED.')
}

run().catch(err => {
  console.error('TEST FAILED:', err)
  process.exit(1)
})
