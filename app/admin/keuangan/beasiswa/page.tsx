import { requirePermission } from '@/lib/auth/rbac'
import { getScholarshipPrograms, getScholarshipAwards } from '@/lib/finance/scholarships/queries'
import { ProgramList } from './program-list'
import { RecipientList } from './recipient-list'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Plus, Users, BookOpen } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function BeasiswaPage({
  searchParams
}: {
  searchParams: { tab?: string, page?: string, search?: string, status?: string, type?: string }
}) {
  await requirePermission('finance.billing.view')

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
  } else {
    const data = await getScholarshipAwards({
      page,
      limit: 20,
      search: searchParams.search,
      status: searchParams.status
    })
    content = <RecipientList awards={data.data} pagination={data.pagination} />
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
        </nav>
      </div>

      {content}
    </div>
  )
}
