'use client'

import { useState } from 'react'
import { Save, RefreshCw, X } from 'lucide-react'
import type { SurahRow } from '@/lib/db/queries/surahs'
import SurahSelector from '@/components/quran/SurahSelector'

export type TasmiFormData = {
  mode: 'SURAH' | 'JUZ_RANGE'
  surah_id: number | null
  start_juz: number | null
  end_juz: number | null
  session_date: string
  score: number | null
  status: 'PASSED' | 'NEEDS_REVIEW'
  notes: string | null
}

interface TasmiFormProps {
  initialData?: TasmiFormData
  surahs: SurahRow[]
  isEdit?: boolean
  saving?: boolean
  onSave: (data: TasmiFormData) => void
  onCancel: () => void
}

export function TasmiForm({
  initialData,
  surahs,
  isEdit = false,
  saving = false,
  onSave,
  onCancel
}: TasmiFormProps) {
  const [formData, setFormData] = useState<TasmiFormData>({
    mode: initialData?.mode || 'SURAH',
    surah_id: initialData?.surah_id || surahs[0]?.id || 1,
    start_juz: initialData?.start_juz || 30,
    end_juz: initialData?.end_juz || 30,
    session_date: initialData?.session_date || new Date().toISOString().split('T')[0],
    score: initialData?.score ?? null,
    status: initialData?.status || 'PASSED',
    notes: initialData?.notes || null
  })

  // Juz live preview
  let juzPreview = ''
  if (formData.mode === 'JUZ_RANGE') {
    const s = formData.start_juz || 1
    const e = formData.end_juz || 30
    if (s > e) {
      juzPreview = 'Juz Awal harus <= Juz Akhir'
    } else {
      const qty = e - s + 1
      juzPreview = s === e ? `${qty} Juz • Juz ${s}` : `${qty} Juz • Juz ${s}–${e}`
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-[#FAFAFA] flex-shrink-0">
          <h3 className="font-bold text-gray-900">{isEdit ? 'Edit Tasmi' : 'Catat Tasmi'}</h3>
          <button 
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto">
          <form id="tasmi-form" onSubmit={handleSubmit} className="space-y-4">
            
            {/* Mode Selector - Locked if Edit */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Jenis Tasmi</label>
              <div className="flex gap-4">
                <label className={`flex items-center gap-2 text-sm ${isEdit ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
                  <input 
                    type="radio" 
                    name="mode" 
                    value="SURAH" 
                    checked={formData.mode === 'SURAH'}
                    onChange={() => !isEdit && setFormData(p => ({ ...p, mode: 'SURAH', start_juz: null, end_juz: null, surah_id: surahs[0]?.id || 1 }))}
                    disabled={isEdit}
                    className="text-[#4B21A2] focus:ring-[#4B21A2]"
                  />
                  Tasmi Surat
                </label>
                <label className={`flex items-center gap-2 text-sm ${isEdit ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
                  <input 
                    type="radio" 
                    name="mode" 
                    value="JUZ_RANGE" 
                    checked={formData.mode === 'JUZ_RANGE'}
                    onChange={() => !isEdit && setFormData(p => ({ ...p, mode: 'JUZ_RANGE', surah_id: null, start_juz: 30, end_juz: 30 }))}
                    disabled={isEdit}
                    className="text-[#4B21A2] focus:ring-[#4B21A2]"
                  />
                  Tasmi Sekali Duduk
                </label>
              </div>
            </div>

            {/* Target Fields */}
            {formData.mode === 'SURAH' && (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Surat</label>
                <SurahSelector
                  surahs={surahs}
                  value={formData.surah_id || 0}
                  onChange={(newSurahId) => setFormData(p => ({ ...p, surah_id: newSurahId }))}
                />
              </div>
            )}

            {formData.mode === 'JUZ_RANGE' && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Juz Awal</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={30}
                      value={formData.start_juz || ''}
                      onChange={e => setFormData(p => ({ ...p, start_juz: e.target.value ? Number(e.target.value) : null }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#FBBF24] focus:ring-1 focus:ring-[#FBBF24]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Juz Akhir</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={30}
                      value={formData.end_juz || ''}
                      onChange={e => setFormData(p => ({ ...p, end_juz: e.target.value ? Number(e.target.value) : null }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#FBBF24] focus:ring-1 focus:ring-[#FBBF24]"
                    />
                  </div>
                </div>
                <div className="text-xs font-medium text-gray-500 bg-gray-50 p-2 rounded-lg border border-gray-100 flex items-center justify-center">
                  Preview: {juzPreview}
                </div>
              </div>
            )}

            {/* Date */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Tanggal Tasmi</label>
              <input
                type="date"
                required
                value={formData.session_date}
                onChange={e => setFormData(p => ({ ...p, session_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#FBBF24] focus:ring-1 focus:ring-[#FBBF24]"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Status</label>
              <select
                required
                value={formData.status}
                onChange={e => setFormData(p => ({ ...p, status: e.target.value as 'PASSED' | 'NEEDS_REVIEW' }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#FBBF24] focus:ring-1 focus:ring-[#FBBF24]"
              >
                <option value="PASSED">Lulus</option>
                <option value="NEEDS_REVIEW">Perlu Pengulangan</option>
              </select>
            </div>

            {/* Score */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Nilai (Opsional, 0-100)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={formData.score === null ? '' : formData.score}
                onChange={e => {
                  const val = e.target.value
                  setFormData(p => ({ ...p, score: val === '' ? null : Number(val) }))
                }}
                placeholder="-"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#FBBF24] focus:ring-1 focus:ring-[#FBBF24]"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Catatan (Opsional)</label>
              <textarea
                value={formData.notes || ''}
                onChange={e => setFormData(p => ({ ...p, notes: e.target.value || null }))}
                maxLength={500}
                rows={3}
                placeholder="Catatan hasil ujian tasmi..."
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#FBBF24] focus:ring-1 focus:ring-[#FBBF24] resize-none"
              />
            </div>

          </form>
        </div>
        
        <div className="p-4 border-t border-gray-100 bg-[#FAFAFA] flex justify-end gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            form="tasmi-form"
            disabled={saving}
            className="bg-[#FBBF24] hover:bg-[#F59E0B] text-[#18085A] px-6 py-2 rounded-xl text-sm font-bold shadow-sm transition-colors flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}
