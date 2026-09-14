'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Plus, Edit2, Ban } from 'lucide-react'

export default function FeeTypesPage() {
  const [feeTypes, setFeeTypes] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchFeeTypes()
  }, [])

  const fetchFeeTypes = async () => {
    try {
      const res = await fetch('/api/finance/fee-types')
      if (res.ok) {
        const data = await res.json()
        setFeeTypes(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  const deactivateFeeType = async (id: number) => {
    if (!confirm('Nonaktifkan jenis tagihan ini?')) return
    try {
      await fetch(`/api/finance/fee-types/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: false })
      })
      fetchFeeTypes()
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">Jenis Tagihan</h2>
        <Button onClick={() => alert('Add modal not implemented in this skeleton')}>
          <Plus className="w-4 h-4 mr-2" />
          Tambah Jenis
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 font-medium">Kode</th>
                <th className="px-6 py-4 font-medium">Nama</th>
                <th className="px-6 py-4 font-medium">Frekuensi</th>
                <th className="px-6 py-4 font-medium">Nominal Default</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Memuat data...</td>
                </tr>
              ) : feeTypes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Belum ada jenis tagihan.</td>
                </tr>
              ) : feeTypes.map((type) => (
                <tr key={type.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4 font-medium text-gray-900">{type.code}</td>
                  <td className="px-6 py-4">{type.name}</td>
                  <td className="px-6 py-4">{type.billingFrequency}</td>
                  <td className="px-6 py-4 font-mono">
                    {type.defaultAmount ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(Number(type.defaultAmount)) : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${type.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {type.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => alert('Edit modal not implemented in this skeleton')}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      {type.isActive && (
                        <Button variant="outline" size="sm" onClick={() => deactivateFeeType(type.id)} className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200">
                          <Ban className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
