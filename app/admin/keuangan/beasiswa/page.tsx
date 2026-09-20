import { requirePermission } from '@/lib/auth/rbac'
import { getScholarshipPrograms, getScholarshipAwards, getScholarshipInvoiceHistory, getScholarshipReportingSummary, getActiveAcademicYearsForSelect, getActiveScholarshipProgramsForSelect, getScholarshipFormOptions } from '@/lib/finance/scholarships/queries'
import { ProgramList } from './program-list'
import { RecipientList } from './recipient-list'
import { ReportList } from './report-list'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Plus, Users, BookOpen, FileText } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function BeasiswaPage(props: {
  searchParams: Promise<{ tab?: string, page?: string, search?: string, status?: string, type?: string, academicYearId?: string, programId?: string, feeTypeId?: string, period?: string }>
}) {
  await requirePermission('finance.billing.view')

  const searchParams = await props.searchParams
  const currentTab = searchParams.tab || 'programs'
  const page = parseInt(searchParams.page || '1', 10)

  let content
  
  if (currentTab === 'programs') {
    const data = await getScholarshipPrograms({
      page,
      limit: 20,
      search: searchParams.search,
      status: searchParams.status,
      type: searchParams.type
    })
    content = <ProgramList programs={data.data} pagination={data.pagination} />
  } else if (currentTab === 'recipients') {
    const data = await getScholarshipAwards({
      page,
      limit: 20,
      search: searchParams.search,
      status: searchParams.status
    })
    content = <RecipientList awards={data.data} pagination={data.pagination} />
  } else if (currentTab === 'report') {
    // Determine default academic year if not provided
    let activeYearId = searchParams.academicYearId ? parseInt(searchParams.academicYearId) : undefined
    const activeYears = await getActiveAcademicYearsForSelect()
    
    if (!activeYearId && activeYears.length > 0) {
      activeYearId = activeYears[0].id
    }

    const reportFilters = {
      academicYearId: activeYearId,
      programId: searchParams.programId ? parseInt(searchParams.programId) : undefined,
      feeTypeId: searchParams.feeTypeId ? parseInt(searchParams.feeTypeId) : undefined,
      period: searchParams.period,
      page,
      limit: 20
    }

    const historyData = await getScholarshipInvoiceHistory(reportFilters)
    const summaryData = await getScholarshipReportingSummary(reportFilters)
    const formOptions = await getScholarshipFormOptions()
    const activePrograms = await getActiveScholarshipProgramsForSelect()

    content = <ReportList 
      invoices={historyData.data} 
      summary={summaryData}
      pagination={historyData.pagination} 
      filters={reportFilters}
      options={{
        academicYears: activeYears,
        programs: activePrograms,
        feeTypes: formOptions.feeTypes
      }}
    />
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Manajemen Beasiswa</h2>
          <p className="text-sm text-gray-500 mt-1">Kelola program beasiswa dan santri penerima</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/keuangan/beasiswa/tetapkan">
            <Button variant="outline">
              <Users className="w-4 h-4 mr-2" />
              Tetapkan Beasiswa
            </Button>
          </Link>
          <Link href="/admin/keuangan/beasiswa/baru">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Buat Program Baru
            </Button>
          </Link>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <Link
            href="?tab=programs"
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${currentTab === 'programs'
                ? 'border-[#18085A] text-[#18085A]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Program Beasiswa
            </div>
          </Link>
          <Link
            href="?tab=recipients"
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${currentTab === 'recipients'
                ? 'border-[#18085A] text-[#18085A]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Penerima Beasiswa
            </div>
          </Link>
          <Link
            href="?tab=report"
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${currentTab === 'report'
                ? 'border-[#18085A] text-[#18085A]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
            `}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Laporan
            </div>
          </Link>
        </nav>
      </div>

      {content}
    </div>
  )
}
