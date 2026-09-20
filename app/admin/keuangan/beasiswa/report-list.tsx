'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import Pagination from '@/components/ui/Pagination'
import { Check, X, FileSpreadsheet, User, Users, Receipt, BookOpen, Banknote, Clock, Calculator, Sparkles } from 'lucide-react'

export function ReportList({ invoices, summary, pagination, filters, options }: any) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams)
    if (value) params.set(key, value)
    else params.delete(key)
    params.set('page', '1') // reset page
    router.push(`${pathname}?${params.toString()}`)
  }

  const KpiCard = ({ title, value, icon: Icon, colorClass }: any) => (
    <Card className={`p-4 flex items-center gap-4 border-l-4 ${colorClass}`}>
      <div className={`p-3 rounded-xl ${colorClass.replace('border-', 'bg-').replace('-500', '-50')}`}>
        <Icon className={`w-6 h-6 ${colorClass.replace('border-', 'text-')}`} />
      </div>
      <div>
        <div className="text-sm text-gray-500 font-medium">{title}</div>
        <div className="text-xl font-bold text-gray-900">{value}</div>
      </div>
    </Card>
  )

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-gray-700 mb-1">Tahun Ajaran</label>
          <select 
            value={filters.academicYearId || ''} 
            onChange={(e) => handleFilterChange('academicYearId', e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="">Semua Tahun Ajaran</option>
            {options.academicYears.map((ay: any) => (
              <option key={ay.id} value={ay.id}>{ay.name}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-gray-700 mb-1">Periode</label>
          <input 
            type="month"
            value={filters.period || ''}
            onChange={(e) => handleFilterChange('period', e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-gray-700 mb-1">Program Beasiswa</label>
          <select 
            value={filters.programId || ''} 
            onChange={(e) => handleFilterChange('programId', e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="">Semua Program</option>
            {options.programs.map((p: any) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-gray-700 mb-1">Jenis Biaya</label>
          <select 
            value={filters.feeTypeId || ''} 
            onChange={(e) => handleFilterChange('feeTypeId', e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="">Semua Biaya</option>
            {options.feeTypes.map((f: any) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Program Aktif" value={summary.activePrograms} icon={BookOpen} colorClass="border-blue-500" />
        <KpiCard title="Penerima Aktif" value={summary.activeRecipients} icon={Users} colorClass="border-blue-500" />
        
        <KpiCard title="Total Bruto" value={new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(BigInt(summary.totalGross || 0))} icon={Receipt} colorClass="border-gray-500" />
        <KpiCard title="Total Beasiswa" value={new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(BigInt(summary.totalScholarship || 0))} icon={Sparkles} colorClass="border-indigo-500" />
        
        <KpiCard title="Total Bersih" value={new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(BigInt(summary.totalNet || 0))} icon={Calculator} colorClass="border-gray-800" />
        <KpiCard title="Total Dibayar" value={new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(BigInt(summary.totalPaid || 0))} icon={Banknote} colorClass="border-green-500" />
        
        <KpiCard title="Total Sisa" value={new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(BigInt(summary.totalOutstanding || 0))} icon={Clock} colorClass="border-red-500" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Santri</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Program (Snapshot)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Biaya / Periode</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Bruto</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Beasiswa</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Bersih</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Dibayar</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Sisa</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <FileSpreadsheet className="w-12 h-12 text-gray-300 mb-3" />
                      <p>Tidak ada data laporan yang sesuai filter.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                invoices.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{inv.studentName}</div>
                      <div className="text-xs text-gray-500">{inv.academicYearName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-[#18085A]">{inv.programName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{inv.feeTypeName}</div>
                      <div className="text-xs text-gray-500">{inv.period || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500 font-mono">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(BigInt(inv.grossAmount))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-indigo-600 font-mono">
                      -{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(BigInt(inv.scholarshipAmount))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 font-medium font-mono">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(BigInt(inv.netAmount))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-green-600 font-mono">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(BigInt(inv.paidAmount))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-red-600 font-mono">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(BigInt(inv.outstandingAmount))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <Badge variant={inv.status === 'PAID' ? 'success' : inv.status === 'ISSUED' ? 'warning' : 'primary'}>
                        {inv.status}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {pagination.totalPages > 1 && (
          <div className="border-t border-gray-200 px-6 py-4">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              limit={pagination.limit}
            />
          </div>
        )}
      </div>
    </div>
  )
}
