'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { updateConfigAction } from './actions'
import { Check, X } from 'lucide-react'

export function ConfigTab({ configs }: { configs: any[] }) {
  const [savingId, setSavingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const formatCurrency = (amount: string) => {
    if (!amount) return 'Rp 0'
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(Number(amount))
  }

  const handleSave = async (feeTypeId: number, isActive: boolean, dueDayOfMonth: number) => {
    setSavingId(feeTypeId)
    setError(null)
    const res = await updateConfigAction({ feeTypeId, isActive, dueDayOfMonth })
    setSavingId(null)
    if (!res.success) {
      setError(res.error)
    } else {
      window.location.reload()
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {configs.length === 0 ? (
        <Card className="p-8 text-center text-gray-500">
          Belum ada jenis tagihan bulanan yang dapat dikonfigurasi.
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 font-medium">Jenis Tagihan</th>
                  <th className="px-6 py-4 font-medium">Nominal Default</th>
                  <th className="px-6 py-4 font-medium">Status Berulang</th>
                  <th className="px-6 py-4 font-medium">Jatuh Tempo (Tgl)</th>
                  <th className="px-6 py-4 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {configs.map((config) => (
                  <ConfigRow 
                    key={config.feeTypeId} 
                    config={config} 
                    onSave={handleSave} 
                    isSaving={savingId === config.feeTypeId} 
                    formatCurrency={formatCurrency}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

function ConfigRow({ config, onSave, isSaving, formatCurrency }: { config: any, onSave: any, isSaving: boolean, formatCurrency: any }) {
  const [isActive, setIsActive] = useState(config.isActive)
  const [dueDay, setDueDay] = useState(config.dueDayOfMonth)

  const isDirty = isActive !== config.isActive || dueDay !== config.dueDayOfMonth

  return (
    <tr className="hover:bg-gray-50/50">
      <td className="px-6 py-4">
        <div className="font-medium text-gray-900">{config.name}</div>
        <div className="text-xs text-gray-500">{config.code}</div>
      </td>
      <td className="px-6 py-4 font-mono">{formatCurrency(config.defaultAmount)}</td>
      <td className="px-6 py-4">
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" className="sr-only peer" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#18085A]"></div>
        </label>
      </td>
      <td className="px-6 py-4">
        <input 
          type="number" 
          min="1" max="28" 
          className="w-20 border-gray-300 rounded-md text-sm"
          value={dueDay}
          onChange={(e) => setDueDay(parseInt(e.target.value) || 1)}
        />
      </td>
      <td className="px-6 py-4 text-right">
        {isDirty && (
          <Button 
            size="sm" 
            onClick={() => onSave(config.feeTypeId, isActive, dueDay)}
            disabled={isSaving}
          >
            {isSaving ? 'Menyimpan...' : 'Simpan'}
          </Button>
        )}
        {!isDirty && (
          <span className="text-xs text-gray-400">Tersimpan</span>
        )}
      </td>
    </tr>
  )
}
