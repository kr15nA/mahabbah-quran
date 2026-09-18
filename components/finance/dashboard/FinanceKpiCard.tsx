'use client'

import { Card } from '@/components/ui/Card'
import { ReactNode } from 'react'

interface FinanceKpiCardProps {
  title: string
  value: string | ReactNode
  icon: ReactNode
  subtext?: ReactNode
  valueColor?: string
  iconBgColor?: string
  iconColor?: string
  isDynamic?: boolean
  trendIcon?: ReactNode
  className?: string
}

export function FinanceKpiCard({ 
  title, 
  value, 
  icon, 
  subtext, 
  valueColor = 'text-gray-900', 
  iconBgColor = 'bg-gray-100',
  iconColor = 'text-gray-600',
  isDynamic = false,
  trendIcon,
  className = ''
}: FinanceKpiCardProps) {
  return (
    <Card className={`p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-100 ${className}`}>
      <div className="flex justify-between items-start mb-2">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconBgColor} ${iconColor}`}>
          {icon}
        </div>
      </div>
      
      <div className="mt-2">
        <p className="text-sm font-semibold text-gray-500 mb-1">{title}</p>
        <div className="flex items-center gap-2">
          {isDynamic && trendIcon}
          <h3 className={`text-2xl md:text-3xl font-bold tracking-tight ${valueColor}`}>
            {value}
          </h3>
        </div>
      </div>

      {subtext && (
        <div className="pt-4 mt-4 border-t border-gray-50 text-xs text-gray-500 font-medium">
          {subtext}
        </div>
      )}
    </Card>
  )
}
