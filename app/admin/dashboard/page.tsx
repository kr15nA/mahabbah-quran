'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Users,
  CheckCircle,
  User,
  Layers,
  Activity,
  AlertTriangle,
  Eye,
  Brain,
  RefreshCw,
  X,
} from 'lucide-react'
import LearningProgressChart from '@/components/charts/LearningProgressChart'
import AttendanceBarChart from '@/components/charts/AttendanceBarChart'

const AI_QS = [
  'Santri mana yang perlu perhatian khusus bulan ini?',
  'Bagaimana perkembangan hafalan keseluruhan?',
  'Guru mana yang belum menyelesaikan laporan?',
]

const AI_ANS: Record<string, string> = {
  'Santri mana yang perlu perhatian khusus bulan ini?':
    `Berdasarkan data September 2026, terdapat **3 santri** yang memerlukan perhatian:\n\n1. **Aisyah Nur Hidayah** (Kelompok A) — Nilai hafalan di bawah 60 dalam 3 sesi berturut-turut. Skor rata-rata: 58/100. Disarankan tambah sesi muraja'ah.\n\n2. **Khadijah Putri** (Kelompok B) — Kehadiran bulan ini hanya 68%, di bawah ambang 70%. Orang tua perlu segera dihubungi.\n\n3. **Fulan bin Fulan** (Kelompok C) — Tren nilai menurun dari 65 ke 55 dalam 4 minggu. Progress hafalan 40%, terendah di angkatan.`,

  'Bagaimana perkembangan hafalan keseluruhan?':
    `Alhamdulillah, perkembangan hafalan menunjukkan tren positif bulan ini:\n\n📈 **Rata-rata hafalan**: 75% (naik +2% dari bulan lalu)\n📈 **Rata-rata tahsin**: 78% (stabil)\n⭐ **Rata-rata nilai**: 88/100\n\nKelas terbaik: **Kelompok C** (rata-rata kemajuan 67%). Berprestasi: Maryam Sholihah (82%) dan Yusuf Al-Amin (80%).\nYang perlu didorong: Kelompok A khususnya Aisyah (50%) dan Fatimah (60%).`,

  'Guru mana yang belum menyelesaikan laporan?':
    `Status laporan per Kamis 4 September 2026:\n\n✅ **Ustadz Aldi Solihin** — 4/4 santri dilaporkan (100%)\n⚠️ **Ustadzah Siti Rahmah** — 2/3 santri dilaporkan (67%). Draft: Muhammad Raihan\n⚠️ **Ustadz Ahmad Fauzi** — 2/3 santri dilaporkan (67%). Draft: Fulan bin Fulan\n\n**Rekomendasi**: Kirim pengingat ke Ustadzah Siti Rahmah dan Ustadz Ahmad Fauzi untuk menyelesaikan 2 laporan yang masih draft sebelum pukul 17:00 hari ini.`,
}

const AT_RISK = [
  { name: 'Aisyah Nur Hidayah', cls: 'Kelompok A', issue: 'Nilai hafalan < 60 (3 sesi berturut)', status: 'Perlu perhatian', sev: 'danger' },
  { name: 'Khadijah Putri', cls: 'Kelompok B', issue: 'Kehadiran bulan ini 68%', status: 'Perlu perhatian', sev: 'warning' },
  { name: 'Fulan bin Fulan', cls: 'Kelompok C', issue: 'Nilai menurun signifikan (55→40)', status: 'Perlu perhatian', sev: 'danger' },
]

export default function AdminDashboardPage() {
  const [aiQ, setAiQ] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiAns, setAiAns] = useState<string | null>(null)

  const askAI = (q: string) => {
    setAiQ(q)
    setAiLoading(true)
    setAiAns(null)
    setTimeout(() => {
      setAiLoading(false)
      setAiAns(AI_ANS[q] || 'Data analisis diproses.')
    }, 1000)
  }

  return (
    <div className="space-y-5">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-5 gap-3.5">
        {[
          { icon: Users, label: 'Total Santri', val: 150, sub: 'Terdaftar', col: '#4B21A2' },
          { icon: CheckCircle, label: 'Santri Aktif', val: 143, sub: 'Bulan ini', col: '#16A34A' },
          { icon: User, label: 'Guru Tahfizh', val: 18, sub: 'Mengajar', col: '#7B4BD6' },
          { icon: Layers, label: 'Kelas Aktif', val: 12, sub: 'Program', col: '#F59E0B' },
          { icon: Activity, label: 'Kehadiran Bulan Ini', val: '92%', sub: 'Rata-rata', col: '#0EA5E9' },
        ].map(({ icon: Icon, label, val, sub, col }) => (
          <div key={label} className="bg-white p-4.5 rounded-2xl border border-gray-200 flex items-center gap-3.5 shadow-sm">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${col}15` }}>
              <Icon className="w-5.5 h-5.5" style={{ color: col }} />
            </div>
            <div>
              <div className="text-2xl font-extrabold text-gray-900 leading-none">{val}</div>
              <div className="text-xs text-gray-400 mt-1 font-medium">{label}</div>
              <div className="text-[11px] font-semibold mt-0.5" style={{ color: col }}>{sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-3.5">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-gray-900">Perkembangan Hafalan</h3>
            <Link href="/admin/analitik" className="text-xs font-semibold text-[#4B21A2] hover:underline">
              Detail →
            </Link>
          </div>
          <div className="flex gap-4 mb-3 text-xs text-gray-500">
            <div className="flex items-center gap-1.5"><span className="text-[#4B21A2]">●</span> Hafalan</div>
            <div className="flex items-center gap-1.5"><span className="text-[#FBBF24]">●</span> Tahsin</div>
            <div className="flex items-center gap-1.5"><span className="text-[#16A34A]">●</span> Nilai</div>
          </div>
          <LearningProgressChart />
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-gray-900">Kehadiran Santri</h3>
            <Link href="/admin/absensi" className="text-xs font-semibold text-[#4B21A2] hover:underline">
              Detail →
            </Link>
          </div>
          <div className="flex gap-4 mb-3 text-xs text-gray-500">
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#4B21A2]" /> Hadir</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#FBBF24]" /> Izin</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#F59E0B]" /> Sakit</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#DC2626]" /> Alfa</div>
          </div>
          <AttendanceBarChart />
        </div>
      </div>

      {/* Report Status + At Risk + AI Panel */}
      <div className="grid grid-cols-12 gap-3.5">
        {/* Status Laporan & Quick Stats */}
        <div className="col-span-3 space-y-3.5">
          <div className="bg-white p-4.5 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-gray-900">Status Laporan Guru</h3>
              <Link href="/admin/laporan" className="text-xs font-semibold text-[#4B21A2]">Lihat</Link>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 bg-[#F0EDF9] rounded-xl">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-[#16A34A]" />
                  <span className="text-xs text-gray-700 font-medium">Sudah dikirim</span>
                </div>
                <span className="text-lg font-extrabold text-[#16A34A]">16</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-[#F0EDF9] rounded-xl">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-[#D97706]" />
                  <span className="text-xs text-gray-700 font-medium">Menunggu review</span>
                </div>
                <span className="text-lg font-extrabold text-[#D97706]">2</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-[#F0EDF9] rounded-xl">
                <div className="flex items-center gap-2">
                  <X className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-700 font-medium">Belum dibuat</span>
                </div>
                <span className="text-lg font-extrabold text-gray-400">0</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-4.5 rounded-2xl border border-gray-200 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Statistik Cepat</h3>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-[#F0EDF9] p-2.5 rounded-xl">
                <div className="text-xl font-extrabold text-[#4B21A2]">75%</div>
                <div className="text-[10px] text-gray-500 font-medium">Hafalan</div>
              </div>
              <div className="bg-[#F0EDF9] p-2.5 rounded-xl">
                <div className="text-xl font-extrabold text-[#7B4BD6]">78%</div>
                <div className="text-[10px] text-gray-500 font-medium">Tahsin</div>
              </div>
              <div className="bg-[#F0EDF9] p-2.5 rounded-xl">
                <div className="text-xl font-extrabold text-[#16A34A]">92%</div>
                <div className="text-[10px] text-gray-500 font-medium">Kehadiran</div>
              </div>
              <div className="bg-[#F0EDF9] p-2.5 rounded-xl">
                <div className="text-xl font-extrabold text-[#FBBF24]">88</div>
                <div className="text-[10px] text-gray-500 font-medium">Nilai Rata</div>
              </div>
            </div>
          </div>
        </div>

        {/* At-Risk Table */}
        <div className="col-span-5 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-gray-900">Santri Perlu Perhatian</h3>
            <Link href="/admin/santri" className="text-xs font-semibold text-[#4B21A2]">Lihat Semua →</Link>
          </div>
          <div className="space-y-2.5">
            {AT_RISK.map((r, i) => (
              <div
                key={i}
                className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${
                  r.sev === 'danger' ? 'bg-red-50/50 border-red-200' : 'bg-amber-50/50 border-amber-200'
                }`}
              >
                <div className="flex gap-2.5 min-w-0">
                  <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${r.sev === 'danger' ? 'text-red-600' : 'text-amber-600'}`} />
                  <div>
                    <div className="text-xs font-bold text-gray-900">{r.name}</div>
                    <div className="text-[11px] text-gray-400">{r.cls}</div>
                    <div className={`text-[11px] font-semibold mt-1 ${r.sev === 'danger' ? 'text-red-600' : 'text-amber-600'}`}>
                      {r.issue}
                    </div>
                  </div>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-700 whitespace-nowrap">
                  {r.status}
                </span>
              </div>
            ))}
            <Link
              href="/admin/santri"
              className="w-full mt-2 py-2.5 bg-[#EDE9FE] border border-dashed border-[#7B4BD6] text-[#4B21A2] rounded-xl font-semibold text-xs flex items-center justify-center gap-2 hover:bg-[#7B4BD6]/10 transition-all"
            >
              <Eye className="w-3.5 h-3.5" /> Lihat semua santri
            </Link>
          </div>
        </div>

        {/* AI Mahabbah Panel */}
        <div className="col-span-4 bg-gradient-to-br from-[#18085A] to-[#2D1080] p-5 rounded-2xl text-white flex flex-col justify-between shadow-md">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-[#FBBF24] flex items-center justify-center text-[#18085A]">
                <Brain className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Analisis dengan AI</div>
                <div className="text-[10px] text-white/45">Powered by Claude</div>
              </div>
            </div>

            {!aiAns && !aiLoading && (
              <div className="space-y-2">
                <div className="text-[11px] text-white/45 mb-1">Pertanyaan cepat:</div>
                {AI_QS.map((q) => (
                  <button
                    key={q}
                    onClick={() => askAI(q)}
                    className="w-full text-left p-2.5 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl text-[11px] text-white/80 transition-all leading-snug"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {aiLoading && (
              <div className="py-8 text-center space-y-2">
                <div className="flex justify-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#FBBF24] animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-[#FBBF24] animate-bounce delay-100" />
                  <div className="w-2 h-2 rounded-full bg-[#FBBF24] animate-bounce delay-200" />
                </div>
                <div className="text-xs text-white/50">Sedang menganalisis data...</div>
              </div>
            )}

            {aiAns && (
              <div className="space-y-2">
                <div className="text-[10px] font-semibold bg-[#FBBF24]/20 text-[#FBBF24] px-2 py-1 rounded-md inline-block">
                  {aiQ}
                </div>
                <div className="text-xs text-white/90 leading-relaxed max-h-48 overflow-y-auto space-y-1 pr-1">
                  {aiAns.split('\n').map((line, idx) => (
                    <p key={idx}>{line.replace(/\*\*(.*?)\*\*/g, '$1')}</p>
                  ))}
                </div>
              </div>
            )}
          </div>

          {aiAns && (
            <button
              onClick={() => {
                setAiAns(null)
                setAiQ(null)
              }}
              className="mt-3 w-full py-1.5 bg-white/10 hover:bg-white/15 border border-white/10 rounded-lg text-xs text-white/70"
            >
              ← Kembali ke pertanyaan
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
