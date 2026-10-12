'use client'

import { useState, useTransition } from 'react'
import { Settings, Save, CheckCircle2, AlertCircle, Building, Clock, Percent, Mail, Phone, MapPin } from 'lucide-react'
import { saveInstitutionSettingsAction } from './actions'
import type { InstitutionSettingsRow } from '@/lib/db/queries/settings'

export default function AdminPengaturanClient({
  settings: initialSettings,
}: {
  settings: InstitutionSettingsRow
}) {
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFeedback(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const res = await saveInstitutionSettingsAction(formData)
      if (res.success) {
        setFeedback({ type: 'success', message: 'Pengaturan yayasan berhasil disimpan dan dicatat dalam audit trail!' })
      } else {
        setFeedback({ type: 'error', message: res.error || 'Gagal menyimpan pengaturan' })
      }
    })
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4 sm:px-6 py-4">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full w-fit mb-1">
            <Settings className="w-3.5 h-3.5" />
            <span>Konfigurasi Lembaga</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Pengaturan Sistem & Yayasan</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Konfigurasi profil identitas yayasan, standar kehadiran, dan jadwal pelaporan
          </p>
        </div>
        <div className="text-[11px] text-gray-400 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100 self-start sm:self-auto">
          Terakhir diperbarui: {new Date(initialSettings.updatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 text-xs font-medium ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Settings Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6 text-xs">
        {/* Section: Identitas Yayasan */}
        <div className="space-y-4">
          <h3 className="font-bold text-gray-900 pb-2 border-b border-gray-100 flex items-center gap-2 text-xs">
            <Building className="w-4 h-4 text-purple-600" />
            <span>Identitas Yayasan / Lembaga</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-gray-700 mb-1">
                Nama Lengkap Yayasan / Lembaga <span className="text-rose-500">*</span>
              </label>
              <input
                name="institutionName"
                defaultValue={initialSettings.institutionName}
                required
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-purple-600 font-medium"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Ditampilkan pada kop dokumen resmi dan laporan rapor santri.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Nama Singkat / Brand</label>
              <input
                name="shortName"
                defaultValue={initialSettings.shortName || ''}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Email Resmi Lembaga</label>
              <div className="relative">
                <input
                  name="email"
                  type="email"
                  defaultValue={initialSettings.email || ''}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-purple-600"
                />
                <Mail className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Nomor Kontak / Telepon</label>
              <div className="relative">
                <input
                  name="phone"
                  defaultValue={initialSettings.phone || ''}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-purple-600"
                />
                <Phone className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-gray-700 mb-1">Alamat Kantor / Sekretariat</label>
              <div className="relative">
                <textarea
                  name="address"
                  rows={2}
                  defaultValue={initialSettings.address || ''}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section: Parameter Akademik & Operasional */}
        <div className="space-y-4 pt-2">
          <h3 className="font-bold text-gray-900 pb-2 border-b border-gray-100 flex items-center gap-2 text-xs">
            <Percent className="w-4 h-4 text-purple-600" />
            <span>Standar Parameter Operasional</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Ambang Batas Minimum Kehadiran (%) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                name="minAttendancePct"
                min={1}
                max={100}
                defaultValue={initialSettings.minAttendancePct}
                required
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-purple-600"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Santri dengan persentase di bawah nilai ini ditandai dalam analitik dan peringatan rapor.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">
                Jadwal Pengiriman Laporan Harian (WIB) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  name="dailyReportSchedule"
                  defaultValue={initialSettings.dailyReportSchedule}
                  placeholder="HH:MM"
                  required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-purple-600"
                />
                <Clock className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-3 pointer-events-none" />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Format 24 jam (contoh: 16:30 atau 17:00).</p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t border-gray-100 flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 bg-[#4B21A2] text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm hover:bg-[#3d1a84] transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isPending ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}
