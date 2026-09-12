import { requireAuth } from '@/lib/auth/rbac'
import { getAcademicYears } from '@/lib/db/queries/academic-years'
import { getAllClasses } from '@/lib/db/queries/classes'
import { searchGurus } from '@/lib/db/queries/users'
import AssignmentClient from './AssignmentClient'

export const metadata = {
  title: 'Penugasan Guru - Admin | Mahabbah',
}

export const dynamic = 'force-dynamic'

export default async function PenugasanGuruPage() {
  await requireAuth() // Enforces SUPER_ADMIN access since layout also does, but good practice.

  // Fetch reference data for the UI
  const academicYears = await getAcademicYears()
  const classes = await getAllClasses()
  
  // Fetch active gurus
  const { data: gurus } = await searchGurus({ isActiveFilter: true, limit: 100, offset: 0 })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#18085A]">Penugasan Guru</h1>
        <p className="text-sm text-gray-500 mt-1">
          Kelola penugasan guru untuk setiap kelas berdasarkan tahun ajaran.
        </p>
      </div>

      <AssignmentClient 
        academicYears={academicYears} 
        classes={classes} 
        gurus={gurus} 
      />
    </div>
  )
}
