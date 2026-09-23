'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import Pagination from '@/components/ui/Pagination'
import { processChunkAction } from './actions'
import { PlayCircle, Eye, RefreshCw, RotateCcw, Loader2 } from 'lucide-react'
import Link from 'next/link'

export function HistoryTab({ runs, pagination, filters, options }: { runs: any[], pagination: any, filters: any, options: any }) {
  const [processingId, setProcessingId] = useState<number | null>(null)

  const handleProcessChunk = async (runId: number) => {
    setProcessingId(runId)
    const res = await processChunkAction(runId)
    setProcessingId(null)
    if (res.success) {
      window.location.reload()
    } else {
      alert(res.error)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING': return <Badge variant="warning">Menunggu</Badge>
      case 'RUNNING': return <Badge variant="primary">Diproses</Badge>
      case 'COMPLETED': return <Badge variant="success">Selesai</Badge>
      case 'COMPLETED_WITH_ERRORS': return <Badge variant="danger">Selesai dengan Kendala</Badge>
      case 'FAILED': return <Badge variant="danger">Gagal</Badge>
      default: return <Badge variant="neutral">{status}</Badge>
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 font-medium">Periode</th>
                <th className="px-6 py-4 font-medium">Tahun Ajaran / Jenis Tagihan</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Metrik (Eligible/Dibuat/Skipped/Gagal)</th>
                <th className="px-6 py-4 font-medium">Selesai Pada</th>
                <th className="px-6 py-4 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {runs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Belum ada riwayat proses generate tagihan berulang.
                  </td>
                </tr>
              ) : (
                runs.map((run) => (
                  <tr key={run.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-medium text-[#18085A]">{run.period}</td>
                    <td className="px-6 py-4">
                      <div>{run.academicYear}</div>
                      <div className="text-xs text-gray-500">{run.feeTypeName}</div>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(run.status)}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 font-mono text-xs">
                        <span className="text-gray-500" title="Eligible">{run.totalEligible}</span>/
                        <span className="text-blue-600" title="Dibuat">{run.totalGenerated}</span>/
                        <span className="text-green-600" title="Sudah Ada">{run.totalSkipped}</span>/
                        <span className="text-red-600" title="Gagal">{run.totalFailed}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {run.completedAt ? new Date(run.completedAt).toLocaleString('id-ID') : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {(run.status === 'PENDING' || run.status === 'RUNNING') && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleProcessChunk(run.id)}
                            disabled={processingId === run.id}
                          >
                            {processingId === run.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4 mr-1" />}
                            {run.status === 'PENDING' ? 'Mulai' : 'Lanjutkan'}
                          </Button>
                        )}
                        {(run.status === 'COMPLETED') && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                              if(confirm('Jalankan lagi akan memproses assignment baru yang baru ditambahkan untuk periode ini. Lanjutkan?')) {
                                handleProcessChunk(run.id)
                              }
                            }}
                            disabled={processingId === run.id}
                          >
                            {processingId === run.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                            Jalankan Lagi
                          </Button>
                        )}
                        {(run.status === 'COMPLETED_WITH_ERRORS' || run.status === 'FAILED') && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleProcessChunk(run.id)}
                            disabled={processingId === run.id}
                          >
                            {processingId === run.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-1" />}
                            Coba Lagi
                          </Button>
                        )}
                        
                        <Link href={`/admin/keuangan/tagihan/berulang/runs/${run.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-1" />
                            Detail
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination 
          currentPage={pagination.page} 
          totalPages={pagination.totalPages} 
          totalItems={pagination.total} 
          limit={20} 
        />
      </Card>
    </div>
  )
}
