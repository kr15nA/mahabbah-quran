import { requirePermission, hasPermission } from '@/lib/auth/rbac'
import { getGlobalTasmiHistory } from '@/lib/tasmi/list'
import { getAllSurahs } from '@/lib/db/queries/surahs'
import { TasmiGuruClient } from './TasmiGuruClient'
import { db } from '@/lib/db/client'
import { students, enrollments, classes, teacherAssignments, academicYears } from '@/drizzle/schema'
import { eq, and } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export default async function GuruTasmiPage({
  searchParams
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const auth = await requirePermission('academic.tasmi.read')
  const canManage = await hasPermission(auth.session, 'academic.tasmi.manage')

  const page = Math.max(1, Number(searchParams.page) || 1)
  const pageSize = [10, 30, 50, 100].includes(Number(searchParams.page_size)) ? Number(searchParams.page_size) : 10
  
  const search = typeof searchParams.search === 'string' ? searchParams.search : ''
  const mode = typeof searchParams.mode === 'string' ? searchParams.mode : 'all'
  const status = typeof searchParams.status === 'string' ? searchParams.status : 'all'

  const { data, total } = await getGlobalTasmiHistory({
    page,
    pageSize,
    search,
    mode,
    status,
    teacherId: auth.session.userId
  })

  const surahs = await getAllSurahs()

  // Fetch authorized students for this Guru
  const authorizedRows = await db.select({
    id: students.id,
    name: students.fullName,
    className: classes.name
  })
  .from(students)
  .innerJoin(enrollments, eq(enrollments.studentId, students.id))
  .innerJoin(classes, eq(classes.id, enrollments.classId))
  .innerJoin(academicYears, and(eq(academicYears.id, enrollments.academicYearId), eq(academicYears.isActive, true)))
  .innerJoin(teacherAssignments, and(
    eq(teacherAssignments.classId, classes.id),
    eq(teacherAssignments.academicYearId, academicYears.id),
    eq(teacherAssignments.teacherId, auth.session.userId)
  ))
  .orderBy(classes.name, students.fullName)

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <TasmiGuruClient
        data={data}
        total={total}
        page={page}
        pageSize={pageSize}
        search={search}
        mode={mode}
        status={status}
        surahs={surahs}
        authorizedStudents={authorizedRows}
        canManage={canManage}
      />
    </div>
  )
}
