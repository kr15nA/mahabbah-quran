import { requirePermission } from '@/lib/auth/rbac'
import { getScholarshipAwards } from '@/lib/finance/scholarships/queries'
import { notFound, redirect } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { AwardForm } from '../../../award-form'
import { getActiveScholarshipProgramsForSelect, getActiveAcademicYearsForSelect } from '@/lib/finance/scholarships/queries'

export const dynamic = 'force-dynamic'

export default async function EditAwardPage({ params }: { params: { id: string } }) {
  await requirePermission('finance.billing.manage')

  const awardId = parseInt(params.id, 10)
  if (isNaN(awardId)) notFound()

  const { financeDb } = await import('@/lib/finance/tx')
  const { studentScholarships, scholarshipPrograms, students, academicYears } = await import('@/drizzle/schema')
  const { eq } = await import('drizzle-orm')

  const [award] = await financeDb.select({
    id: studentScholarships.id,
    studentId: studentScholarships.studentId,
    studentName: students.fullName,
    programId: studentScholarships.scholarshipProgramId,
    programName: scholarshipPrograms.name,
    academicYearId: studentScholarships.academicYearId,
    academicYearName: academicYears.name,
    startDate: studentScholarships.startDate,
    endDate: studentScholarships.endDate,
    status: studentScholarships.status,
    notes: studentScholarships.notes
  })
  .from(studentScholarships)
  .innerJoin(students, eq(students.id, studentScholarships.studentId))
  .innerJoin(scholarshipPrograms, eq(scholarshipPrograms.id, studentScholarships.scholarshipProgramId))
  .innerJoin(academicYears, eq(academicYears.id, studentScholarships.academicYearId))
  .where(eq(studentScholarships.id, awardId))

  if (!award) notFound()

  if (award.status !== 'ACTIVE') {
    // Only ACTIVE awards can be edited. REVOKED is immutable.
    redirect(`/admin/keuangan/beasiswa/award/${awardId}`)
  }

  // We provide programs and academic years for form structure, although they are read-only in Edit mode
  const programs = await getActiveScholarshipProgramsForSelect()
  const academicYearsOptions = await getActiveAcademicYearsForSelect()

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Edit Periode Beasiswa</h2>
        <p className="text-sm text-gray-500 mt-1">
          Ubah masa berlaku beasiswa. Santri, Program, dan Tahun Ajaran tidak dapat diubah (cabut dan tetapkan baru jika perlu).
        </p>
      </div>

      <Card className="p-6">
        <AwardForm 
          initialData={award}
          programs={programs} 
          academicYears={academicYearsOptions} 
        />
      </Card>
    </div>
  )
}
