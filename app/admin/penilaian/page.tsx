'use client'

import { Star } from 'lucide-react'

export default function AdminPenilaianPage() {
  const scores = [
    { name: 'Ahmad Zaki Ramadhan', hafalan: 88, tahsin: 85, adab: 90, avg: 88 },
    { name: 'Fatimah Az-Zahra', hafalan: 80, tahsin: 76, adab: 85, avg: 80 },
    { name: 'Yusuf Al-Amin', hafalan: 88, tahsin: 92, adab: 95, avg: 92 },
    { name: 'Aisyah Nur Hidayah', hafalan: 72, tahsin: 70, adab: 82, avg: 75 },
  ]

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-center">
        <div>
          <h3 className="font-bold text-gray-900 text-sm">Penilaian Kumulatif</h3>
          <p className="text-xs text-gray-500">Nilai gabungan hafalan, tahsin, dan adab santri</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#F0EDF9] text-gray-500 font-bold border-b border-gray-200">
              <th className="p-3.5 px-4">Santri</th>
              <th className="p-3.5">Hafalan</th>
              <th className="p-3.5">Tahsin</th>
              <th className="p-3.5">Adab</th>
              <th className="p-3.5 px-4">Rata-rata Akhir</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-800">
            {scores.map((s, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="p-3.5 px-4 font-bold text-gray-900">{s.name}</td>
                <td className="p-3.5 font-semibold text-[#4B21A2]">{s.hafalan}/100</td>
                <td className="p-3.5 font-semibold text-[#7B4BD6]">{s.tahsin}/100</td>
                <td className="p-3.5 font-semibold text-emerald-600">{s.adab}/100</td>
                <td className="p-3.5 px-4">
                  <span className="px-3 py-1 bg-amber-100 text-amber-900 font-extrabold rounded-lg text-xs">
                    {s.avg} / 100
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
