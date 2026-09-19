'use client'

import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Eye, Edit, ShieldAlert } from 'lucide-react'
import Link from 'next/link'
import Pagination from '@/components/ui/Pagination'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

export function ProgramList({ programs, pagination }: { programs: any[], pagination: any }) {
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
    params.set('page', '1') // reset page
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

  const formatCurrency = (amount: string) => {
    if (!amount) return '-'
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(amount))
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT': return <Badge variant="neutral">Draft</Badge>
      case 'ACTIVE': return <Badge variant="success">Aktif</Badge>
      case 'INACTIVE': return <Badge variant="danger">Nonaktif</Badge>
      default: return <Badge variant="neutral">{status}</Badge>
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'FULL': return 'Penuh'
      case 'PERCENTAGE': return 'Persentase'
      case 'FIXED_AMOUNT': return 'Nominal Tetap'
      default: return type
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="search"
            name="search"
            placeholder="Cari program..."
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
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Aktif</option>
            <option value="INACTIVE">Nonaktif</option>
          </select>
          <select 
            onChange={(e) => handleFilter('type', e.target.value)}
            value={searchParams.get('type') || ''}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
          >
            <option value="">Semua Jenis</option>
            <option value="FULL">Penuh</option>
            <option value="PERCENTAGE">Persentase</option>
            <option value="FIXED_AMOUNT">Nominal Tetap</option>
          </select>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 font-medium">Program Beasiswa</th>
                <th className="px-6 py-4 font-medium">Jenis</th>
                <th className="px-6 py-4 font-medium">Nilai</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Penerima Aktif</th>
                <th className="px-6 py-4 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {programs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Data tidak ditemukan.
                  </td>
                </tr>
              ) : programs.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4 font-medium text-gray-900">{p.name}</td>
                  <td className="px-6 py-4">{getTypeLabel(p.calculationType)}</td>
                  <td className="px-6 py-4 font-mono">
                    {p.calculationType === 'PERCENTAGE' 
                      ? `${p.percentageBasisPoints / 100}%` 
                      : p.calculationType === 'FIXED_AMOUNT' 
                        ? formatCurrency(p.fixedAmount) 
                        : '100%'}
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(p.status)}</td>
                  <td className="px-6 py-4 text-center">{p.activeRecipientsCount}</td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/admin/keuangan/beasiswa/${p.id}`}>
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
