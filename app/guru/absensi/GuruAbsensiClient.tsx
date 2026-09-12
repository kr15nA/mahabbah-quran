'use client'

import { useState, useEffect } from 'react'
import { Calendar, Save, CheckCircle2, RefreshCw } from 'lucide-react'
import type { ClassRow } from '@/lib/db/queries/classes'
import type { StudentRow } from '@/lib/db/queries/students'

type AttendanceState = {
  student_id: number
  student_name: string
  status: 'hadir' | 'izin' | 'sakit' | 'alfa' | null
}

export default function GuruAbsensiClient({ 
  classes, 
  initialStudents,
  teacherName
}: { 
  classes: ClassRow[], 
  initialStudents: StudentRow[],
  teacherName: string
}) {
  const [selectedClassId, setSelectedClassId] = useState<number>(classes[0]?.id || 0)
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [attendance, setAttendance] = useState<AttendanceState[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // When class or date changes, fetch existing attendance
  useEffect(() => {
    if (!selectedClassId || !date) return

    const loadAttendance = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/attendance?class_id=${selectedClassId}&date=${date}`)
        if (res.ok) {
          const { data } = await res.json()
          
          // Determine students for the selected class
          const classStudents = initialStudents.filter(s => s.class_id === selectedClassId && s.status === 'active')
          
          // Merge fetched attendance with class students
          const merged: AttendanceState[] = classStudents.map(student => {
            const existing = data.find((a: any) => a.student_id === student.id)
            return {
              student_id: student.id,
              student_name: student.full_name,
              status: existing ? existing.status : null
            }
          })
          
          setAttendance(merged)
        }
      } catch (error) {
        console.error('Failed to load attendance:', error)
      } finally {
        setLoading(false)
      }
    }

    loadAttendance()
  }, [selectedClassId, date, initialStudents])

  const toggleStatus = (id: number, status: 'hadir' | 'izin' | 'sakit' | 'alfa') => {
    setAttendance((prev) => prev.map((a) => (a.student_id === id ? { ...a, status } : a)))
  }

  const handleSave = async () => {
    // Filter out null statuses before saving
    const toSave = attendance.filter(a => a.status !== null)
    if (toSave.length === 0) return

    setSaving(true)
    try {
      const payload = toSave.map((a) => ({
        student_id: a.student_id,
        class_id: selectedClassId,
        attendance_date: date,
        status: a.status,
      }))

      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } else {
        alert('Gagal menyimpan absensi')
      }
    } catch (err) {
      console.error(err)
      alert('Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
  }

  const allStatusNull = attendance.every(a => a.status === null)

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex-1">
          <h3 className="font-bold text-gray-900 text-sm">Input Presensi Harian</h3>
          {classes.length > 1 ? (
            <select 
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(Number(e.target.value))}
              className="mt-1 block w-full py-1.5 px-3 text-xs border border-gray-300 bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-[#4B21A2] focus:border-[#4B21A2]"
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          ) : (
            <p className="text-xs text-gray-500">{classes[0]?.name} — {teacherName}</p>
          )}
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input 
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="text-xs font-semibold text-[#4B21A2] bg-[#F0EDF9] px-3 py-1.5 rounded-xl border-none focus:ring-0 w-full md:w-auto"
          />
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <RefreshCw className="w-6 h-6 text-[#4B21A2] animate-spin" />
          </div>
        ) : attendance.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-500">
            Belum ada data santri di kelas ini.
          </div>
        ) : (
          <>
            {attendance.map((a) => (
              <div key={a.student_id} className="flex flex-col md:flex-row justify-between items-start md:items-center p-3 gap-2 bg-[#FAFAFA] rounded-xl border border-gray-100">
                <span className="font-bold text-gray-900 text-xs truncate w-full md:w-auto">{a.student_name}</span>
                <div className="flex flex-wrap gap-1">
                  {(['hadir', 'izin', 'sakit', 'alfa'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => toggleStatus(a.student_id, st)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all flex-1 md:flex-none text-center ${
                        a.status === st
                          ? st === 'hadir'
                            ? 'bg-[#16A34A] text-white'
                            : st === 'izin'
                            ? 'bg-[#FBBF24] text-[#18085A]'
                            : st === 'sakit'
                            ? 'bg-[#F59E0B] text-white'
                            : 'bg-[#DC2626] text-white'
                          : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
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
              disabled={saving || allStatusNull}
              className="w-full mt-3 py-2.5 bg-[#4B21A2] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 hover:bg-[#3a1880] transition-colors"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 
              {saving ? 'Menyimpan...' : 'Simpan Presensi Hari Ini'}
            </button>

            {saved && (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Presensi berhasil disimpan!
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
