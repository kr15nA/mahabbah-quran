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
    <Card className={`p-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-100 rounded-xl ${className}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconBgColor} ${iconColor}`}>
          {icon}
        </div>
        <p className="text-xs font-bold text-gray-500 leading-tight">{title}</p>
      </div>
      
      <div className="min-w-0">
        <div className="flex items-center gap-2 w-full">
          {isDynamic && trendIcon}
          <h3 className={`text-lg md:text-xl font-extrabold tracking-tight truncate ${valueColor}`}>
            {value}
          </h3>
        </div>
      </div>

      {subtext && (
        <div className="mt-2 text-[11px] text-gray-500 font-medium truncate">
          {subtext}
        </div>
      )}
    </Card>
  )
}
