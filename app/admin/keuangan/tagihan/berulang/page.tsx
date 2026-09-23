import { requirePermission } from '@/lib/auth/rbac'
import { getRecurringConfigs, getStudentFeeAssignments, getBillingRuns } from '@/lib/finance/queries/recurring-billing'
import { getAllClasses } from '@/lib/db/queries/classes'
import { getAllPrograms } from '@/lib/db/queries/programs'
import { db } from '@/lib/db/client'
import { academicYears, financeFeeTypes } from '@/drizzle/schema'
import { eq, desc } from 'drizzle-orm'
import Link from 'next/link'
import { Settings2, Users, PlayCircle, History, Layers } from 'lucide-react'

import { ConfigTab } from './config-tab'
import { AssignmentTab } from './assignment-tab'
import { GenerateTab } from './generate-tab'
import { HistoryTab } from './history-tab'

export const dynamic = 'force-dynamic'

export default async function RecurringBillingPage(props: {
  searchParams: Promise<{ tab?: string, page?: string, search?: string, status?: string, academicYearId?: string, feeTypeId?: string, period?: string }>
}) {
  await requirePermission('finance.billing.view')

  const searchParams = await props.searchParams
  const currentTab = searchParams.tab || 'config'
  const page = parseInt(searchParams.page || '1', 10)

  // Fetch options for filters
  const activeYears = await db.select().from(academicYears).orderBy(desc(academicYears.startDate))
  const monthlyFeeTypes = await db.select().from(financeFeeTypes).where(eq(financeFeeTypes.billingFrequency, 'MONTHLY'))

  let content

  if (currentTab === 'config') {
    const configs = await getRecurringConfigs()
    content = <ConfigTab configs={configs} />
  } else if (currentTab === 'assignments') {
    const filters = {
      page,
      limit: 20,
      search: searchParams.search,
      status: searchParams.status,
      academicYearId: searchParams.academicYearId ? parseInt(searchParams.academicYearId) : undefined,
      feeTypeId: searchParams.feeTypeId ? parseInt(searchParams.feeTypeId) : undefined
    }
    const data = await getStudentFeeAssignments(filters)
    const [classes, programs] = await Promise.all([
      getAllClasses(),
      getAllPrograms()
    ])
    content = <AssignmentTab assignments={data.items} pagination={{ page: data.page, totalPages: data.totalPages, total: data.total }} filters={filters} options={{ academicYears: activeYears, feeTypes: monthlyFeeTypes, classes, programs }} />
  } else if (currentTab === 'generate') {
    content = <GenerateTab options={{ academicYears: activeYears, feeTypes: monthlyFeeTypes }} />
  } else if (currentTab === 'history') {
    const filters = {
      page,
      limit: 20,
      status: searchParams.status,
      academicYearId: searchParams.academicYearId ? parseInt(searchParams.academicYearId) : undefined,
      feeTypeId: searchParams.feeTypeId ? parseInt(searchParams.feeTypeId) : undefined,
      period: searchParams.period
    }
    const data = await getBillingRuns(filters)
    content = <HistoryTab runs={data.items} pagination={{ page: data.page, totalPages: data.totalPages, total: data.total }} filters={filters} options={{ academicYears: activeYears, feeTypes: monthlyFeeTypes }} />
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Tagihan Berulang</h2>
          <p className="text-sm text-gray-500 mt-1">Konfigurasi dan generate tagihan bulanan (SPP, Catering, dll)</p>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <Link
            href="?tab=config"
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${currentTab === 'config' ? 'border-[#18085A] text-[#18085A]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              Konfigurasi
            </div>
          </Link>
          <Link
            href="?tab=assignments"
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${currentTab === 'assignments' ? 'border-[#18085A] text-[#18085A]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Assignment Santri
            </div>
          </Link>
          <Link
            href="?tab=generate"
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${currentTab === 'generate' ? 'border-[#18085A] text-[#18085A]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            <div className="flex items-center gap-2">
              <PlayCircle className="w-4 h-4" />
              Preview & Generate
            </div>
          </Link>
          <Link
            href="?tab=history"
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${currentTab === 'history' ? 'border-[#18085A] text-[#18085A]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            <div className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Riwayat Proses
            </div>
          </Link>
        </nav>
      </div>

      {content}
    </div>
  )
}
