'use client'

import { useState } from 'react'
import { X, Save, RefreshCw } from 'lucide-react'
import SurahSelector from '@/components/quran/SurahSelector'
import type { SurahRow } from '@/lib/db/queries/surahs'

type TahfizTargetModalProps = {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: { startSurahId: number; startAyah: number; endSurahId: number; endAyah: number }) => Promise<void>
  surahs: SurahRow[]
  initialData?: {
    startSurahId: number
    startAyah: number
    endSurahId: number
    endAyah: number
  } | null
  title: string
}

export default function TahfizTargetModal({ isOpen, onClose, onSubmit, surahs, initialData, title }: TahfizTargetModalProps) {
  const [saving, setSaving] = useState(false)
  
  const [formData, setFormData] = useState({
    startSurahId: initialData?.startSurahId || surahs[0]?.id || 1,
    startAyah: initialData?.startAyah || 1,
    endSurahId: initialData?.endSurahId || surahs[0]?.id || 1,
    endAyah: initialData?.endAyah || 5,
  })

  if (!isOpen) return null

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSubmit(formData)
      onClose()
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
  }

  const startSurah = surahs.find(s => s.id === formData.startSurahId)
  const maxStartAyah = startSurah ? startSurah.total_ayahs : 1

  const endSurah = surahs.find(s => s.id === formData.endSurahId)
  const maxEndAyah = endSurah ? endSurah.total_ayahs : 1

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-[#FAFAFA] flex-shrink-0">
          <h3 className="font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto">
          <form id="target-form" onSubmit={handleSave} className="space-y-6">
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-[#4B21A2] border-b pb-1">Batas Awal</h4>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Surah Mulai</label>
                <SurahSelector
                  surahs={surahs}
                  value={formData.startSurahId}
                  onChange={(newId) => {
                    const s = surahs.find(x => x.id === newId)
                    setFormData(p => ({
                      ...p,
                      startSurahId: newId,
                      startAyah: Math.min(p.startAyah, s ? s.total_ayahs : 1)
                    }))
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Ayat Mulai</label>
                <input
                  type="number"
                  required min={1} max={maxStartAyah}
                  value={formData.startAyah}
                  onChange={e => setFormData(p => ({ ...p, startAyah: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#FBBF24]"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-bold text-[#4B21A2] border-b pb-1">Batas Akhir</h4>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Surah Selesai</label>
                <SurahSelector
                  surahs={surahs}
                  value={formData.endSurahId}
                  onChange={(newId) => {
                    const s = surahs.find(x => x.id === newId)
                    setFormData(p => ({
                      ...p,
                      endSurahId: newId,
                      endAyah: Math.min(p.endAyah, s ? s.total_ayahs : 1)
                    }))
                  }}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Ayat Selesai</label>
                <input
                  type="number"
                  required min={1} max={maxEndAyah}
                  value={formData.endAyah}
                  onChange={e => setFormData(p => ({ ...p, endAyah: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#FBBF24]"
                />
              </div>
            </div>
          </form>
        </div>
        
        <div className="p-4 border-t border-gray-100 bg-[#FAFAFA] flex justify-end gap-3 flex-shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-900">Batal</button>
          <button type="submit" form="target-form" disabled={saving} className="bg-[#FBBF24] hover:bg-[#F59E0B] text-[#18085A] px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-70">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}
