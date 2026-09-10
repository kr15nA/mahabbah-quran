'use client'

import { Settings, Save } from 'lucide-react'

export default function AdminPengaturanPage() {
  return (
    <div className="space-y-4 max-w-2xl">
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
        <h3 className="font-bold text-gray-900 text-sm">Pengaturan Sistem</h3>
        <p className="text-xs text-gray-500">Konfigurasi umum Mahabbah Qur'an</p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4 text-xs">
        <div>
          <label className="block font-semibold text-gray-700 mb-1">Nama Yayasan / Lembaga</label>
          <input
            defaultValue="Yayasan Rumah Tahfizh Mahabbah Qur'an Indonesia"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#4B21A2]"
          />
        </div>

        <div>
          <label className="block font-semibold text-gray-700 mb-1">Ambang Batas Minimum Kehadiran (%)</label>
          <input
            type="number"
            defaultValue={70}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#4B21A2]"
          />
        </div>

        <div>
          <label className="block font-semibold text-gray-700 mb-1">Jadwal Pengiriman Laporan Harian (WIB)</label>
          <input
            defaultValue="16:30"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-[#4B21A2]"
          />
        </div>

        <button className="flex items-center gap-2 bg-[#4B21A2] text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm pt-2">
          <Save className="w-4 h-4" /> Simpan Pengaturan
        </button>
      </div>
    </div>
  )
}
