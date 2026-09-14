'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function ZiswafReceiptForm({ parties, categories, campaigns, assetAccounts }: any) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [partyId, setPartyId] = useState<string>('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [ziswafType, setZiswafType] = useState<string>('')
  const [campaignId, setCampaignId] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [receivedDate, setReceivedDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [paymentMethod, setPaymentMethod] = useState<string>('BANK_TRANSFER')
  const [destinationAccountId, setDestinationAccountId] = useState<string>('')
  const [referenceNumber, setReferenceNumber] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  
  const [compatibleFunds, setCompatibleFunds] = useState<any[]>([])
  const [allocations, setAllocations] = useState<{ fundId: number, amount: string }[]>([])

  useEffect(() => {
    // When category changes, set the ZISWAF type from the category
    if (categoryId) {
      const cat = categories.find((c: any) => c.id.toString() === categoryId)
      if (cat && cat.ziswafType) {
        setZiswafType(cat.ziswafType)
      } else {
        setZiswafType('')
      }
      
      // Fetch compatible funds
      fetch(`/api/finance/ziswaf/compatible-funds?categoryId=${categoryId}`)
        .then(r => r.json())
        .then(res => {
          if (res.data) setCompatibleFunds(res.data)
        })
    } else {
      setZiswafType('')
      setCompatibleFunds([])
    }
  }, [categoryId, categories])

  useEffect(() => {
    // When campaign changes, if it has a default fund and it's compatible, we could pre-fill allocations
    if (campaignId && compatibleFunds.length > 0 && amount) {
      const camp = campaigns.find((c: any) => c.id.toString() === campaignId)
      if (camp && camp.defaultFundId) {
        const isCompatible = compatibleFunds.some(f => f.id === camp.defaultFundId)
        if (isCompatible) {
          setAllocations([{ fundId: camp.defaultFundId, amount: amount }])
        }
      }
    }
  }, [campaignId, compatibleFunds, campaigns, amount])

  const totalAllocated = allocations.reduce((acc, a) => acc + (parseInt(a.amount || '0', 10) || 0), 0)
  const amountNum = parseInt(amount || '0', 10) || 0
  const remaining = amountNum - totalAllocated

  const handleAddAllocation = (fundId: number) => {
    if (remaining <= 0) return
    setAllocations(prev => [...prev, { fundId, amount: remaining.toString() }])
  }

  const handleRemoveAllocation = (index: number) => {
    setAllocations(prev => prev.filter((_, i) => i !== index))
  }

  const handleAllocationChange = (index: number, val: string) => {
    setAllocations(prev => {
      const newA = [...prev]
      newA[index].amount = val
      return newA
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    if (!categoryId || !destinationAccountId || !amount || amountNum <= 0) {
      setError('Harap lengkapi semua field yang wajib.')
      setLoading(false)
      return
    }

    // if (remaining !== 0) {
    //   // Note: UI allows partial allocation on DRAFT, but we can enforce strict here if we want.
    //   // Let's enforce strict for simplicity.
    // }

    try {
      const payload = {
        partyId: partyId ? parseInt(partyId, 10) : null, // null for anonymous
        categoryId: parseInt(categoryId, 10),
        ziswafType: ziswafType || 'OTHER',
        campaignId: campaignId ? parseInt(campaignId, 10) : null,
        amount: amount,
        receivedDate,
        paymentMethod,
        destinationAccountId: parseInt(destinationAccountId, 10),
        referenceNumber,
        notes,
        allocations: allocations.map(a => ({ fundId: a.fundId, amount: a.amount }))
      }

      const res = await fetch('/api/finance/ziswaf/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal menyimpan penerimaan')

      router.push(`/admin/keuangan/ziswaf/penerimaan/${data.data.id}`)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md border border-red-100 text-sm">
          {error}
        </div>
      )}

      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-4 text-gray-900 border-b pb-2">Informasi Umum</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Donatur</label>
            <select
              value={partyId}
              onChange={(e) => setPartyId(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
            >
              <option value="">-- Hamba Allah (Anonim) --</option>
              {parties.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name} ({p.partyType})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Terima *</label>
            <input 
              type="date"
              required
              value={receivedDate}
              onChange={(e) => setReceivedDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kategori ZISWAF *</label>
            <select
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
            >
              <option value="">Pilih Kategori...</option>
              {categories.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name} {c.ziswafType ? `(${c.ziswafType})` : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipe ZISWAF</label>
            <input 
              type="text"
              readOnly
              value={ziswafType}
              placeholder="Otomatis dari kategori"
              className="bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Program / Campaign</label>
            <select
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
            >
              <option value="">Tidak ada program (General)</option>
              {campaigns.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah (Rp) *</label>
            <input 
              type="number"
              required
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Contoh: 1000000"
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-4 text-gray-900 border-b pb-2">Pembayaran</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Metode *</label>
            <select
              required
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
            >
              <option value="CASH">Tunai (CASH)</option>
              <option value="BANK_TRANSFER">Transfer Bank</option>
              <option value="QRIS">QRIS</option>
              <option value="OTHER">Lainnya</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Akun Tujuan (Kas/Bank) *</label>
            <select
              required
              value={destinationAccountId}
              onChange={(e) => setDestinationAccountId(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
            >
              <option value="">Pilih Akun...</option>
              {assetAccounts.map((a: any) => (
                <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">No. Referensi</label>
            <input 
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="Ref transaksi bank/bukti"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
            <input 
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Keterangan tambahan"
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex justify-between items-center mb-4 border-b pb-2">
          <h3 className="font-semibold text-lg text-gray-900">Alokasi Dana</h3>
          <div className="text-sm font-medium">
            Sisa: <span className={remaining < 0 ? 'text-red-600' : remaining > 0 ? 'text-amber-600' : 'text-green-600'}>Rp {new Intl.NumberFormat('id-ID').format(remaining)}</span>
          </div>
        </div>

        {!categoryId ? (
          <p className="text-sm text-gray-500">Pilih kategori ZISWAF terlebih dahulu untuk melihat dana yang kompatibel.</p>
        ) : compatibleFunds.length === 0 ? (
          <p className="text-sm text-red-600">Tidak ada dana yang kompatibel dengan kategori ini. Silakan periksa konfigurasi Kategori-Dana.</p>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap mb-4">
              {compatibleFunds.map(f => (
                <button
                  key={f.id}
                  type="button"
                  disabled={remaining <= 0}
                  onClick={() => handleAddAllocation(f.id)}
                  className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 disabled:opacity-50 transition-colors border border-blue-200"
                >
                  + {f.name} {f.isDefault ? '(Default)' : ''}
                </button>
              ))}
            </div>

            {allocations.map((alloc, idx) => {
              const fundName = compatibleFunds.find(f => f.id === alloc.fundId)?.name || 'Unknown Fund'
              return (
                <div key={idx} className="flex items-center gap-4 bg-gray-50 p-3 rounded-md border border-gray-100">
                  <div className="flex-1 font-medium text-sm text-gray-800">{fundName}</div>
                  <div className="w-48">
                    <input 
                      type="number"
                      min="1"
                      required
                      value={alloc.amount}
                      onChange={(e) => handleAllocationChange(idx, e.target.value)}
                      placeholder="Jumlah (Rp)"
                      className="h-8 text-sm"
                    />
                  </div>
                  <button type="button" onClick={() => handleRemoveAllocation(idx)} className="text-red-500 hover:text-red-700 text-sm font-medium px-2">
                    Hapus
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => router.back()}
          disabled={loading}
        >
          Batal
        </Button>
        <Button 
          type="submit" 
          className="bg-[#18085A] hover:bg-[#18085A]/90 text-white"
          disabled={loading || remaining < 0 || !categoryId}
        >
          {loading ? 'Menyimpan...' : 'Simpan DRAFT'}
        </Button>
      </div>
    </form>
  )
}
