'use client'

import { useState } from 'react'
import { Calendar, Save, CheckCircle2 } from 'lucide-react'

export default function GuruAbsensiPage() {
  const [attendance, setAttendance] = useState([
    { id: 1, name: 'Ahmad Zaki Ramadhan', status: 'hadir' },
    { id: 2, name: 'Fatimah Az-Zahra', status: 'hadir' },
    { id: 3, name: 'Yusuf Al-Amin', status: 'hadir' },
    { id: 4, name: 'Aisyah Nur Hidayah', status: 'hadir' },
  ])
  const [saved, setSaved] = useState(false)

  const toggleStatus = (id: number, status: string) => {
    setAttendance((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)))
  }

  const handleSave = async () => {
    try {
      await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          attendance.map((a) => ({
            student_id: a.id,
            class_id: 1,
            attendance_date: new Date().toISOString().split('T')[0],
            status: a.status,
          }))
        ),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-center">
        <div>
          <h3 className="font-bold text-gray-900 text-sm">Input Presensi Harian</h3>
          <p className="text-xs text-gray-500">Kelompok A — Ustadz Aldi Solihin</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[#4B21A2] font-semibold bg-[#F0EDF9] px-3 py-1.5 rounded-xl">
          <Calendar className="w-4 h-4" /> {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
        {attendance.map((a) => (
          <div key={a.id} className="flex justify-between items-center p-3 bg-[#FAFAFA] rounded-xl border border-gray-100">
            <span className="font-bold text-gray-900 text-xs">{a.name}</span>
            <div className="flex gap-1">
              {(['hadir', 'izin', 'sakit', 'alfa'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => toggleStatus(a.id, st)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all ${
                    a.status === st
                      ? st === 'hadir'
                        ? 'bg-[#16A34A] text-white'
                        : st === 'izin'
                        ? 'bg-[#FBBF24] text-[#18085A]'
                        : st === 'sakit'
                        ? 'bg-[#F59E0B] text-white'
                        : 'bg-[#DC2626] text-white'
                      : 'bg-white border border-gray-200 text-gray-600'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        ))}

        <button
          onClick={handleSave}
          className="w-full mt-3 py-2.5 bg-[#4B21A2] text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 hover:bg-[#3a1880]"
        >
          <Save className="w-4 h-4" /> Simpan Presensi Hari Ini
        </button>

        {saved && (
          <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Presensi berhasil disimpan!
          </div>
        )}
      </div>
    </div>
  )
}
