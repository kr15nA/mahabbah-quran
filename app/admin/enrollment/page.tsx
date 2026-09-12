import { requireAuth } from '@/lib/auth/rbac'
import { getAcademicYears } from '@/lib/db/queries/academic-years'
import { getAllClasses } from '@/lib/db/queries/classes'
import { searchStudents } from '@/lib/db/queries/students'
import EnrollmentClient from './EnrollmentClient'

export const metadata = {
  title: 'Penempatan Kelas - Admin | Mahabbah',
}

export const dynamic = 'force-dynamic'

export default async function EnrollmentPage() {
  await requireAuth() // Enforces SUPER_ADMIN access since layout also does, but good practice.

  // Fetch reference data for the UI
  const academicYears = await getAcademicYears()
  const classes = await getAllClasses()
  
  // Fetch all active students (since enrollment is for active students primarily)
  // We'll fetch all students without pagination for now, or just limit 1000 since it's a small school
  const { data: students } = await searchStudents('', { status: 'active' }, { limit: 1000, offset: 0 })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#18085A]">Penempatan Kelas</h1>
        <p className="text-sm text-gray-500 mt-1">
          Kelola penempatan santri ke dalam kelas berdasarkan tahun ajaran.
        </p>
      </div>

      <EnrollmentClient 
        academicYears={academicYears} 
        classes={classes} 
        students={students} 
      />
    </div>
  )
}
