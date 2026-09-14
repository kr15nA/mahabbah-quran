'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '../../../../../components/ui/Button'
import { AlertCircle } from 'lucide-react'

interface DisbursementFormProps {
  categories: { id: number; name: string }[]
  funds: { id: number; name: string }[]
  categoryFunds: { categoryId: number; fundId: number }[]
}

export default function DisbursementForm({ categories, funds, categoryFunds }: DisbursementFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    categoryId: '',
    fundId: '',
    amount: '',
    transactionDate: new Date().toISOString().split('T')[0],
    beneficiaryName: '',
    description: '',
  })

  // Filter available funds based on selected category
  const availableFunds = useMemo(() => {
    if (!formData.categoryId) return []
    const catId = parseInt(formData.categoryId, 10)
    const allowedFundIds = categoryFunds.filter(cf => cf.categoryId === catId).map(cf => cf.fundId)
    return funds.filter(f => allowedFundIds.includes(f.id))
  }, [formData.categoryId, funds, categoryFunds])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!formData.categoryId || !formData.fundId || !formData.amount || !formData.description) {
      setError('Mohon lengkapi semua field yang wajib')
      return
    }

    try {
      setLoading(true)
      const res = await fetch('/api/finance/disbursements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: parseInt(formData.categoryId, 10),
          fundId: parseInt(formData.fundId, 10),
          amount: formData.amount.replace(/\D/g, ''),
          transactionDate: formData.transactionDate,
          beneficiaryName: formData.beneficiaryName || null,
          description: formData.description,
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan draft pengeluaran')

      router.push('/admin/keuangan/pengeluaran')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Format currency display
  const displayAmount = formData.amount
    ? 'Rp' + parseInt(formData.amount.replace(/\D/g, '') || '0', 10).toLocaleString('id-ID')
    : ''

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md border border-red-100 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Kategori Pengeluaran *</label>
          <select
            value={formData.categoryId}
            onChange={(e) => setFormData(prev => ({ ...prev, categoryId: e.target.value, fundId: '' }))}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
          >
            <option value="">Pilih Kategori</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sumber Dana *</label>
          <select
            value={formData.fundId}
            onChange={(e) => setFormData(prev => ({ ...prev, fundId: e.target.value }))}
            required
            disabled={!formData.categoryId}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
          >
            <option value="">Pilih Sumber Dana</option>
            {availableFunds.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>

        {formData.categoryId && availableFunds.length === 0 && (
          <div className="md:col-span-2 flex items-center gap-2 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
            <AlertCircle className="w-4 h-4" />
            Kategori ini belum dipetakan ke Sumber Dana manapun. Hubungi Administrator.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah (Rp) *</label>
          <input
            type="text"
            value={displayAmount}
            onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
            placeholder="Rp0"
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Transaksi *</label>
          <input
            type="date"
            value={formData.transactionDate}
            onChange={(e) => setFormData(prev => ({ ...prev, transactionDate: e.target.value }))}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nama Penerima (Opsional)</label>
        <input
          type="text"
          placeholder="Contoh: PT PLN, Ustadz Ahmad, dll"
          value={formData.beneficiaryName}
          onChange={(e) => setFormData(prev => ({ ...prev, beneficiaryName: e.target.value }))}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan *</label>
        <textarea
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#18085A] focus:border-transparent resize-none h-24"
          placeholder="Jelaskan rincian pengeluaran..."
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          required
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
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
          variant="primary"
          disabled={loading || (formData.categoryId !== '' && availableFunds.length === 0)}
        >
          {loading ? 'Menyimpan...' : 'Simpan Draft'}
        </Button>
      </div>
    </form>
  )
}
