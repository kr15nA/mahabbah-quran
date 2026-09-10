'use client'

import { useState, useEffect } from 'react'
import { FileText, CheckCircle, Clock } from 'lucide-react'

type Report = {
  id: number
  student_name: string
  teacher_name: string
  report_date: string
  surah_name_latin?: string
  hafalan_score?: number
  status: string
}

export default function AdminLaporanPage() {
  const [reports, setReports] = useState<Report[]>([])

  useEffect(() => {
    fetch('/api/learning-reports')
      .then((res) => res.json())
      .then((json) => {
        if (json.data) setReports(json.data)
      })
      .catch((err) => console.error(err))
  }, [])

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-center">
        <div>
          <h3 className="font-bold text-gray-900 text-sm">Laporan Pembelajaran Santri</h3>
          <p className="text-xs text-gray-500">Daftar laporan harian yang telah diproses</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#F0EDF9] text-gray-500 font-bold border-b border-gray-200">
              <th className="p-3.5 px-4">Santri</th>
              <th className="p-3.5">Guru</th>
              <th className="p-3.5">Tanggal</th>
              <th className="p-3.5">Hafalan</th>
              <th className="p-3.5">Nilai</th>
              <th className="p-3.5 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-gray-800">
            {reports.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="p-3.5 px-4 font-semibold text-gray-900">{r.student_name}</td>
                <td className="p-3.5 text-gray-600">{r.teacher_name}</td>
                <td className="p-3.5 text-gray-600">{r.report_date}</td>
                <td className="p-3.5 font-medium text-[#4B21A2]">{r.surah_name_latin || 'An-Naba'}</td>
                <td className="p-3.5 font-bold text-emerald-600">{r.hafalan_score || 85}/100</td>
                <td className="p-3.5 px-4">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      r.status === 'sent' ? 'bg-purple-100 text-[#4B21A2]' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {r.status === 'sent' ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    {r.status === 'sent' ? 'Terkirim' : 'Draft'}
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
