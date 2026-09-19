'use client'

import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Eye } from 'lucide-react'
import Link from 'next/link'
import Pagination from '@/components/ui/Pagination'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

export function RecipientList({ awards, pagination }: { awards: any[], pagination: any }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const query = new FormData(form).get('search') as string
    
    const params = new URLSearchParams(searchParams.toString())
    if (query) {
      params.set('search', query)
    } else {
      params.delete('search')
    }
    params.set('page', '1')
    router.push(`${pathname}?${params.toString()}`)
  }

  const handleFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.set('page', '1')
    router.push(`${pathname}?${params.toString()}`)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE': return <Badge variant="success">Aktif</Badge>
      case 'REVOKED': return <Badge variant="danger">Dicabut</Badge>
      default: return <Badge variant="neutral">{status}</Badge>
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="search"
            name="search"
            placeholder="Cari santri..."
            defaultValue={searchParams.get('search') || ''}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white min-w-[200px]"
          />
          <Button type="submit" variant="outline">Cari</Button>
        </form>
        <div className="flex gap-2">
          <select 
            onChange={(e) => handleFilter('status', e.target.value)}
            value={searchParams.get('status') || ''}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
          >
            <option value="">Semua Status</option>
            <option value="ACTIVE">Aktif</option>
            <option value="REVOKED">Dicabut</option>
          </select>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 font-medium">Santri</th>
                <th className="px-6 py-4 font-medium">Program</th>
                <th className="px-6 py-4 font-medium">Tahun Ajaran</th>
                <th className="px-6 py-4 font-medium">Periode</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {awards.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Data tidak ditemukan.
                  </td>
                </tr>
              ) : awards.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{a.studentName}</div>
                    <div className="text-xs text-gray-500">{a.nisn}</div>
                  </td>
                  <td className="px-6 py-4 text-[#18085A] font-medium">{a.programName}</td>
                  <td className="px-6 py-4">{a.academicYearName}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {a.startDate} {a.endDate ? ` s.d ${a.endDate}` : ' (Seterusnya)'}
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(a.status)}</td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/admin/keuangan/beasiswa/award/${a.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-2" /> Detail
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination 
          currentPage={pagination.page} 
          totalPages={pagination.totalPages} 
          totalItems={pagination.total} 
          limit={pagination.limit} 
        />
      </Card>
    </div>
  )
}
