'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

import { Search, Loader2 } from 'lucide-react'

export default function CreatePaymentPage() {
  const router = useRouter()
  const [students, setStudents] = useState<any[]>([])
  const [searchStudent, setSearchStudent] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  
  const [accounts, setAccounts] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  
  const [isLoadingStudents, setIsLoadingStudents] = useState(false)
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [amountStr, setAmountStr] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER')
  const [destinationAccountId, setDestinationAccountId] = useState('')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [notes, setNotes] = useState('')
  
  const [allocations, setAllocations] = useState<Record<number, string>>({})
  const [error, setError] = useState('')

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/finance/accounts?type=ASSET')
      if (res.ok) {
        const json = await res.json()
        setAccounts(json.data || [])
        if (json.data && json.data.length > 0) {
          setDestinationAccountId(json.data[0].id.toString())
        }
      }
    } catch (e) {
      console.error(e)
    }
  }

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchStudent.length > 2) {
        searchStudentsFetch()
      } else {
        setStudents([])
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [searchStudent])

  const searchStudentsFetch = async () => {
    setIsLoadingStudents(true)
    try {
      // Simplistic search endpoint assuming it filters by query
      const res = await fetch(`/api/students?query=${encodeURIComponent(searchStudent)}`)
      if (res.ok) {
        const json = await res.json()
        setStudents(json.data || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoadingStudents(false)
    }
  }

  const selectStudent = async (student: any) => {
    setSelectedStudent(student)
    setSearchStudent('')
    setStudents([])
    setInvoices([])
    setAllocations({})
    setIsLoadingInvoices(true)
    
    try {
      const res = await fetch(`/api/finance/invoices?studentId=${student.id}&status=ISSUED,PARTIALLY_PAID`)
      if (res.ok) {
        const json = await res.json()
        setInvoices(json.data || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoadingInvoices(false)
    }
  }

  const formatCurrency = (val: string | bigint) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(Number(val))
  }

  // Parses raw numeric string
  const cleanAmount = (val: string) => val.replace(/\D/g, '')

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = cleanAmount(e.target.value)
    setAmountStr(raw)
  }

  const handleAllocationChange = (invoiceId: number, val: string) => {
    const raw = cleanAmount(val)
    setAllocations(prev => ({ ...prev, [invoiceId]: raw }))
  }

  const autoAllocate = () => {
    const totalAmount = BigInt(amountStr || '0')
    let remaining = totalAmount
    const newAllocations: Record<number, string> = {}

    // Sort by due date, then invoice number
    const sorted = [...invoices].sort((a, b) => {
      if (a.dueDate !== b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      return a.invoiceNumber.localeCompare(b.invoiceNumber)
    })

    for (const inv of sorted) {
      if (remaining <= BigInt(0)) break
      
      // Calculate outstanding for this invoice
      const outstanding = BigInt(inv.amount) - BigInt(inv.paidAmount || '0')
      if (outstanding <= BigInt(0)) continue
      
      const allocateAmt = remaining > outstanding ? outstanding : remaining
      newAllocations[inv.id] = allocateAmt.toString()
      remaining -= allocateAmt
    }

    setAllocations(newAllocations)
  }

  const totalPayment = BigInt(amountStr || '0')
  const totalAllocated = Object.values(allocations).reduce((sum, val) => sum + BigInt(val || '0'), BigInt(0))
  const remainingAmount = totalPayment - totalAllocated

  const handleSubmit = async () => {
    setError('')
    if (!selectedStudent) return setError('Pilih siswa terlebih dahulu')
    if (totalPayment <= BigInt(0)) return setError('Nominal pembayaran harus lebih dari 0')
    if (remainingAmount !== BigInt(0)) return setError('Sisa nominal belum dialokasikan sepenuhnya')
    if (!destinationAccountId) return setError('Pilih rekening tujuan')

    const allocsToSend = Object.entries(allocations)
      .filter(([_, amt]) => BigInt(amt) > BigInt(0))
      .map(([invId, amt]) => ({ invoiceId: Number(invId), amount: amt }))
      
    if (allocsToSend.length === 0) return setError('Tidak ada alokasi tagihan')

    setIsSubmitting(true)
    try {
      // 1. Create Payment
      const payRes = await fetch('/api/finance/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          amount: amountStr,
          paymentDate,
          paymentMethod,
          destinationAccountId: Number(destinationAccountId),
          referenceNumber: referenceNumber || undefined,
          notes: notes || undefined
        })
      })
      
      if (!payRes.ok) {
        const errorData = await payRes.json()
        throw new Error(errorData.error || 'Gagal membuat pembayaran')
      }
      
      const payData = await payRes.json()
      const paymentId = payData.data.paymentId

      // 2. Allocate
      const allocRes = await fetch(`/api/finance/payments/${paymentId}/allocations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allocations: allocsToSend })
      })
      
      if (!allocRes.ok) {
        const errorData = await allocRes.json()
        throw new Error(errorData.error || 'Gagal menyimpan alokasi pembayaran')
      }

      router.push(`/admin/keuangan/pembayaran/${paymentId}`)
    } catch (e: any) {
      console.error(e)
      setError(e.message)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Input Pembayaran Baru</h2>
        <p className="text-sm text-gray-500">Buat penerimaan pembayaran dan alokasikan ke tagihan siswa</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* STEP 1: Select Student */}
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">1. Pilih Siswa</h3>
            {selectedStudent ? (
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border">
                <div>
                  <div className="font-medium">{selectedStudent.fullName}</div>
                  <div className="text-sm text-gray-500">{selectedStudent.nis || '-'}</div>
                </div>
                <Button variant="outline" size="sm" onClick={() => {
                  setSelectedStudent(null)
                  setInvoices([])
                  setAllocations({})
                  setAmountStr('')
                }}>
                  Ganti
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
                <input 
                  type="text"
                  placeholder="Ketik nama atau NIS siswa..." 
                  className="pl-10 w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  value={searchStudent}
                  onChange={(e: any) => setSearchStudent(e.target.value)}
                />
                {isLoadingStudents && <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-3 text-gray-400" />}
                
                {students.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg border max-h-60 overflow-auto">
                    {students.map(s => (
                      <div 
                        key={s.id} 
                        className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-0"
                        onClick={() => selectStudent(s)}
                      >
                        <div className="font-medium">{s.fullName}</div>
                        <div className="text-sm text-gray-500">{s.nis || 'Tanpa NIS'}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* STEP 2: Payment Details */}
          {selectedStudent && (
            <Card className="p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">2. Rincian Pembayaran</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Tanggal Bayar</label>
                  <input type="date" value={paymentDate} onChange={(e: any) => setPaymentDate(e.target.value)} className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Total Bayar (Rp)</label>
                  <input 
                    type="text" 
                    value={amountStr ? new Intl.NumberFormat('id-ID').format(Number(amountStr)) : ''} 
                    onChange={handleAmountChange} 
                    placeholder="0"
                    className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Metode Pembayaran</label>
                  <select value={paymentMethod} onChange={(e: any) => setPaymentMethod(e.target.value)} className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                    <option value="BANK_TRANSFER">Transfer Bank</option>
                    <option value="CASH">Tunai</option>
                    <option value="QRIS">QRIS</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Rekening Tujuan</label>
                  <select value={destinationAccountId} onChange={(e: any) => setDestinationAccountId(e.target.value)} className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id.toString()}>{acc.name} ({acc.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">No. Referensi (Opsional)</label>
                  <input type="text" value={referenceNumber} onChange={(e: any) => setReferenceNumber(e.target.value)} placeholder="Contoh: INV-TRF-001" className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Catatan (Opsional)</label>
                  <input type="text" value={notes} onChange={(e: any) => setNotes(e.target.value)} placeholder="Catatan internal..." className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                </div>
              </div>
            </Card>
          )}

          {/* STEP 3: Allocation */}
          {selectedStudent && (
            <Card className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-900">3. Alokasi ke Tagihan</h3>
                <Button variant="outline" size="sm" onClick={autoAllocate} disabled={totalPayment <= BigInt(0) || invoices.length === 0}>
                  Alokasikan Otomatis
                </Button>
              </div>
              
              {isLoadingInvoices ? (
                <div className="text-center py-4 text-gray-500">Memuat tagihan...</div>
              ) : invoices.length === 0 ? (
                <div className="text-center py-4 text-gray-500">Tidak ada tagihan yang belum lunas.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase border-b">
                      <tr>
                        <th className="py-2 px-2">No. Tagihan</th>
                        <th className="py-2 px-2">Sisa Tagihan</th>
                        <th className="py-2 px-2 w-32">Dialokasikan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {invoices.map(inv => {
                        const outstanding = BigInt(inv.amount) - BigInt(inv.paidAmount || '0')
                        const allocVal = allocations[inv.id] || ''
                        
                        return (
                          <tr key={inv.id}>
                            <td className="py-3 px-2">
                              <div className="font-medium text-[#18085A]">{inv.invoiceNumber}</div>
                              <div className="text-xs text-gray-500">{new Date(inv.dueDate).toLocaleDateString('id-ID')}</div>
                            </td>
                            <td className="py-3 px-2 font-mono text-gray-700">
                              {formatCurrency(outstanding.toString())}
                            </td>
                            <td className="py-3 px-2">
                              <input 
                                type="text" 
                                className="w-full text-right border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                placeholder="0"
                                value={allocVal ? new Intl.NumberFormat('id-ID').format(Number(allocVal)) : ''}
                                onChange={(e: any) => handleAllocationChange(inv.id, e.target.value)}
                              />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Floating Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <Card className="p-6 space-y-6">
              <h3 className="font-semibold text-gray-900 border-b pb-2">Ringkasan Pembayaran</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Pembayaran</span>
                  <span className="font-mono font-medium">{formatCurrency(totalPayment.toString())}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Dialokasikan</span>
                  <span className="font-mono text-green-600">{formatCurrency(totalAllocated.toString())}</span>
                </div>
                <div className="flex justify-between border-t pt-3 font-semibold">
                  <span>Sisa (Belum Dialokasi)</span>
                  <span className={`font-mono ${remainingAmount > BigInt(0) ? 'text-red-500' : 'text-gray-900'}`}>
                    {formatCurrency(remainingAmount.toString())}
                  </span>
                </div>
              </div>

              <Button 
                className="w-full bg-[#D4AF37] hover:bg-[#B3932F] text-[#18085A] disabled:opacity-50 disabled:bg-gray-300 disabled:text-gray-500"
                onClick={handleSubmit}
                disabled={isSubmitting || totalPayment <= BigInt(0) || remainingAmount !== BigInt(0) || !selectedStudent}
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</>
                ) : (
                  'Simpan & Lanjutkan'
                )}
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
