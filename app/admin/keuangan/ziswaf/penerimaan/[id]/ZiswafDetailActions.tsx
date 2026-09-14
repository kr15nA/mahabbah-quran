'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

export default function ZiswafDetailActions({ receiptId, status, canManage, canRefund }: { receiptId: number, status: string, canManage: boolean, canRefund: boolean }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    if (!confirm('Anda yakin ingin mengonfirmasi penerimaan ZISWAF ini? Aksi ini akan membuat jurnal keuangan secara permanen.')) return
    
    setLoading(true)
    try {
      const res = await fetch(`/api/finance/ziswaf/receipts/${receiptId}/confirm`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal konfirmasi')
      
      alert('Penerimaan berhasil dikonfirmasi!')
      router.refresh()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!confirm('Batalkan penerimaan ini? DRAFT akan dibatalkan.')) return
    
    setLoading(true)
    try {
      const res = await fetch(`/api/finance/ziswaf/receipts/${receiptId}/cancel`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal batal')
      
      router.refresh()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRefund = async () => {
    if (!confirm('Anda yakin ingin me-refund (mengembalikan) penerimaan ZISWAF ini? Jurnal akan direversal secara permanen.')) return
    
    setLoading(true)
    try {
      const res = await fetch(`/api/finance/ziswaf/receipts/${receiptId}/refund`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Gagal refund')
      
      alert('Refund berhasil. Jurnal telah direversal.')
      router.refresh()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'DRAFT' && canManage) {
    return (
      <>
        <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={handleCancel} disabled={loading}>Batal</Button>
        <Button className="bg-[#18085A] text-white hover:bg-[#18085A]/90" onClick={handleConfirm} disabled={loading}>Konfirmasi</Button>
      </>
    )
  }

  if (status === 'CONFIRMED' && canRefund) {
    return (
      <Button variant="outline" className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50" onClick={handleRefund} disabled={loading}>Refund</Button>
    )
  }

  return null
}
