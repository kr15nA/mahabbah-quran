'use client'

import { useState } from 'react'
import { Brain, Search, AlertCircle, CheckCircle2, XCircle } from 'lucide-react'

type StudentOption = {
  id: number
  full_name: string
  class_name: string
}

type AIClientProps = {
  students: StudentOption[]
}

type AIResult = {
  summary: string
  strengths: string[]
  concerns: string[]
  teacher_actions: string[]
  parent_guidance: string[]
}

export default function AdminAIClient({ students }: AIClientProps) {
  const [selectedStudent, setSelectedStudent] = useState<string>('')
  const [period, setPeriod] = useState<string>(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AIResult | null>(null)

  const handleAnalyze = async () => {
    if (!selectedStudent || !period) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: selectedStudent, period }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Terjadi kesalahan saat memproses analisis')
      }

      setResult(data.answer)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <h2 className="font-bold text-[#18085A] text-lg mb-4 flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-600" />
          Konfigurasi Analisis
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Santri</label>
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
            >
              <option value="">Pilih Santri...</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name} ({s.class_name})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Periode (Bulan)</label>
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>
        </div>

        <button
          onClick={handleAnalyze}
          disabled={!selectedStudent || !period || loading}
          className="bg-[#18085A] hover:bg-[#2b1099] text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              Menganalisis...
            </span>
          ) : (
            <>
              <Search className="w-4 h-4" />
              Mulai Analisis
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="text-sm">{error}</div>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <h3 className="font-bold text-[#18085A] mb-2">Ringkasan Akademik</h3>
            <p className="text-sm text-gray-700 leading-relaxed">{result.summary}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green-50 p-5 rounded-2xl border border-green-100">
              <h3 className="font-bold text-green-800 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                Kekuatan & Kemajuan
              </h3>
              <ul className="space-y-2">
                {result.strengths.length > 0 ? (
                  result.strengths.map((s, i) => (
                    <li key={i} className="text-sm text-green-700 flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">•</span>
                      <span>{s}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-green-700 opacity-70">Tidak ada observasi.</li>
                )}
              </ul>
            </div>

            <div className="bg-orange-50 p-5 rounded-2xl border border-orange-100">
              <h3 className="font-bold text-orange-800 mb-3 flex items-center gap-2">
                <XCircle className="w-5 h-5" />
                Perlu Perhatian
              </h3>
              <ul className="space-y-2">
                {result.concerns.length > 0 ? (
                  result.concerns.map((c, i) => (
                    <li key={i} className="text-sm text-orange-700 flex items-start gap-2">
                      <span className="text-orange-500 mt-0.5">•</span>
                      <span>{c}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-orange-700 opacity-70">Tidak ada isu serius.</li>
                )}
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100">
              <h3 className="font-bold text-blue-800 mb-3">Tindakan Guru</h3>
              <ul className="space-y-2">
                {result.teacher_actions.length > 0 ? (
                  result.teacher_actions.map((t, i) => (
                    <li key={i} className="text-sm text-blue-700 flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>{t}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-blue-700 opacity-70">-</li>
                )}
              </ul>
            </div>

            <div className="bg-purple-50 p-5 rounded-2xl border border-purple-100">
              <h3 className="font-bold text-purple-800 mb-3">Saran untuk Orang Tua</h3>
              <ul className="space-y-2">
                {result.parent_guidance.length > 0 ? (
                  result.parent_guidance.map((p, i) => (
                    <li key={i} className="text-sm text-purple-700 flex items-start gap-2">
                      <span className="text-purple-500 mt-0.5">•</span>
                      <span>{p}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-purple-700 opacity-70">-</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
