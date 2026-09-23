'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { dryRunAction, prepareRunAction, processChunkAction } from './actions'
import { CheckCircle2, XCircle, AlertCircle, PlayCircle, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function GenerateTab({ options }: { options: any }) {
  const router = useRouter()
  
  const [academicYearId, setAcademicYearId] = useState<string>('')
  const [feeTypeId, setFeeTypeId] = useState<string>('')
  const [period, setPeriod] = useState<string>('')

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [preview, setPreview] = useState<any | null>(null)
  const [previewTuple, setPreviewTuple] = useState<string | null>(null)

  const [isGenerating, setIsGenerating] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  
  const [runResult, setRunResult] = useState<{ runId: number, pendingCount?: number } | null>(null)

  const handleInputChange = (field: string, value: string) => {
    if (field === 'academicYearId') setAcademicYearId(value)
    if (field === 'feeTypeId') setFeeTypeId(value)
    if (field === 'period') setPeriod(value)
  }

  // The preview is intrinsically bound to this tuple.
  const currentTuple = `${academicYearId}-${feeTypeId}-${period}`
  const isPreviewValid = preview !== null && previewTuple === currentTuple

  const formatCurrency = (amount: string | number) => {
    if (!amount) return 'Rp 0'
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(Number(amount))
  }

  const handleSimulasi = async () => {
    if (!academicYearId || !feeTypeId || !period) {
      setError('Harap lengkapi Tahun Ajaran, Jenis Tagihan, dan Periode')
      return
    }

    setError(null)
    setIsLoading(true)
    setPreview(null)
    setRunResult(null)

    const res = await dryRunAction({
      academicYearId: parseInt(academicYearId),
      feeTypeId: parseInt(feeTypeId),
      period
    })

    if (res.success) {
      setPreview(res.data)
      setPreviewTuple(currentTuple)
    } else {
      setError(res.error || 'Terjadi kesalahan')
    }
    
    setIsLoading(false)
  }

  const handleGenerateConfirm = async () => {
    setShowConfirm(false)
    setIsGenerating(true)
    setError(null)

    // Prepare Run
    const prep = await prepareRunAction({
      academicYearId: parseInt(academicYearId),
      feeTypeId: parseInt(feeTypeId),
      period
    })

    if (!prep.success) {
      setError(prep.error || 'Terjadi kesalahan')
      setIsGenerating(false)
      return
    }

    // Process First Chunk
    const chunk = await processChunkAction(prep.runId!)
    if (!chunk.success) {
      setError(chunk.error)
      setIsGenerating(false)
      return
    }

    // Since we don't return full counters from processChunkAction without fetching,
    // we'll just redirect to history tab where they can continue, or we can just say "Berhasil diproses".
    alert('Proses generate (chunk) berhasil dijalankan. Silakan lihat riwayat proses untuk melanjutkan.')
    router.push('?tab=history')
    setIsGenerating(false)
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Parameter Generate</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tahun Ajaran</label>
            <select
              className="w-full border-gray-300 rounded-lg text-sm focus:ring-[#18085A] focus:border-[#18085A]"
              value={academicYearId}
              onChange={(e) => handleInputChange('academicYearId', e.target.value)}
            >
              <option value="">-- Pilih Tahun Ajaran --</option>
              {options.academicYears.map((ay: any) => (
                <option key={ay.id} value={ay.id}>{ay.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Tagihan Bulanan</label>
            <select
              className="w-full border-gray-300 rounded-lg text-sm focus:ring-[#18085A] focus:border-[#18085A]"
              value={feeTypeId}
              onChange={(e) => handleInputChange('feeTypeId', e.target.value)}
            >
              <option value="">-- Pilih Jenis Tagihan --</option>
              {options.feeTypes.map((ft: any) => (
                <option key={ft.id} value={ft.id}>{ft.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Periode (YYYY-MM)</label>
            <input
              type="text"
              placeholder="Contoh: 2024-07"
              className="w-full border-gray-300 rounded-lg text-sm focus:ring-[#18085A] focus:border-[#18085A]"
              value={period}
              onChange={(e) => handleInputChange('period', e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={handleSimulasi} disabled={isLoading || isGenerating}>
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PlayCircle className="w-4 h-4 mr-2" />}
            Simulasi
          </Button>
          <Button 
            onClick={() => setShowConfirm(true)} 
            disabled={!isPreviewValid || isGenerating}
          >
            {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Generate Tagihan'}
          </Button>
        </div>
      </Card>

      {!isPreviewValid && !isLoading && (
        <Card className="p-8 text-center text-gray-500">
          Pilih tahun ajaran, jenis tagihan, dan periode untuk melihat preview.
        </Card>
      )}

      {isPreviewValid && preview && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-sm font-medium text-gray-500">Eligible</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-900">{preview.summary.totalEligible}</span>
                <span className="text-sm text-gray-500">Santri</span>
              </div>
            </Card>
            <Card className="p-4 bg-blue-50/50 border-blue-100">
              <div className="text-sm font-medium text-blue-600">Akan Dibuat</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-blue-700">{preview.summary.totalWillGenerate}</span>
                <span className="text-sm text-blue-600/80">Tagihan</span>
              </div>
            </Card>
            <Card className="p-4 bg-green-50/50 border-green-100">
              <div className="text-sm font-medium text-green-600">Sudah Ada</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-green-700">{preview.summary.totalExisting}</span>
                <span className="text-sm text-green-600/80">Tagihan</span>
              </div>
            </Card>
            <Card className="p-4 bg-red-50/50 border-red-100">
              <div className="text-sm font-medium text-red-600">Tidak Valid</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-red-700">{preview.summary.totalInvalid}</span>
                <span className="text-sm text-red-600/80">Santri</span>
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <h4 className="text-sm font-medium text-gray-900 mb-4">Informasi Tagihan</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 block">Nominal / Santri</span>
                <span className="font-mono font-medium text-gray-900">{formatCurrency(preview.summary.grossAmount)}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Jatuh Tempo</span>
                <span className="font-medium text-gray-900">{preview.summary.dueDate ? new Date(preview.summary.dueDate).toLocaleDateString('id-ID') : '-'}</span>
              </div>
            </div>
          </Card>
          
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50/50">
                  <tr>
                    <th className="px-6 py-4 font-medium">Santri</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium">Alasan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {preview.items.map((item: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4 font-medium text-[#18085A]">ID: {item.studentId}</td>
                      <td className="px-6 py-4">
                        {item.status === 'WILL_GENERATE' && <Badge variant="primary">Akan Dibuat</Badge>}
                        {item.status === 'SKIPPED_EXISTING' && <Badge variant="success">Sudah Ada</Badge>}
                        {item.status === 'INVALID' && <Badge variant="danger">Tidak Valid</Badge>}
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {item.reason}
                        {item.existingInvoiceId && (
                          <span className="block text-xs mt-1">Invoice ID: {item.existingInvoiceId}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Generate Tagihan Berulang</h3>
              <p className="text-sm text-gray-500 mb-6">
                Tagihan yang dibuat masih berstatus Draft dan belum membentuk jurnal.
              </p>
              
              <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Tahun Ajaran</span>
                  <span className="font-medium text-gray-900">{options.academicYears.find((y:any) => y.id === parseInt(academicYearId))?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Jenis Tagihan</span>
                  <span className="font-medium text-gray-900">{options.feeTypes.find((f:any) => f.id === parseInt(feeTypeId))?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Periode</span>
                  <span className="font-medium text-gray-900">{period}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Akan Dibuat</span>
                  <span className="font-medium text-blue-600">{preview?.summary?.totalWillGenerate} Tagihan</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Sudah Ada</span>
                  <span className="font-medium text-green-600">{preview?.summary?.totalExisting} Tagihan</span>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowConfirm(false)}>Batal</Button>
              <Button onClick={handleGenerateConfirm}>Lanjutkan Generate</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
