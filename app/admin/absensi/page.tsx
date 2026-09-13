import { requireAuth } from '@/lib/auth/rbac'
import { getAllClasses } from '@/lib/db/queries/classes'
import { searchAttendance } from '@/lib/db/queries/attendance'
import AdminAbsensiClient from './AdminAbsensiClient'

export const dynamic = 'force-dynamic'

export default async function AdminAbsensiPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const { role } = await requireAuth()
  if (role !== 'SUPER_ADMIN') {
    throw new Error('Unauthorized')
  }

  const params = await searchParams
  
  const date = typeof params.date === 'string' ? params.date : new Date().toLocaleDateString('en-CA')
  const classId = typeof params.class_id === 'string' ? params.class_id : ''
  const status = typeof params.status === 'string' ? params.status : ''
  const search = typeof params.search === 'string' ? params.search : ''
  const page = typeof params.page === 'string' ? Number(params.page) : 1
  const pageSize = 20

  const [classes, attendanceResult] = await Promise.all([
    getAllClasses(),
    searchAttendance({
      date,
      classId: classId ? Number(classId) : null,
      status: status || null,
      studentName: search || null,
      limit: pageSize,
      offset: (page - 1) * pageSize
    })
  ])

  return (
    <AdminAbsensiClient 
      data={attendanceResult.data}
      total={attendanceResult.total}
      classes={classes}
      currentDate={date}
      currentClassId={classId}
      currentStatus={status}
      currentSearch={search}
      currentPage={page}
      pageSize={pageSize}
    />
  )
}
