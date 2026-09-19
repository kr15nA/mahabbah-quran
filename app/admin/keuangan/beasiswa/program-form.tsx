'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { AlertCircle } from 'lucide-react'
import { 
  createScholarshipProgramAction, 
  updateScholarshipProgramAction 
} from './actions'

interface ProgramFormProps {
  initialData?: any
  feeTypes: any[]
  funds: any[]
  expenseAccounts: any[]
}

export function ProgramForm({ initialData, feeTypes, funds, expenseAccounts }: ProgramFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    calculationType: initialData?.calculationType || 'PERCENTAGE',
    percentage: initialData?.percentageBasisPoints ? (initialData.percentageBasisPoints / 100).toString() : '',
    fixedAmount: initialData?.fixedAmount || '',
    feeTypeIds: initialData?.feeTypes?.map((f: any) => f.id.toString()) || [] as string[],
    fundingFundId: initialData?.fundingFundId?.toString() || '',
    scholarshipAccountId: initialData?.scholarshipAccountId?.toString() || ''
  })

  // Derive compatible funds
  const compatibleFundId = useMemo(() => {
    if (formData.feeTypeIds.length === 0) return null
    const selectedFeeTypes = feeTypes.filter(f => formData.feeTypeIds.includes(f.id.toString()))
    const firstDefaultFund = selectedFeeTypes[0]?.defaultFundId
    
    // Check if all selected fee types have the same default fund
    const allSame = selectedFeeTypes.every(f => f.defaultFundId === firstDefaultFund)
    if (allSame && firstDefaultFund) {
      return firstDefaultFund.toString()
    }
    return 'MIXED_OR_MISSING'
  }, [formData.feeTypeIds, feeTypes])

  // Auto-set fundId if valid
  useMemo(() => {
    if (compatibleFundId && compatibleFundId !== 'MIXED_OR_MISSING') {
      if (formData.fundingFundId !== compatibleFundId) {
        setFormData(prev => ({ ...prev, fundingFundId: compatibleFundId }))
      }
    }
  }, [compatibleFundId])

  const fundError = useMemo(() => {
    if (formData.feeTypeIds.length === 0) return ''
    if (compatibleFundId === 'MIXED_OR_MISSING') {
      return 'Jenis biaya yang dipilih menggunakan fund berbeda dan belum dapat digabungkan dalam satu program beasiswa.'
    }
    return ''
  }, [compatibleFundId, formData.feeTypeIds])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try {
      const data = new FormData()
      data.append('name', formData.name)
      data.append('description', formData.description)
      data.append('calculationType', formData.calculationType)
      if (formData.calculationType === 'PERCENTAGE') {
        data.append('percentage', formData.percentage)
      } else if (formData.calculationType === 'FIXED_AMOUNT') {
        data.append('fixedAmount', formData.fixedAmount)
      }
      formData.feeTypeIds.forEach((id: string) => data.append('feeTypeIds', id))
      if (formData.fundingFundId && compatibleFundId !== 'MIXED_OR_MISSING') data.append('fundingFundId', formData.fundingFundId)
      if (formData.scholarshipAccountId) data.append('scholarshipAccountId', formData.scholarshipAccountId)

      if (initialData?.id) {
        await updateScholarshipProgramAction(initialData.id, data)
        router.push(`/admin/keuangan/beasiswa/${initialData.id}`)
      } else {
        const id = await createScholarshipProgramAction(data)
        router.push(`/admin/keuangan/beasiswa/${id}`)
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }

  const handleFeeTypeToggle = (id: string) => {
    setFormData(prev => {
      const isSelected = prev.feeTypeIds.includes(id)
      if (isSelected) {
        return { ...prev, feeTypeIds: prev.feeTypeIds.filter((f: string) => f !== id) }
      } else {
        return { ...prev, feeTypeIds: [...prev.feeTypeIds, id] }
      }
    })
  }

  // Display value for formatting Rupiah
  const displayFixedAmount = formData.fixedAmount
    ? 'Rp' + parseInt(formData.fixedAmount.replace(/\\D/g, '') || '0', 10).toLocaleString('id-ID')
    : ''

  const handleFixedAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\\D/g, '')
    setFormData(prev => ({ ...prev, fixedAmount: raw }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md border border-red-100 text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nama Program *</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white h-20 resize-none"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Beasiswa *</label>
          <select
            value={formData.calculationType}
            onChange={(e) => setFormData(prev => ({ ...prev, calculationType: e.target.value }))}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
          >
            <option value="FULL">Penuh (100%)</option>
            <option value="PERCENTAGE">Persentase (%)</option>
            <option value="FIXED_AMOUNT">Nominal Tetap (Rp)</option>
          </select>
        </div>

        {formData.calculationType === 'PERCENTAGE' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Persentase (%) *</label>
            <input
              type="text"
              value={formData.percentage}
              onChange={(e) => setFormData(prev => ({ ...prev, percentage: e.target.value }))}
              placeholder="Contoh: 50 atau 33.33"
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
            />
          </div>
        )}

        {formData.calculationType === 'FIXED_AMOUNT' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nominal (Rp) *</label>
            <input
              type="text"
              value={displayFixedAmount}
              onChange={handleFixedAmountChange}
              placeholder="Rp0"
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
            />
          </div>
        )}
      </div>

      <div className="bg-blue-50 text-blue-800 text-sm p-4 rounded-md border border-blue-100">
        <strong>Pratinjau Benefit:</strong>{' '}
        {formData.calculationType === 'FULL' && 'Menanggung 100% biaya yang dipilih.'}
        {formData.calculationType === 'PERCENTAGE' && `Menanggung ${formData.percentage || '0'}% dari tagihan yang memenuhi syarat.`}
        {formData.calculationType === 'FIXED_AMOUNT' && `Potongan maksimal ${displayFixedAmount || 'Rp0'} per tagihan yang memenuhi syarat.`}
      </div>

      <div className="pt-4 border-t border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Jenis Biaya yang Ditanggung *</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-4 border border-gray-200 rounded-md">
          {feeTypes.map(f => (
            <label key={f.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 p-2 rounded">
              <input
                type="checkbox"
                checked={formData.feeTypeIds.includes(f.id.toString())}
                onChange={() => handleFeeTypeToggle(f.id.toString())}
                className="w-4 h-4 text-[#18085A] rounded border-gray-300"
              />
              <span className="flex-1">{f.name}</span>
            </label>
          ))}
        </div>
      </div>

      {fundError && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md border border-red-100 text-sm flex items-start gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{fundError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-gray-200">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fund Sumber Beasiswa (Otomatis)</label>
          <select
            value={formData.fundingFundId}
            disabled
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm bg-gray-50 text-gray-500"
          >
            <option value="">-- {formData.feeTypeIds.length === 0 ? 'Pilih Jenis Biaya Dahulu' : (fundError ? 'Fund Tidak Valid' : 'Otomatis')} --</option>
            {funds.map(f => (
              <option key={f.id} value={f.id}>{f.name} ({f.restrictionType})</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">Sistem otomatis menyesuaikan dengan Fund dari Jenis Biaya.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Akun Beban Beasiswa (Expense) *</label>
          <select
            value={formData.scholarshipAccountId}
            onChange={(e) => setFormData(prev => ({ ...prev, scholarshipAccountId: e.target.value }))}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
          >
            <option value="">Pilih Akun Beban (Expense)</option>
            {expenseAccounts.map(a => (
              <option key={a.id} value={a.id}>{a.accountNumber} - {a.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-6">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
          disabled={loading}
        >
          Batal
        </Button>
        <Button
          type="submit"
          disabled={loading || !!fundError || formData.feeTypeIds.length === 0}
        >
          {loading ? 'Menyimpan...' : 'Simpan Draft'}
        </Button>
      </div>
    </form>
  )
}
