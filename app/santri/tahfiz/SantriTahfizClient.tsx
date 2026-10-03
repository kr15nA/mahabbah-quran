'use client'

import { useState, useEffect } from 'react'
import { getSantriTahfizOverviewAction, getSantriSmartInsightsAction } from './actions'
import { TargetCard } from '@/app/_components/tahfiz/TargetCard'
import { CoverageCard } from '@/app/_components/tahfiz/CoverageCard'
import { HafalanHistoryCard } from '@/app/_components/tahfiz/HafalanHistoryCard'
import { TasmiCard } from '@/app/_components/tahfiz/TasmiCard'
import SmartInsightCard, { SmartInsightData } from '@/app/_components/tahfiz/SmartInsightCard'
import { AlertCircle, User } from 'lucide-react'

export default function SantriTahfizClient() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [smartInsights, setSmartInsights] = useState<SmartInsightData | null>(null)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const [res, smartRes] = await Promise.all([getSantriTahfizOverviewAction(), getSantriSmartInsightsAction()])
      if (res.success) {
        setData(res.data)
      } else {
        setError(res.error || 'Gagal memuat data Tahfiz')
      }
      setLoading(false)
    }
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto w-full px-4 sm:px-6">
        <div className="animate-pulse bg-white p-6 rounded-2xl h-24 border border-gray-200"></div>
        <div className="animate-pulse bg-white p-6 rounded-2xl h-48 border border-gray-200"></div>
        <div className="animate-pulse bg-white p-6 rounded-2xl h-48 border border-gray-200"></div>
      </div>
    )
  }

  if (error) {
    if (error === 'NO_LEARNER_PROFILE') {
      return (
        <div className="space-y-6 max-w-4xl mx-auto w-full px-4 sm:px-6">
          <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="font-bold text-gray-900 mb-1">Profil Belum Lengkap</h3>
            <p className="text-sm text-gray-500">Anda belum terhubung dengan data santri aktif.</p>
          </div>
        </div>
      )
    }
    return (
      <div className="space-y-6 max-w-4xl mx-auto w-full px-4 sm:px-6">
        <div className="bg-red-50 p-8 rounded-2xl border border-red-200 text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <h3 className="font-bold text-red-900 mb-2 text-xl">Terjadi Kesalahan</h3>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    )
  }

  if (!data) return null

  const { target, targetProgress, coverage, hafalanHistory, tasmiAchievements } = data

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full px-4 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Tahfiz
        </h1>
        <p className="text-sm text-gray-500 mt-1">Pantau target dan capaian hafalan Anda.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Target & Coverage */}
        <div className="space-y-6">
          <TargetCard target={target} targetProgress={targetProgress} />
          <CoverageCard coverage={coverage} />
        </div>

        {/* Right Column: History & Tasmi */}
        <div className="space-y-6">
          <HafalanHistoryCard hafalanHistory={hafalanHistory} detailLink="/santri/hafalan" />
          <TasmiCard tasmiAchievements={tasmiAchievements} detailLink="/santri/tasmi" />
        </div>
      </div>
    </div>
  )
}
