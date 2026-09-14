'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '../../../../../components/ui/Button'
import { Printer, CheckCircle, Send, XCircle, Undo2 } from 'lucide-react'

interface Props {
  id: number
  status: string
  requesterId: number
  currentUserId: number
  canManage: boolean
  canApprove: boolean
  canPay: boolean
  canReverse: boolean
  assetAccounts: { id: number, name: string }[]
}

export default function DisbursementActions({
  id, status, requesterId, currentUserId, canManage, canApprove, canPay, canReverse, assetAccounts
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [showPayModal, setShowPayModal] = useState(false)
  const [paymentAccountId, setPaymentAccountId] = useState('')

  const handleAction = async (action: 'submit' | 'approve' | 'cancel' | 'reverse' | 'pay') => {
    try {
      setError('')
      setLoading(true)
      
      const body = action === 'pay' ? JSON.stringify({ paymentAccountId: parseInt(paymentAccountId, 10) }) : undefined

      const res = await fetch(`/api/finance/disbursements/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Aksi gagal')

      setShowPayModal(false)
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const isMaker = requesterId === currentUserId

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <div className="bg-red-50 text-red-700 p-2 rounded-md border border-red-100 text-sm mb-2">
          {error}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 justify-end">
        {status === 'DRAFT' && canManage && (
          <>
            <Button variant="secondary" onClick={() => handleAction('cancel')} disabled={loading}>
              <XCircle className="w-4 h-4 mr-2" /> Batalkan
            </Button>
            <Button variant="primary" onClick={() => handleAction('submit')} disabled={loading}>
              <Send className="w-4 h-4 mr-2" /> Ajukan
            </Button>
          </>
        )}

        {status === 'PENDING_APPROVAL' && (
          <>
            {canManage && (
              <Button variant="secondary" onClick={() => handleAction('cancel')} disabled={loading}>
                Batalkan
              </Button>
            )}
            {canApprove && !isMaker && (
              <Button variant="primary" onClick={() => handleAction('approve')} disabled={loading}>
                <CheckCircle className="w-4 h-4 mr-2" /> Setujui
              </Button>
            )}
          </>
        )}

        {status === 'APPROVED' && (
          <>
            {canManage && (
              <Button variant="secondary" onClick={() => handleAction('cancel')} disabled={loading}>
                Batalkan
              </Button>
            )}
            {canPay && (
              <Button variant="primary" onClick={() => setShowPayModal(true)} disabled={loading}>
                <CheckCircle className="w-4 h-4 mr-2" /> Bayar
              </Button>
            )}
          </>
        )}

        {status === 'PAID' && (
          <>
            <Button variant="secondary" onClick={() => router.push(`/admin/keuangan/pengeluaran/${id}/cetak`)}>
              <Printer className="w-4 h-4 mr-2" /> Cetak Voucher
            </Button>
            {canReverse && (
              <Button variant="danger" onClick={() => {
                if (confirm('Anda yakin ingin membalikkan (reverse) transaksi ini? Jurnal akan dibalik dan status menjadi REVERSED.')) {
                  handleAction('reverse')
                }
              }} disabled={loading}>
                <Undo2 className="w-4 h-4 mr-2" /> Reverse
              </Button>
            )}
          </>
        )}

        {status === 'REVERSED' && (
          <Button variant="secondary" onClick={() => router.push(`/admin/keuangan/pengeluaran/${id}/cetak`)}>
            <Printer className="w-4 h-4 mr-2" /> Cetak Voucher
          </Button>
        )}
      </div>

      {showPayModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Pilih Akun Pembayaran</h3>
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Pilih akun kas/bank yang digunakan untuk membayar pengeluaran ini.</p>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Akun Pembayaran (Asset)</label>
                <select
                  value={paymentAccountId}
                  onChange={(e) => setPaymentAccountId(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
                >
                  <option value="">Pilih Kas/Bank</option>
                  {assetAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button variant="secondary" onClick={() => setShowPayModal(false)} disabled={loading}>
                  Batal
                </Button>
                <Button 
                  variant="primary" 
                  onClick={() => handleAction('pay')} 
                  disabled={loading || !paymentAccountId}
                >
                  {loading ? 'Memproses...' : 'Proses Pembayaran'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
