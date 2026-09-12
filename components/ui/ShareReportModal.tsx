'use client'

import { useState, useEffect } from 'react'
import { X, Copy, Check, RefreshCw, Trash2, Share2, AlertCircle } from 'lucide-react'

export default function ShareReportModal({
  isOpen,
  onClose,
  reportId
}: {
  isOpen: boolean
  onClose: () => void
  reportId: number
}) {
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [activeShare, setActiveShare] = useState<{ active: false } | { active: true, expiresAt: string, createdAt: string, url?: string } | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (isOpen && reportId) {
      fetchShareStatus()
    } else {
      setActiveShare(null)
      setCopied(false)
    }
  }, [isOpen, reportId])

  const fetchShareStatus = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/learning-reports/${reportId}/share`)
      if (res.ok) {
        setActiveShare(await res.json())
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const generateLink = async () => {
    setGenerating(true)
    try {
      const res = await fetch(`/api/learning-reports/${reportId}/share`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setActiveShare({
          active: true,
          expiresAt: data.expiresAt,
          createdAt: new Date().toISOString(),
          url: data.url
        })
      } else {
        alert('Gagal membuat tautan.')
      }
    } catch (e) {
      console.error(e)
    } finally {
      setGenerating(false)
    }
  }

  const revokeLink = async () => {
    if (!confirm('Cabut akses tautan ini? Tautan lama tidak akan bisa diakses lagi.')) return
    
    setGenerating(true)
    try {
      const res = await fetch(`/api/learning-reports/${reportId}/share`, { method: 'DELETE' })
      if (res.ok) {
        setActiveShare({ active: false })
      }
    } catch (e) {
      console.error(e)
    } finally {
      setGenerating(false)
    }
  }

  const copyToClipboard = () => {
    if (activeShare && 'url' in activeShare && activeShare.url) {
      const fullUrl = window.location.origin + activeShare.url
      navigator.clipboard.writeText(fullUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const shareToWhatsApp = () => {
    if (activeShare && 'url' in activeShare && activeShare.url) {
      const fullUrl = window.location.origin + activeShare.url
      const text = encodeURIComponent(`Berikut adalah tautan Laporan Perkembangan Santri Mahabbah Qur'an:\n\n${fullUrl}\n\nBerlaku selama 7 hari.`)
      window.open(`https://wa.me/?text=${text}`, '_blank')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-[#FAFAFA]">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Share2 className="w-4 h-4 text-[#4B21A2]" />
            Bagikan Laporan
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {loading ? (
            <div className="py-8 flex justify-center">
              <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
          ) : activeShare?.active ? (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-3 text-xs">
                <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <div className="text-emerald-800">
                  <p className="font-bold">Tautan Aktif</p>
                  <p className="text-emerald-700 mt-0.5">Berlaku sampai: {new Date(activeShare.expiresAt).toLocaleDateString('id-ID', { dateStyle: 'long' })}</p>
                </div>
              </div>

              {'url' in activeShare && activeShare.url ? (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-700">Tautan Rahasia</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      readOnly 
                      value={window.location.origin + activeShare.url} 
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-600 outline-none"
                    />
                    <button 
                      onClick={copyToClipboard}
                      className="p-2.5 bg-[#4B21A2] text-white rounded-xl hover:bg-[#3A1882] transition-colors shrink-0"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <button 
                    onClick={shareToWhatsApp}
                    className="w-full mt-2 py-2.5 bg-emerald-500 text-white text-xs font-bold rounded-xl hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
                  >
                    Kirim via WhatsApp
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-center space-y-2">
                  <p className="text-xs text-gray-600">Tautan sebelumnya sudah tidak ditampilkan untuk keamanan.</p>
                  <button 
                    onClick={generateLink}
                    disabled={generating}
                    className="text-xs font-bold text-[#4B21A2] hover:underline flex items-center justify-center gap-1 mx-auto"
                  >
                    {generating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    Buat Tautan Baru
                  </button>
                </div>
              )}

              <div className="pt-4 border-t border-gray-100 flex justify-between items-center text-xs">
                <button 
                  onClick={revokeLink}
                  disabled={generating}
                  className="text-red-600 font-bold hover:text-red-700 flex items-center gap-1 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Cabut Akses
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-3 py-2">
              <div className="w-12 h-12 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-2">
                <Share2 className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-gray-800">Belum Ada Tautan</p>
              <p className="text-xs text-gray-500">Buat tautan aman untuk membagikan laporan ini kepada orang tua santri.</p>
              <button 
                onClick={generateLink}
                disabled={generating}
                className="mt-2 py-2.5 px-4 bg-[#4B21A2] text-white text-xs font-bold rounded-xl hover:bg-[#3A1882] transition-colors flex items-center justify-center gap-2 mx-auto disabled:opacity-50"
              >
                {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                Buat Tautan Bagikan
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
