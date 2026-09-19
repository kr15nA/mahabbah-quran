import { requirePermission } from '@/lib/auth/rbac'
import { getActiveScholarshipProgramsForSelect, getActiveAcademicYearsForSelect } from '@/lib/finance/scholarships/queries'
import { AwardForm } from '../award-form'
import { Card } from '@/components/ui/Card'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function TetapkanPage({ searchParams }: { searchParams: { studentId?: string } }) {
  await requirePermission('finance.billing.manage')
  
  const programs = await getActiveScholarshipProgramsForSelect()
  const academicYears = await getActiveAcademicYearsForSelect()

  const defaultStudentId = searchParams.studentId ? parseInt(searchParams.studentId, 10) : undefined

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/admin/keuangan/beasiswa?tab=recipients">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>
        </Link>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Tetapkan Beasiswa Baru</h2>
          <p className="text-sm text-gray-500 mt-1">
            Berikan beasiswa kepada santri. Hanya program aktif yang dapat dipilih.
          </p>
        </div>
      </div>

      <Card className="p-6">
        <AwardForm 
          programs={programs} 
          academicYears={academicYears} 
          studentId={!isNaN(defaultStudentId as number) ? defaultStudentId : undefined}
        />
      </Card>
    </div>
  )
}
