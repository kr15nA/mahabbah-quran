'use client'

import { useState, useEffect, useRef } from 'react'
import { Sparkles, AlertCircle, Clock, RefreshCw } from 'lucide-react'
import { generateGuruTahfizAiSummaryAction } from './actions'
import type { GuruTahfizAiResult } from '@/lib/ai/tahfiz'

export default function GuruTahfizAiCard({ studentId }: { studentId: number }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<GuruTahfizAiResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rateLimited, setRateLimited] = useState(false)
  const [retryAfter, setRetryAfter] = useState<number | null>(null)

  const activeStudentIdRef = useRef(studentId)

  // Clear state when studentId changes
  useEffect(() => {
    activeStudentIdRef.current = studentId
    setResult(null)
    setError(null)
    setRateLimited(false)
    setRetryAfter(null)
  }, [studentId])

  const handleGenerate = async () => {
    if (!studentId) return
    setLoading(true)
    setError(null)
    setResult(null)
    setRateLimited(false)
    setRetryAfter(null)

    try {
      const res = await generateGuruTahfizAiSummaryAction(studentId)
      if (activeStudentIdRef.current !== studentId) return // Prevent stale response race

      if (res.success && res.data) {
        setResult(res.data)
      } else if (res.rateLimited) {
        setRateLimited(true)
        setRetryAfter(res.retryAfterSeconds ?? null)
        setError(res.error || 'Terlalu banyak permintaan.')
      } else {
        setError(res.error || 'Gagal memuat ringkasan AI.')
      }
    } catch (err: any) {
      if (activeStudentIdRef.current !== studentId) return // Prevent stale response race
      setError(err.message || 'Terjadi kesalahan sistem.')
    } finally {
      if (activeStudentIdRef.current === studentId) {
        setLoading(false)
      }
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-purple-200 shadow-sm overflow-hidden mb-4 relative">
      <div className="p-4 border-b border-purple-100 bg-gradient-to-r from-purple-50 to-white flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <h3 className="font-bold text-gray-900 text-sm">Ringkasan AI</h3>
          </div>
          <p className="text-[10px] text-gray-500 mt-0.5">Ringkasan AI — tinjau sebelum digunakan</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading || rateLimited}
          className="text-xs font-bold text-white bg-purple-600 px-3 py-1.5 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
        >
          {loading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Menyusun...
            </>
          ) : (
            'Buat Ringkasan AI'
          )}
        </button>
      </div>

      <div className="p-4">
        {!result && !error && !loading && (
          <div className="text-center py-6 text-xs text-gray-500">
            Klik tombol "Buat Ringkasan AI" untuk meminta AI menganalisis progres hafalan santri ini.
          </div>
        )}

        {loading && (
          <div className="py-8 flex flex-col items-center justify-center text-purple-500 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <p className="text-xs font-medium">Sedang memproses data akademik santri...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex items-start gap-3">
            {rateLimited ? <Clock className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />}
            <div>
              <p className="text-sm font-bold text-red-800">Pembuatan Gagal</p>
              <p className="text-xs text-red-700 mt-1">{error}</p>
              {rateLimited && retryAfter && (
                <p className="text-xs font-bold text-red-800 mt-2">Coba lagi dalam {retryAfter} detik.</p>
              )}
            </div>
          </div>
        )}

        {result && !loading && (
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-bold text-gray-700 mb-1">Ringkasan Progres</h4>
              <p className="text-sm text-gray-800 leading-relaxed bg-gray-50 p-3 rounded-xl">{result.summary}</p>
            </div>
            
            {result.observations && result.observations.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-gray-700 mb-1">Observasi Akademik</h4>
                <ul className="space-y-1.5 text-sm text-gray-800">
                  {result.observations.map((obs, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className="text-purple-500 mt-0.5">•</span>
                      <span>{obs}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-bold text-gray-700 mb-1">Fokus Diskusi dengan Santri</h4>
                <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl h-full">
                  <p className="text-sm text-blue-900 leading-relaxed">{result.focusDiscussion}</p>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-700 mb-1">Draf Catatan Guru</h4>
                <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl h-full">
                  <p className="text-sm text-emerald-900 leading-relaxed">{result.teacherDraft}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
