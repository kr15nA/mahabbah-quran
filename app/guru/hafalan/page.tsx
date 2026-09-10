'use client'

import { BookMarked } from 'lucide-react'

export default function GuruHafalanPage() {
  const records = [
    { name: 'Ahmad Zaki Ramadhan', surah: 'An-Naba', ayat: '1-10', type: 'Hafalan Baru', score: 88, date: '4 Sep 2026' },
    { name: 'Fatimah Az-Zahra', surah: "'Abasa", ayat: '9-16', type: 'Hafalan Baru', score: 80, date: '4 Sep 2026' },
    { name: 'Yusuf Al-Amin', surah: "An-Nazi'at", ayat: '16-25', type: 'Hafalan Baru', score: 92, date: '4 Sep 2026' },
    { name: 'Aisyah Nur Hidayah', surah: 'Al-Mulk', ayat: '1-10', type: "Muraja'ah", score: 72, date: '4 Sep 2026' },
  ]

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-center">
        <div>
          <h3 className="font-bold text-gray-900 text-sm">Riwayat Hafalan Kelompok A</h3>
          <p className="text-xs text-gray-500">Catatan perkembangan setoran santri binaan</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden text-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F0EDF9] text-gray-500 font-bold border-b border-gray-200">
              <th className="p-3.5 px-4">Santri</th>
              <th className="p-3.5">Surah & Ayat</th>
              <th className="p-3.5">Jenis Setoran</th>
              <th className="p-3.5">Nilai</th>
              <th className="p-3.5 px-4">Tanggal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-800">
            {records.map((r, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="p-3.5 px-4 font-bold text-gray-900">{r.name}</td>
                <td className="p-3.5 font-semibold text-[#4B21A2]">
                  QS. {r.surah} : {r.ayat}
                </td>
                <td className="p-3.5">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-[#4B21A2]">
                    {r.type}
                  </span>
                </td>
                <td className="p-3.5 font-bold text-emerald-600">{r.score}/100</td>
                <td className="p-3.5 px-4 text-gray-500">{r.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
