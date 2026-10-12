'use client'

import { useState, useTransition } from 'react'
import { Sparkles, Calendar, User, CheckCircle2, AlertCircle, History, Star, ArrowRight } from 'lucide-react'
import { createTahsinAction, getStudentTahsinHistoryAction } from './actions'
import type { StudentRow } from '@/lib/db/queries/students'
import type { ClassRow } from '@/lib/db/queries/classes'
import type { TahsinRow } from '@/lib/db/queries/tahsin'

type RecentRecord = TahsinRow & { student_name: string; class_name: string }

export default function GuruTahsinClient({
  classes,
  students,
  recentRecords: initialRecent,
  teacherName,
}: {
  classes: ClassRow[]
  students: StudentRow[]
  recentRecords: RecentRecord[]
  teacherName: string
}) {
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL')
  const [selectedStudentId, setSelectedStudentId] = useState<string>('')
  const [sessionDate, setSessionDate] = useState<string>(() => new Date().toISOString().slice(0, 10))
  
  const [makhraj, setMakhraj] = useState<number>(4)
  const [tajwid, setTajwid] = useState<number>(4)
  const [kelancaran, setKelancaran] = useState<number>(4)
  const [ghunnah, setGhunnah] = useState<number>(4)

  const [studentHistory, setStudentHistory] = useState<TahsinRow[]>([])
  const [studentAverages, setStudentAverages] = useState<any>(null)
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false)

  const [recentRecords, setRecentRecords] = useState<RecentRecord[]>(initialRecent)
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Filter students based on selected class
  const filteredStudents = selectedClassId === 'ALL'
    ? students
    : students.filter((s) => String(s.current_class_id || s.class_id) === selectedClassId)

  const handleStudentChange = async (studentIdStr: string) => {
    setSelectedStudentId(studentIdStr)
    setFeedback(null)
    if (!studentIdStr) {
      setStudentHistory([])
      setStudentAverages(null)
      return
    }

    setLoadingHistory(true)
    const res = await getStudentTahsinHistoryAction(Number(studentIdStr))
    if (res.success && res.history) {
      setStudentHistory(res.history)
      setStudentAverages(res.averages)
    } else {
      setStudentHistory([])
      setStudentAverages(null)
    }
    setLoadingHistory(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFeedback(null)

    if (!selectedStudentId) {
      setFeedback({ type: 'error', message: 'Silakan pilih santri terlebih dahulu' })
      return
    }

    startTransition(async () => {
      const res = await createTahsinAction({
        studentId: Number(selectedStudentId),
        sessionDate,
        makhrajScore: makhraj,
        tajwidScore: tajwid,
        kelancaranScore: kelancaran,
        ghunnahScore: ghunnah,
      })

      if (res.success) {
        setFeedback({ type: 'success', message: 'Penilaian Tahsin berhasil disimpan!' })
        // Refresh selected student history
        handleStudentChange(selectedStudentId)
      } else {
        setFeedback({ type: 'error', message: res.error || 'Gagal menyimpan penilaian' })
      }
    })
  }

  const selectedStudent = students.find((s) => String(s.id) === selectedStudentId)

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      {/* Page Header */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full w-fit mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Penilaian Mutu Bacaan (Tahsin)</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Penilaian Tahsin Santri</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Pencatatan evaluasi tajwid, makhraj, kelancaran, dan ghunnah per sesi
          </p>
        </div>
        <div className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-xl border border-gray-100 self-start sm:self-auto">
          Guru Pengampu: <span className="font-semibold text-gray-800">{teacherName}</span>
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

      {students.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center shadow-sm">
          <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-gray-800 mb-1">Belum Ada Santri</h3>
          <p className="text-xs text-gray-500">
            Anda belum memiliki kelas aktif atau santri yang terdaftar di tahun ajaran ini.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Assessment Form Column */}
          <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
            <h2 className="text-sm font-bold text-gray-900 pb-2 border-b border-gray-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              Formulir Penilaian Sesi
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Class & Student Filter Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Filter Kelas</label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => {
                      setSelectedClassId(e.target.value)
                      setSelectedStudentId('')
                      setStudentHistory([])
                      setStudentAverages(null)
                    }}
                    className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-purple-600 bg-white"
                  >
                    <option value="ALL">Semua Kelas ({classes.length})</option>
                    {classes.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Pilih Santri <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => handleStudentChange(e.target.value)}
                    required
                    className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-purple-600 bg-white font-medium"
                  >
                    <option value="">-- Pilih Santri ({filteredStudents.length}) --</option>
                    {filteredStudents.map((s) => (
                      <option key={s.id} value={String(s.id)}>
                        {s.full_name} ({s.class_name || 'Santri'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date Input */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Tanggal Penilaian <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    required
                    className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-purple-600"
                  />
                  <Calendar className="w-4 h-4 text-gray-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>
              </div>

              {/* Score Sliders/Radios */}
              <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100 space-y-4">
                <div className="text-xs font-semibold text-purple-900 mb-2">
                  Komponen Penilaian Mutu (Skala 1 - 5)
                </div>

                {/* Makhraj */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="font-semibold text-gray-700">1. Makharijul Huruf</span>
                    <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">
                      Nilai: {makhraj} / 5
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        type="button"
                        key={val}
                        onClick={() => setMakhraj(val)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                          makhraj === val
                            ? 'bg-purple-700 text-white shadow-sm'
                            : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tajwid */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="font-semibold text-gray-700">2. Hukum Tajwid</span>
                    <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">
                      Nilai: {tajwid} / 5
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        type="button"
                        key={val}
                        onClick={() => setTajwid(val)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                          tajwid === val
                            ? 'bg-purple-700 text-white shadow-sm'
                            : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Kelancaran */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="font-semibold text-gray-700">3. Kelancaran (Fashahah)</span>
                    <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">
                      Nilai: {kelancaran} / 5
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        type="button"
                        key={val}
                        onClick={() => setKelancaran(val)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                          kelancaran === val
                            ? 'bg-purple-700 text-white shadow-sm'
                            : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ghunnah */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="font-semibold text-gray-700">4. Ghunnah & Dengung</span>
                    <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-md">
                      Nilai: {ghunnah} / 5
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        type="button"
                        key={val}
                        onClick={() => setGhunnah(val)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                          ghunnah === val
                            ? 'bg-purple-700 text-white shadow-sm'
                            : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isPending || !selectedStudentId}
                className="w-full bg-[#4B21A2] text-white py-2.5 px-4 rounded-xl text-xs font-bold hover:bg-[#3d1a84] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
              >
                {isPending ? (
                  <span>Menyimpan Penilaian...</span>
                ) : (
                  <>
                    <span>Simpan Penilaian Tahsin</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Student Profile / History Column */}
          <div className="lg:col-span-5 space-y-5">
            {/* Selected Student Summary Card */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
              <h3 className="text-xs font-bold text-gray-900 pb-2 border-b border-gray-100 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-purple-600" />
                <span>Ringkasan Mutu Santri Terpilih</span>
              </h3>

              {!selectedStudent ? (
                <div className="py-8 text-center text-xs text-gray-400">
                  Pilih santri untuk melihat riwayat dan rata-rata skor
                </div>
              ) : loadingHistory ? (
                <div className="py-8 text-center text-xs text-gray-400 animate-pulse">
                  Memuat riwayat tahsin santri...
                </div>
              ) : (
                <div className="mt-3 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-sm">
                      {selectedStudent.full_name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-900">{selectedStudent.full_name}</div>
                      <div className="text-[11px] text-gray-500">{selectedStudent.class_name || 'Santri'}</div>
                    </div>
                  </div>

                  {studentAverages && (
                    <div className="grid grid-cols-2 gap-2 pt-2 text-[11px]">
                      <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                        <span className="text-gray-500 block">Rata-rata Makhraj:</span>
                        <span className="font-bold text-purple-900 text-sm">
                          {studentAverages.avg_makhraj ?? '-'}
                        </span>
                      </div>
                      <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                        <span className="text-gray-500 block">Rata-rata Tajwid:</span>
                        <span className="font-bold text-purple-900 text-sm">
                          {studentAverages.avg_tajwid ?? '-'}
                        </span>
                      </div>
                      <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                        <span className="text-gray-500 block">Rata-rata Kelancaran:</span>
                        <span className="font-bold text-purple-900 text-sm">
                          {studentAverages.avg_kelancaran ?? '-'}
                        </span>
                      </div>
                      <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                        <span className="text-gray-500 block">Rata-rata Ghunnah:</span>
                        <span className="font-bold text-purple-900 text-sm">
                          {studentAverages.avg_ghunnah ?? '-'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Sesi Terakhir */}
                  <div className="pt-2">
                    <div className="text-[11px] font-semibold text-gray-700 mb-1.5 flex items-center gap-1">
                      <History className="w-3 h-3 text-gray-400" />
                      <span>Riwayat 5 Sesi Terakhir</span>
                    </div>
                    {studentHistory.length === 0 ? (
                      <p className="text-[11px] text-gray-400 italic">Belum ada catatan tahsin sebelumnya</p>
                    ) : (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {studentHistory.slice(0, 5).map((h) => (
                          <div
                            key={h.id}
                            className="bg-gray-50/70 p-2 rounded-lg border border-gray-100 text-[11px] flex justify-between items-center"
                          >
                            <span className="font-medium text-gray-700">{h.session_date}</span>
                            <div className="flex gap-2 text-purple-800 font-semibold">
                              <span title="Makhraj">M: {h.makhraj_score}</span>
                              <span title="Tajwid">T: {h.tajwid_score}</span>
                              <span title="Kelancaran">K: {h.kelancaran_score}</span>
                              <span title="Ghunnah">G: {h.ghunnah_score}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Global Recent Activity for This Teacher */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
              <h3 className="text-xs font-bold text-gray-900 pb-2 border-b border-gray-100 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-purple-600" />
                <span>Riwayat Penilaian Terakhir Anda</span>
              </h3>

              {recentRecords.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-400">
                  Belum ada penilaian tahsin yang tercatat
                </div>
              ) : (
                <div className="mt-2 space-y-2 max-h-64 overflow-y-auto pr-1">
                  {recentRecords.slice(0, 10).map((r) => (
                    <div
                      key={r.id}
                      className="p-2.5 rounded-xl border border-gray-100 bg-gray-50/50 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-gray-800">{r.student_name}</div>
                        <div className="text-[10px] text-gray-500">
                          {r.class_name} • {r.session_date}
                        </div>
                      </div>
                      <div className="text-[11px] font-bold text-purple-800 bg-purple-50 px-2 py-1 rounded-md border border-purple-100">
                        M:{r.makhraj_score} T:{r.tajwid_score} K:{r.kelancaran_score} G:{r.ghunnah_score}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
