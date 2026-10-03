'use client'

import { useState, useEffect } from 'react'
import { BookMarked, Save, Plus, RefreshCw, X, Target, Edit, CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react'
import type { StudentRow } from '@/lib/db/queries/students'
import type { ClassRow } from '@/lib/db/queries/classes'
import type { SurahRow } from '@/lib/db/queries/surahs'
import type { HafalanRow } from '@/lib/db/queries/hafalan'
import SurahSelector from '@/components/quran/SurahSelector'
import TahfizTargetModal from './TahfizTargetModal'
import SmartInsightCard, { SmartInsightData } from '@/app/_components/tahfiz/SmartInsightCard'
import GuruTahfizAiCard from './GuruTahfizAiCard'
import { calculateTargetProgress, aggregateSurahCoverage } from '@/lib/tahfiz/progress'
import Link from 'next/link'
import {
  getTahfizDataAction,
  getTasmiSummaryAction,
  getGuruSmartInsightsAction,
  createTahfizTargetAction,
  reviseTahfizTargetAction,
  completeTahfizTargetAction,
  cancelTahfizTargetAction
} from './actions'
import type { TasmiHistoryRow } from '@/lib/tasmi/list'

type TahfizCoverageRow = {
  surahId: number
  ayahStart: number
  ayahEnd: number
  surahNameLatin: string
  totalAyahs: number
}

type ActiveTarget = {
  id: number
  startSurahId: number
  startAyah: number
  endSurahId: number
  endAyah: number
  academicYearId: number
}

export default function GuruHafalanClient({
  classes,
  initialStudents,
  surahs,
  teacherName
}: {
  classes: ClassRow[]
  initialStudents: StudentRow[]
  surahs: SurahRow[]
  teacherName: string
}) {
  const [selectedClassId, setSelectedClassId] = useState<number>(classes[0]?.id || 0)
  const [selectedStudentId, setSelectedStudentId] = useState<number>(0)

  const [records, setRecords] = useState<HafalanRow[]>([])
  const [coverage, setCoverage] = useState<TahfizCoverageRow[]>([])
  const [activeTarget, setActiveTarget] = useState<ActiveTarget | null>(null)

  const [tasmiSummary, setTasmiSummary] = useState<TasmiHistoryRow[]>([])
  const [smartInsights, setSmartInsights] = useState<SmartInsightData | null>(null)
  const [tasmiAuthorized, setTasmiAuthorized] = useState<boolean>(false)

  const [loading, setLoading] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Target Modals
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false)
  const [targetModalMode, setTargetModalMode] = useState<'create'|'revise'>('create')

  const [formData, setFormData] = useState({
    surah_id: surahs[0]?.id || 1,
    ayah_start: 1,
    ayah_end: 5,
    type: 'hafalan_baru' as 'hafalan_baru' | 'muraja_ah',
    score: 80,
  })

  const classStudents = initialStudents.filter(s => s.current_class_id === selectedClassId && s.status === 'active')

  useEffect(() => {
    setSelectedStudentId(0)
    setRecords([])
    setCoverage([])
    setActiveTarget(null)
    setTasmiSummary([])
    setSmartInsights(null)
  }, [selectedClassId])

  const loadData = async (studentId: number) => {
    setLoading(true)
    try {
      const [historyRes, tahfizRes, tasmiRes, smartRes] = await Promise.all([
        fetch(`/api/hafalan?student_id=${studentId}`),
        getTahfizDataAction(studentId),
        getTasmiSummaryAction(studentId),
        getGuruSmartInsightsAction(studentId)
      ])

      if (historyRes.ok) {
        const { data } = await historyRes.json()
        setRecords(data || [])
      }

      if (tahfizRes.success && tahfizRes.data) {
        setCoverage(tahfizRes.data.coverage || [])
        setActiveTarget(tahfizRes.data.activeTarget || null)
      }

      if (tasmiRes.success) {
        setTasmiAuthorized(tasmiRes.authorized)
        setTasmiSummary(tasmiRes.data || [])
      } else {
        setTasmiAuthorized(false)
        setTasmiSummary([])
      }
    } catch (err) {
      console.error('Failed to load data', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!selectedStudentId) {
      setRecords([])
      setCoverage([])
      setActiveTarget(null)
      return
    }
    loadData(selectedStudentId)
  }, [selectedStudentId])

  const handleSaveHafalan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStudentId) return

    setSaving(true)
    try {
      const res = await fetch('/api/hafalan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: selectedStudentId,
          ...formData
        })
      })
      if (res.ok) {
        await loadData(selectedStudentId)
        setIsFormOpen(false)
      } else {
        alert('Gagal menyimpan record hafalan')
      }
    } catch (err) {
      console.error(err)
      alert('Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
  }

  const handleTargetSubmit = async (data: { startSurahId: number; startAyah: number; endSurahId: number; endAyah: number }) => {
    if (!selectedStudentId) return
    const payload = { studentId: selectedStudentId, ...data }

    let res;
    if (targetModalMode === 'create') {
      res = await createTahfizTargetAction(payload)
    } else {
      if (!activeTarget) return
      res = await reviseTahfizTargetAction(activeTarget.id, payload)
    }

    if (res.success) {
      await loadData(selectedStudentId)
    } else {
      throw new Error(res.error)
    }
  }

  const handleCompleteTarget = async () => {
    if (!activeTarget || !selectedStudentId) return
    if (!confirm('Yakin ingin menyelesaikan target ini?')) return

    setLoading(true)
    const res = await completeTahfizTargetAction(activeTarget.id, selectedStudentId)
    if (res.success) {
      await loadData(selectedStudentId)
    } else {
      alert(res.error)
      setLoading(false)
    }
  }

  const handleCancelTarget = async () => {
    if (!activeTarget || !selectedStudentId) return
    if (!confirm('Yakin ingin membatalkan target ini?')) return

    setLoading(true)
    const res = await cancelTahfizTargetAction(activeTarget.id, selectedStudentId)
    if (res.success) {
      await loadData(selectedStudentId)
    } else {
      alert(res.error)
      setLoading(false)
    }
  }

  const selectedStudent = classStudents.find(s => s.id === selectedStudentId)
  const selectedSurah = surahs.find(s => s.id === formData.surah_id)
  const maxAyahs = selectedSurah ? selectedSurah.total_ayahs : 1

  // Aggregate Coverage per Surah
  const aggregatedCoverage = aggregateSurahCoverage(coverage)

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Student Selection (Top Context) */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div>
          <h3 className="font-bold text-gray-900 text-sm">Pilih Kelas & Santri</h3>
          <p className="text-xs text-gray-500">Pilih santri untuk melihat progress Tahfizh dan Hafalan</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Kelas</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#FBBF24]"
            >
              <option value={0} disabled>Pilih Kelas</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Santri</label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(Number(e.target.value))}
              disabled={!selectedClassId || classStudents.length === 0}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#FBBF24] disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value={0} disabled>Pilih Santri</option>
              {classStudents.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {selectedStudentId > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* Left Column: Target & Coverage */}
          <div className="lg:col-span-7 space-y-4">

            {/* AI Summary Card */}
            <GuruTahfizAiCard studentId={selectedStudentId} />

            {/* Active Target Card */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-[#4B21A2]">
                  <Target className="w-5 h-5" />
                  <h3 className="font-bold text-sm">Target Saat Ini</h3>
                </div>
                {!loading && !activeTarget && (
                  <button
                    onClick={() => { setTargetModalMode('create'); setIsTargetModalOpen(true); }}
                    className="text-xs font-bold text-white bg-[#4B21A2] px-3 py-1.5 rounded-lg hover:bg-[#3a1880]"
                  >
                    Buat Target
                  </button>
                )}
              </div>

              {loading ? (
                <div className="flex justify-center py-6"><RefreshCw className="w-5 h-5 animate-spin text-gray-400" /></div>
              ) : activeTarget ? (
                <div className="space-y-4">
                  <div className="bg-[#F0EDF9] p-4 rounded-xl border border-purple-100">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <p className="text-xs text-gray-500 font-semibold mb-1">Rentang Hafalan</p>
                        <p className="text-sm font-bold text-[#4B21A2]">
                          {surahs.find(s => s.id === activeTarget.startSurahId)?.name_latin} {activeTarget.startAyah}
                          <span className="mx-2 font-normal text-gray-400">s/d</span>
                          {surahs.find(s => s.id === activeTarget.endSurahId)?.name_latin} {activeTarget.endAyah}
                        </p>
                      </div>
                      <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-[10px] font-bold">ACTIVE</span>
                    </div>
                    {(() => {
                      const progress = calculateTargetProgress(
                        activeTarget,
                        surahs.map(s => ({ id: s.id, number: s.number, totalAyahs: s.total_ayahs })),
                        coverage
                      )
                      return (
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[10px]">
                            <span className="font-bold text-gray-600">Progres Target</span>
                            <span className="text-gray-500 font-semibold">{progress.coveredAyahs} / {progress.totalTargetAyahs} ayat ({progress.percentage}%)</span>
                          </div>
                          <div className="w-full bg-white rounded-full h-2 overflow-hidden border border-purple-200">
                            <div className="bg-[#4B21A2] h-2 rounded-full transition-all" style={{ width: `${progress.percentage}%` }} />
                          </div>
                          {progress.isCovered && (
                            <p className="text-[10px] text-emerald-600 font-bold mt-1">
                              Target telah tercapai berdasarkan cakupan hafalan
                            </p>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => { setTargetModalMode('revise'); setIsTargetModalOpen(true); }}
                      className="text-xs font-bold bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 flex items-center gap-1"
                    >
                      <Edit className="w-3.5 h-3.5" /> Revisi
                    </button>
                    <button
                      onClick={handleCompleteTarget}
                      className="text-xs font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-100 flex items-center gap-1"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Selesaikan
                    </button>
                    <button
                      onClick={handleCancelTarget}
                      className="text-xs font-bold bg-red-50 border border-red-200 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-100 flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Batalkan
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  Belum ada target aktif untuk santri ini.
                </div>
              )}
            </div>

            {/* Coverage Summary */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-[#FAFAFA]">
                <h3 className="font-bold text-gray-900 text-sm">Progres Hafalan (Capaian)</h3>
                <p className="text-xs text-gray-500">Visualisasi ayat yang sudah disetorkan</p>
              </div>
              <div className="p-4 space-y-4 max-h-[400px] overflow-y-auto">
                {loading ? (
                  <div className="flex justify-center py-6"><RefreshCw className="w-5 h-5 animate-spin text-gray-400" /></div>
                ) : aggregatedCoverage.length === 0 ? (
                  <div className="text-center py-6 text-xs text-gray-500">
                    Belum ada capaian hafalan.
                  </div>
                ) : (
                  aggregatedCoverage.map(sc => {
                    const pct = Math.round((sc.covered / sc.total) * 100)
                    return (
                      <div key={sc.name} className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="font-bold text-gray-800">{sc.name}</span>
                          <span className="text-gray-500 font-semibold">{sc.covered} / {sc.total} ayat ({pct}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-emerald-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="text-[10px] text-gray-400">
                          Rentang tercapai: {sc.formattedRanges}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

          </div>

          {/* Right Column: Tasmi & History */}
          <div className="lg:col-span-5 space-y-4">

            {/* Tasmi Summary Card */}
            {tasmiAuthorized && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-[#FAFAFA]">
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Tasmi Terbaru</h3>
                  </div>
                  <Link
                    href={`/guru/tasmi?studentId=${selectedStudentId}`}
                    className="text-xs font-bold text-[#4B21A2] hover:text-[#3a1880] underline"
                  >
                    Kelola Tasmi
                  </Link>
                </div>
                <div className="p-4">
                  {loading ? (
                    <div className="flex justify-center py-4"><RefreshCw className="w-4 h-4 animate-spin text-gray-400" /></div>
                  ) : tasmiSummary.length === 0 ? (
                    <div className="text-center py-4 text-xs text-gray-500">
                      Belum ada riwayat Tasmi.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {tasmiSummary.map(tasmi => (
                        <div key={tasmi.id} className="flex justify-between items-center pb-3 border-b border-gray-50 last:border-0 last:pb-0">
                          <div>
                            <p className="font-bold text-gray-800 text-xs">
                              {tasmi.mode === 'SURAH'
                                ? tasmi.surah_name_latin
                                : `Juz ${tasmi.start_juz === tasmi.end_juz ? tasmi.start_juz : `${tasmi.start_juz}-${tasmi.end_juz}`}`
                              }
                            </p>
                            <p className="text-[10px] text-gray-500">
                              {new Date(tasmi.session_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              tasmi.status === 'PASSED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {tasmi.status === 'PASSED' ? 'Lulus' : 'Perlu Pengulangan'}
                            </span>
                            {tasmi.score !== null && (
                              <p className="text-[10px] font-bold text-gray-600 mt-1">Nilai: {tasmi.score}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full max-h-[600px]">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-[#FAFAFA] flex-shrink-0">
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Riwayat Setoran</h3>
                </div>
                <button
                  onClick={() => setIsFormOpen(true)}
                  className="flex items-center gap-1.5 bg-[#FBBF24] text-[#18085A] px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-[#F59E0B] shadow-sm transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Setoran
                </button>
              </div>

              <div className="p-3 bg-blue-50 border-b border-blue-100 flex items-start gap-2 flex-shrink-0">
                <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-[10px] text-blue-700 leading-tight">
                  Riwayat setoran yang sudah tersimpan belum dapat diubah dari halaman ini. Pastikan data benar sebelum menyimpan.
                </p>
              </div>

              <div className="overflow-y-auto flex-1">
                {loading ? (
                  <div className="flex justify-center items-center py-12">
                    <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
                  </div>
                ) : records.length === 0 ? (
                  <div className="text-center py-12 text-sm text-gray-500">
                    Belum ada riwayat.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {records.map((r) => (
                      <div key={r.id} className="p-3 hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-bold text-[#4B21A2] text-xs">
                            {r.surah_name_latin} : {r.ayah_start}-{r.ayah_end}
                          </span>
                          <span className="text-[10px] text-gray-400 font-medium">
                            {new Date(r.session_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-[#4B21A2]">
                            {r.type === 'hafalan_baru' ? 'Ziyadah' : "Muraja'ah"}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-600">
                            Nilai: {r.score ?? '-'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Target Modal */}
      <TahfizTargetModal
        isOpen={isTargetModalOpen}
        onClose={() => setIsTargetModalOpen(false)}
        onSubmit={handleTargetSubmit}
        surahs={surahs}
        initialData={targetModalMode === 'revise' && activeTarget ? activeTarget : null}
        title={targetModalMode === 'create' ? 'Buat Target Baru' : 'Revisi Target'}
      />

      {/* Hafalan Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-[#FAFAFA] flex-shrink-0">
              <h3 className="font-bold text-gray-900">Tambah Setoran</h3>
              <button onClick={() => setIsFormOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto">
              <form id="hafalan-form" onSubmit={handleSaveHafalan} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Surah</label>
                  <SurahSelector
                    surahs={surahs}
                    value={formData.surah_id}
                    onChange={(newSurahId) => {
                      const newSurah = surahs.find(s => s.id === newSurahId)
                      const newMax = newSurah ? newSurah.total_ayahs : 1
                      setFormData(p => ({
                        ...p,
                        surah_id: newSurahId,
                        ayah_start: p.ayah_start > newMax ? newMax : p.ayah_start,
                        ayah_end: p.ayah_end > newMax ? newMax : p.ayah_end
                      }))
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Ayat Mulai</label>
                    <input
                      type="number"
                      required min={1} max={maxAyahs}
                      value={formData.ayah_start}
                      onChange={e => setFormData(p => ({ ...p, ayah_start: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#FBBF24]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Ayat Selesai</label>
                    <input
                      type="number"
                      required min={1} max={maxAyahs}
                      value={formData.ayah_end}
                      onChange={e => setFormData(p => ({ ...p, ayah_end: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#FBBF24]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Jenis Setoran</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio" name="type" value="hafalan_baru"
                        checked={formData.type === 'hafalan_baru'}
                        onChange={() => setFormData(p => ({ ...p, type: 'hafalan_baru' }))}
                        className="text-[#4B21A2] focus:ring-[#4B21A2]"
                      />
                      Ziyadah / Hafalan Baru
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio" name="type" value="muraja_ah"
                        checked={formData.type === 'muraja_ah'}
                        onChange={() => setFormData(p => ({ ...p, type: 'muraja_ah' }))}
                        className="text-[#4B21A2] focus:ring-[#4B21A2]"
                      />
                      Muraja'ah
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Nilai (0-100, Opsional)</label>
                  <input
                    type="number"
                    min={0} max={100}
                    value={formData.score || ''}
                    onChange={e => setFormData(p => ({ ...p, score: e.target.value ? Number(e.target.value) : 0 }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#FBBF24]"
                  />
                </div>
              </form>
            </div>

            <div className="p-4 border-t border-gray-100 bg-[#FAFAFA] flex justify-end gap-3 flex-shrink-0">
              <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-900">Batal</button>
              <button type="submit" form="hafalan-form" disabled={saving} className="bg-[#4B21A2] hover:bg-[#3a1880] text-white px-6 py-2 rounded-xl text-sm font-bold shadow-sm flex items-center gap-2 disabled:opacity-70">
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Sticky FAB */}
      {selectedStudentId > 0 && !isFormOpen && (
        <button
          onClick={() => setIsFormOpen(true)}
          className="lg:hidden fixed bottom-6 right-6 bg-[#FBBF24] text-[#18085A] p-4 rounded-full shadow-lg hover:bg-[#F59E0B] transition-transform active:scale-95 z-50 flex items-center justify-center"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}
    </div>
  )
}
