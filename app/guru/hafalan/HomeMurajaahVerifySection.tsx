'use client'

import { useState, useEffect } from 'react'
import { HomeMurajaahWithDetails } from '@/lib/db/queries/home-murajaah'
import { getPendingHomeMurajaahAction, verifyHomeMurajaahAction } from './actions'
import { 
  Home, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2, 
  AlertCircle,
  Calendar,
  User,
  MessageSquare
} from 'lucide-react'

export default function HomeMurajaahVerifySection() {
  const [pendingRecords, setPendingRecords] = useState<HomeMurajaahWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<number | null>(null)
  const [rejectNotes, setRejectNotes] = useState<string>('')

  const loadPending = async () => {
    setLoading(true)
    setError(null)
    const res = await getPendingHomeMurajaahAction()
    if (res.success && res.data) {
      setPendingRecords(res.data)
    } else {
      setError(res.error || 'Gagal memuat antrean verifikasi muroja\'ah')
    }
    setLoading(false)
  }

  useEffect(() => {
    loadPending()
  }, [])

  const handleVerify = async (id: number, status: 'VERIFIED' | 'REJECTED', notes?: string) => {
    setProcessingId(id)
    setError(null)

    const res = await verifyHomeMurajaahAction(id, status, notes)
    if (res.success) {
      setRejectingId(null)
      setRejectNotes('')
      await loadPending()
    } else {
      setError(res.error || 'Gagal memproses verifikasi')
    }
    setProcessingId(null)
  }

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <Home className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900 text-base">Verifikasi Muroja'ah Rumah</h3>
              {pendingRecords.length > 0 && (
                <span className="px-2 py-0.5 bg-amber-400 text-amber-950 font-black text-xs rounded-full">
                  {pendingRecords.length}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 font-medium">
              Tinjau dan akui tilawah mandiri yang dilaporkan oleh orang tua santri
            </p>
          </div>
        </div>

        <button
          onClick={loadPending}
          disabled={loading}
          className="text-xs text-[#4B21A2] font-semibold hover:underline"
        >
          Perbarui
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          <div className="animate-pulse bg-gray-50 h-20 rounded-2xl"></div>
          <div className="animate-pulse bg-gray-50 h-20 rounded-2xl"></div>
        </div>
      ) : pendingRecords.length === 0 ? (
        <div className="bg-gray-50/60 border border-dashed border-gray-200 rounded-2xl p-6 text-center">
          <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
          <p className="text-xs font-semibold text-gray-700">Semua laporan telah diverifikasi</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Tidak ada antrean muroja'ah rumah pending dari santri kelas bimbingan Anda saat ini.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingRecords.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-xs transition space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-gray-900">
                      {item.student_name || 'Santri'}
                    </span>
                    {item.class_name && (
                      <span className="text-[11px] text-gray-500 font-medium px-2 py-0.5 bg-gray-100 rounded-md">
                        {item.class_name}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#4B21A2] font-semibold mt-0.5">
                    QS. {item.surah_name_latin} (Ayat {item.ayah_start} - {item.ayah_end})
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    {item.session_date}
                  </span>
                  {item.parent_name && (
                    <span className="flex items-center gap-1 text-[11px] text-gray-600">
                      <User className="w-3 h-3 text-gray-400" />
                      Oleh: {item.parent_name}
                    </span>
                  )}
                </div>
              </div>

              {item.notes && (
                <div className="text-xs text-gray-600 bg-white p-2.5 rounded-xl border border-gray-100 italic flex items-start gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                  <span>"{item.notes}"</span>
                </div>
              )}

              {/* Action buttons */}
              {rejectingId === item.id ? (
                <div className="pt-2 border-t border-gray-100 space-y-2">
                  <input
                    type="text"
                    placeholder="Alasan penolakan / masukan untuk santri..."
                    value={rejectNotes}
                    onChange={(e) => setRejectNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-red-400"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setRejectingId(null)
                        setRejectNotes('')
                      }}
                      className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 rounded-lg transition"
                    >
                      Batal
                    </button>
                    <button
                      onClick={() => handleVerify(item.id, 'REJECTED', rejectNotes)}
                      disabled={processingId === item.id}
                      className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 disabled:opacity-50 transition flex items-center gap-1"
                    >
                      {processingId === item.id && <Loader2 className="w-3 h-3 animate-spin" />}
                      <span>Konfirmasi Tolak</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-100">
                  <button
                    onClick={() => {
                      setRejectingId(item.id)
                      setRejectNotes('')
                    }}
                    disabled={processingId === item.id}
                    className="px-3 py-1.5 border border-red-200 text-red-700 hover:bg-red-50 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Tolak</span>
                  </button>
                  <button
                    onClick={() => handleVerify(item.id, 'VERIFIED')}
                    disabled={processingId === item.id}
                    className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs"
                  >
                    {processingId === item.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    <span>Verifikasi</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
