'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ArrowLeft, CheckCircle, XCircle, Printer, RefreshCw, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

export default function PaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  // React 19 / Next 15 pattern for params in Client Components
  const { id } = use(params)
  
  const [payment, setPayment] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isConfirming, setIsConfirming] = useState(false)
  const [isRefunding, setIsRefunding] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showRefundModal, setShowRefundModal] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchPayment()
  }, [id])

  const fetchPayment = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/finance/payments/${id}`)
      if (res.ok) {
        const json = await res.json()
        setPayment(json.data)
      } else {
        const json = await res.json()
        setError(json.error || 'Gagal memuat pembayaran')
      }
    } catch (e) {
      console.error(e)
      setError('Terjadi kesalahan sistem')
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (val: string) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(Number(val))
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING': return <Badge variant="warning">Menunggu</Badge>
      case 'CONFIRMED': return <Badge variant="success">Dikonfirmasi</Badge>
      case 'REFUNDED': return <Badge variant="neutral">Dikembalikan</Badge>
      case 'CANCELLED': return <Badge variant="danger">Dibatalkan</Badge>
      default: return <Badge variant="neutral">{status}</Badge>
    }
  }

  const handleConfirm = async () => {
    setIsConfirming(true)
    setError('')
    try {
      const res = await fetch(`/api/finance/payments/${id}/confirm`, { method: 'POST' })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Gagal mengkonfirmasi pembayaran')
      }
      setShowConfirmModal(false)
      fetchPayment()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsConfirming(false)
    }
  }

  const handleRefund = async () => {
    setIsRefunding(true)
    setError('')
    try {
      const res = await fetch(`/api/finance/payments/${id}/refund`, { method: 'POST' })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Gagal me-refund pembayaran (Pastikan Anda memiliki izin Refund)')
      }
      setShowRefundModal(false)
      fetchPayment()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsRefunding(false)
    }
  }

  const handleCancel = async () => {
    if (!confirm('Yakin ingin membatalkan pembayaran ini?')) return
    setIsCancelling(true)
    setError('')
    try {
      const res = await fetch(`/api/finance/payments/${id}/cancel`, { method: 'POST' })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Gagal membatalkan pembayaran')
      }
      fetchPayment()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsCancelling(false)
    }
  }

  if (isLoading) return <div className="p-8 text-center text-gray-500">Memuat rincian pembayaran...</div>
  if (!payment) return <div className="p-8 text-center text-red-500">{error || 'Pembayaran tidak ditemukan'}</div>

  const allocatedTotal = payment.allocations.reduce((sum: number, a: any) => sum + Number(a.allocatedAmount), 0)

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/admin/keuangan/pembayaran">
          <Button variant="outline" size="sm" className="rounded-full w-10 h-10 p-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Pembayaran {payment.paymentNumber}</h2>
          <p className="text-sm text-gray-500">Detail dan alokasi pembayaran</p>
        </div>
        <div className="ml-auto">
          {getStatusBadge(payment.status)}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {/* Action Bar */}
      <Card className="p-4 bg-gray-50 border-dashed border-2 flex flex-wrap gap-3">
        {payment.status === 'PENDING' && (
          <>
            <Button onClick={() => setShowConfirmModal(true)} className="bg-[#18085A] text-white hover:bg-[#18085A]/90">
              <CheckCircle className="w-4 h-4 mr-2" /> Konfirmasi Pembayaran
            </Button>
            <Button onClick={handleCancel} disabled={isCancelling} variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
              <XCircle className="w-4 h-4 mr-2" /> Batalkan
            </Button>
          </>
        )}

        {payment.status === 'CONFIRMED' && (
          <>
            <Button onClick={() => alert('Fitur cetak kuitansi dalam pengembangan')} variant="outline">
              <Printer className="w-4 h-4 mr-2" /> Cetak Kuitansi
            </Button>
            <Button onClick={() => setShowRefundModal(true)} variant="outline" className="text-orange-600 border-orange-200 hover:bg-orange-50 ml-auto">
              <RefreshCw className="w-4 h-4 mr-2" /> Refund (Batalkan Final)
            </Button>
          </>
        )}
        
        {payment.status === 'REFUNDED' && (
          <div className="text-sm text-gray-500 flex items-center">
            <AlertTriangle className="w-4 h-4 mr-2" /> Pembayaran ini telah direfund dan jurnal telah dibalik.
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 space-y-4">
          <h3 className="text-lg font-semibold border-b pb-2">Informasi Pembayaran</h3>
          <div className="grid grid-cols-2 gap-y-4 text-sm">
            <div className="text-gray-500">Tanggal</div>
            <div className="font-medium">{new Date(payment.paymentDate).toLocaleDateString('id-ID')}</div>
            
            <div className="text-gray-500">Siswa</div>
            <div className="font-medium">{payment.studentName}</div>
            
            <div className="text-gray-500">Nominal</div>
            <div className="font-mono font-bold text-lg text-[#18085A]">{formatCurrency(payment.amount)}</div>
            
            <div className="text-gray-500">Metode</div>
            <div className="font-medium">{payment.paymentMethod}</div>
            
            <div className="text-gray-500">Rekening Tujuan</div>
            <div className="font-medium">{payment.destinationAccountName || '-'}</div>
            
            <div className="text-gray-500">No. Referensi</div>
            <div className="font-medium">{payment.referenceNumber || '-'}</div>
            
            <div className="text-gray-500">Catatan</div>
            <div className="font-medium">{payment.notes || '-'}</div>
            
            <div className="text-gray-500">Penerima</div>
            <div className="font-medium">{payment.receivedBy || '-'}</div>
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h3 className="text-lg font-semibold border-b pb-2 flex justify-between">
            <span>Alokasi Tagihan</span>
            <span className="text-sm font-normal text-gray-500">
              Total: <span className="font-mono font-semibold text-gray-900">{formatCurrency(allocatedTotal.toString())}</span>
            </span>
          </h3>
          
          {payment.allocations.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">Belum ada alokasi tagihan</div>
          ) : (
            <div className="space-y-4">
              {payment.allocations.map((alloc: any) => (
                <div key={alloc.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border">
                  <div>
                    <div className="font-medium text-[#18085A]">{alloc.invoiceNumber}</div>
                    <div className="text-xs text-gray-500">{alloc.feeTypeName} {alloc.period ? `(${alloc.period})` : ''}</div>
                  </div>
                  <div className="font-mono font-medium">
                    {formatCurrency(alloc.allocatedAmount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Confirm Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold">Konfirmasi Pembayaran</h3>
              <button onClick={() => setShowConfirmModal(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Periksa kembali rincian pembayaran ini sebelum dikonfirmasi. Aksi ini akan mencatat jurnal akuntansi dan mengubah status tagihan.
              </p>
              <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm border">
                <div className="flex justify-between">
                  <span className="text-gray-500">Nominal Pembayaran:</span>
                  <span className="font-mono font-semibold">{formatCurrency(payment.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Alokasi:</span>
                  <span className="font-mono font-semibold text-green-600">{formatCurrency(allocatedTotal.toString())}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Rekening Tujuan:</span>
                  <span className="font-medium">{payment.destinationAccountName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Jumlah Tagihan Dibayar:</span>
                  <span className="font-medium">{payment.allocations.length} Tagihan</span>
                </div>
              </div>
              
              {Number(payment.amount) !== allocatedTotal && (
                <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-200">
                  <AlertTriangle className="w-4 h-4 inline mr-2" />
                  Sisa nominal belum dialokasikan sepenuhnya! Anda tidak dapat mengkonfirmasi pembayaran ini.
                </div>
              )}
              
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowConfirmModal(false)}>Batal</Button>
                <Button 
                  className="bg-[#18085A] text-white hover:bg-[#18085A]/90"
                  onClick={handleConfirm}
                  disabled={isConfirming || Number(payment.amount) !== allocatedTotal}
                >
                  {isConfirming ? 'Menyimpan...' : 'Ya, Konfirmasi'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-semibold text-red-600">Refund Pembayaran</h3>
              <button onClick={() => setShowRefundModal(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-orange-50 text-orange-800 p-4 rounded-lg border border-orange-200 space-y-2">
                <p className="font-bold flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Peringatan: Refund Penuh (Full Refund)
                </p>
                <ul className="list-disc list-inside text-sm space-y-1 ml-1">
                  <li>Jurnal akuntansi penerimaan ini akan <strong>dibalik (direverse)</strong> secara otomatis.</li>
                  <li>Status {payment.allocations.length} tagihan yang terkait akan dikembalikan ke posisi semula (dibuka kembali).</li>
                  <li>Status pembayaran akan menjadi <strong>REFUNDED</strong> secara permanen.</li>
                </ul>
              </div>
              
              <p className="text-sm font-medium">Apakah Anda yakin ingin membatalkan/me-refund pembayaran ini?</p>
              
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowRefundModal(false)}>Batal</Button>
                <Button 
                  className="bg-orange-600 text-white hover:bg-orange-700"
                  onClick={handleRefund}
                  disabled={isRefunding}
                >
                  {isRefunding ? 'Memproses...' : 'Ya, Lakukan Refund'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
