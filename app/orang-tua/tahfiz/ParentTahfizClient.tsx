'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getParentTahfizOverviewAction } from './actions'
import { ChildDashboardSelector } from '@/components/orang-tua/ChildDashboardSelector'
import { User, Award, BookOpen, Target, CheckCircle2, AlertCircle } from 'lucide-react'

export default function ParentTahfizClient({ initialChildId }: { initialChildId?: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentChildId = searchParams.get('child_id') || initialChildId

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async (id?: string) => {
    setLoading(true)
    setError(null)
    const result = await getParentTahfizOverviewAction(id)
    if (result?.error) {
      setError(result.error)
      setData(null)
    } else if (result?.resolutionStatus) {
      if (result.resolutionStatus === 'NO_CHILDREN') {
        setData({ resolutionStatus: 'NO_CHILDREN' })
      } else if (result.resolutionStatus === 'INVALID_CHILD' || result.resolutionStatus === 'CHILD_REQUIRED') {
        router.replace('/orang-tua/tahfiz')
      } else if (result.resolutionStatus === 'FORBIDDEN_CHILD') {
        setData({ resolutionStatus: 'FORBIDDEN_CHILD' })
      } else if (result.resolutionStatus === 'AUTHORIZED') {
        // If URL doesn't have child_id but we resolved to one, update URL
        if (!currentChildId && result.child?.student_id) {
          router.replace(`/orang-tua/tahfiz?child_id=${result.child.student_id}`)
        }
        setData(result)
      }
    } else {
      setError('Terjadi kesalahan yang tidak diketahui')
    }
    setLoading(false)
  }, [currentChildId, router])

  useEffect(() => {
    loadData(currentChildId || undefined)
  }, [currentChildId, loadData])

  if (loading) {
    return (
      <div className="space-y-6 pb-20 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse bg-white p-6 rounded-2xl h-24 border border-gray-200"></div>
        <div className="animate-pulse bg-white p-6 rounded-2xl h-48 border border-gray-200"></div>
        <div className="animate-pulse bg-white p-6 rounded-2xl h-48 border border-gray-200"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6 pb-20 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8">
        <div className="bg-red-50 p-8 rounded-2xl border border-red-200 text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <h3 className="font-bold text-red-900 mb-2 text-xl">Terjadi Kesalahan</h3>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    )
  }

  if (data?.resolutionStatus === 'NO_CHILDREN') {
    return (
      <div className="space-y-6 pb-20 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8">
        <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="font-bold text-gray-900 mb-1">Belum Ada Data Anak</h3>
          <p className="text-sm text-gray-500">Belum ada santri yang terhubung ke akun Anda.</p>
        </div>
      </div>
    )
  }

  if (data?.resolutionStatus === 'FORBIDDEN_CHILD') {
    return (
      <div className="space-y-6 pb-20 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8">
        <div className="bg-red-50 p-8 rounded-2xl border border-red-200 shadow-sm text-center">
          <h3 className="font-bold text-red-900 mb-2 text-xl">Akses Ditolak</h3>
          <p className="text-sm text-red-700">Anda tidak memiliki akses untuk melihat data Tahfiz santri ini.</p>
        </div>
      </div>
    )
  }

  if (!data || data.resolutionStatus !== 'AUTHORIZED') return null

  const { child, children, target, targetProgress, hafalanHistory, tasmiAchievements, coverage } = data

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-center">
        <h1 className="font-extrabold text-lg text-[#18085A]">Tahfiz Anak</h1>
        <p className="text-sm font-medium text-gray-600 mt-1">
          {children.length} santri terhubung
        </p>
      </div>

      <ChildDashboardSelector childrenList={children} selectedChildId={child.student_id} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Target & Coverage */}
        <div className="space-y-6">
          {/* Target Card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-blue-50/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Target className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="font-bold text-gray-900">Target Saat Ini</h3>
              </div>
            </div>
            <div className="p-4 flex-1">
              {target ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Mulai</p>
                      <p className="font-medium text-sm">{target.startSurahName} : {target.startAyah}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500 mb-1">Selesai</p>
                      <p className="font-medium text-sm">{target.endSurahName} : {target.endAyah}</p>
                    </div>
                  </div>
                  
                  {targetProgress && (
                    <div className="pt-2 border-t border-gray-100">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-medium text-gray-500">Progress</span>
                        <span className="text-xs font-bold text-blue-600">
                          {targetProgress.percentage}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 transition-all duration-500"
                          style={{ width: `${Math.min(targetProgress.percentage, 100)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {targetProgress.completedAyahs} dari {targetProgress.totalAyahsTarget} ayat disetorkan
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-sm text-gray-500">
                  Belum ada target hafalan aktif.
                </div>
              )}
            </div>
          </div>

          {/* Coverage Card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
             <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-indigo-600" />
                </div>
                <h3 className="font-bold text-gray-900">Capaian Hafalan</h3>
              </div>
            </div>
            <div className="p-4 max-h-[300px] overflow-y-auto">
              {coverage && coverage.length > 0 ? (
                <div className="space-y-3">
                  {coverage.map((c: any, i: number) => {
                    const isFull = (c.ayahEnd - c.ayahStart + 1) === c.totalAyahs
                    return (
                      <div key={i} className="flex justify-between items-center text-sm border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                        <span className="font-medium text-gray-800">{c.surahNameLatin}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Ayat {c.ayahStart}-{c.ayahEnd}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${isFull ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {isFull ? 'Selesai' : 'Sebagian'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-sm text-gray-500">
                  Belum ada capaian hafalan tercatat.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: History & Tasmi */}
        <div className="space-y-6">
          {/* Recent Hafalan */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2">
              <h3 className="font-bold text-gray-900">Aktivitas Hafalan Terbaru</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {hafalanHistory && hafalanHistory.length > 0 ? (
                hafalanHistory.map((h: any) => (
                  <div key={h.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm text-gray-900">{h.surahName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Ayat {h.startAyah} - {h.endAyah}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${
                          h.type === 'hafalan_baru' 
                            ? 'bg-blue-50 text-blue-700' 
                            : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {h.type === 'hafalan_baru' ? 'Hafalan Baru' : 'Murajaah'}
                        </span>
                        <span className="text-[10px] text-gray-400">{h.date}</span>
                      </div>
                    </div>
                    {h.score !== null && (
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] text-gray-400 mb-1">Nilai</span>
                        <span className="text-sm font-bold text-gray-700 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">{h.score}</span>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-sm text-gray-500">
                  Belum ada riwayat aktivitas hafalan.
                </div>
              )}
            </div>
          </div>

          {/* Tasmi Achievements */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2 bg-emerald-50/50">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Award className="w-4 h-4 text-emerald-600" />
              </div>
              <h3 className="font-bold text-gray-900">Pencapaian Tasmi</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {tasmiAchievements && tasmiAchievements.length > 0 ? (
                tasmiAchievements.map((t: any) => (
                  <div key={t.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm text-gray-900">
                        {t.mode === 'SURAH' ? t.surahName : `Juz ${t.startJuz}${t.endJuz > t.startJuz ? `-${t.endJuz}` : ''}`}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          Lulus
                        </span>
                        <span className="text-[10px] text-gray-400">{t.date}</span>
                      </div>
                    </div>
                    {t.score !== null && (
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] text-gray-400 mb-1">Nilai</span>
                        <span className="text-sm font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">{t.score}</span>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-sm text-gray-500">
                  Belum ada pencapaian Tasmi.
                </div>
              )}
            </div>
          </div>
        </div>
        
      </div>
    </div>
  )
}
