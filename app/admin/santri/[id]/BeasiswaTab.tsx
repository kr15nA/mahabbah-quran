'use client'

import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Plus, Eye } from 'lucide-react'
import Link from 'next/link'

interface BeasiswaTabProps {
  studentId: number
  scholarships: any[]
}

export default function BeasiswaTab({ studentId, scholarships }: BeasiswaTabProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE': return <Badge variant="success">Aktif</Badge>
      case 'REVOKED': return <Badge variant="danger">Dicabut</Badge>
      default: return <Badge variant="neutral">{status}</Badge>
    }
  }

  const formatCurrency = (amount: string | null) => {
    if (!amount) return '-'
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(amount))
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-2">
        <h3 className="font-bold text-lg text-gray-900">Riwayat Beasiswa</h3>
        <Link href={`/admin/keuangan/beasiswa/tetapkan?studentId=${studentId}`}>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Tetapkan Beasiswa
          </Button>
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border border-gray-100 rounded-lg overflow-hidden">
          <thead className="text-xs text-gray-500 uppercase bg-gray-50/50">
            <tr>
              <th className="px-6 py-4 font-medium">Program</th>
              <th className="px-6 py-4 font-medium">Tahun Ajaran</th>
              <th className="px-6 py-4 font-medium">Nilai</th>
              <th className="px-6 py-4 font-medium">Periode</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {scholarships.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  Belum ada riwayat beasiswa untuk santri ini.
                </td>
              </tr>
            ) : scholarships.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50/50">
                <td className="px-6 py-4 text-[#18085A] font-medium">{s.programName}</td>
                <td className="px-6 py-4">{s.academicYearName}</td>
                <td className="px-6 py-4 font-mono">
                  {s.calculationType === 'PERCENTAGE' 
                    ? `${(s.percentageBasisPoints || 0) / 100}%` 
                    : s.calculationType === 'FIXED_AMOUNT' 
                      ? formatCurrency(s.fixedAmount) 
                      : 'Penuh (100%)'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {s.startDate} s.d {s.endDate || '(Seterusnya)'}
                </td>
                <td className="px-6 py-4">{getStatusBadge(s.status)}</td>
                <td className="px-6 py-4 text-right">
                  <Link href={`/admin/keuangan/beasiswa/award/${s.id}`}>
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
