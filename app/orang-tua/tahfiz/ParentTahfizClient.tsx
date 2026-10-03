'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getParentTahfizOverviewAction } from './actions'
import { ChildDashboardSelector } from '@/components/orang-tua/ChildDashboardSelector'
import { User, AlertCircle } from 'lucide-react'
import { TargetCard } from '@/app/_components/tahfiz/TargetCard'
import { CoverageCard } from '@/app/_components/tahfiz/CoverageCard'
import { HafalanHistoryCard } from '@/app/_components/tahfiz/HafalanHistoryCard'
import { TasmiCard } from '@/app/_components/tahfiz/TasmiCard'
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
          <TargetCard target={target} targetProgress={targetProgress} />
          <CoverageCard coverage={coverage} />
        </div>

        {/* Right Column: History & Tasmi */}
        <div className="space-y-6">
          <HafalanHistoryCard hafalanHistory={hafalanHistory} />
          <TasmiCard tasmiAchievements={tasmiAchievements} />
        </div>
        
      </div>
    </div>
  )
}
