'use client'

import { useState } from 'react'
import { Bell, FileText, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import type { NotificationRow } from '@/lib/db/queries/notifications'

function formatTime(dateStr: Date | string) {
  const date = new Date(dateStr)
  const now = new Date()
  const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  
  if (isToday) {
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) + ' ' + date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

export function NotificationItem({ notif }: { notif: NotificationRow }) {
  const [isRead, setIsRead] = useState(notif.is_read)

  const handleRead = async () => {
    if (isRead) return
    // Optimistic UI update
    setIsRead(true)
    try {
      const res = await fetch(`/api/notifications/${notif.id}/read`, { method: 'PATCH' })
      if (!res.ok) {
        setIsRead(false) // revert if failed
      }
    } catch (e) {
      setIsRead(false)
    }
  }

  let Icon = Bell
  if (notif.type === 'report') Icon = FileText
  else if (notif.type === 'attendance') Icon = CheckCircle2
  else if (notif.type === 'reminder') Icon = Clock

  return (
    <div 
      onClick={handleRead}
      className={`p-3.5 rounded-2xl border shadow-sm flex items-start gap-3 cursor-pointer transition-all ${
        isRead ? 'bg-white border-gray-200' : 'bg-[#F9F7FE] border-[#4B21A2]'
      }`}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
        isRead ? 'bg-gray-100 text-gray-500' : 'bg-[#EAE4F7] text-[#4B21A2]'
      }`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <h4 className={`text-xs ${isRead ? 'font-semibold text-gray-700' : 'font-bold text-gray-900'}`}>{notif.title}</h4>
          <span className={`text-[10px] whitespace-nowrap ml-2 ${isRead ? 'text-gray-400' : 'text-[#4B21A2] font-semibold'}`}>
            {formatTime(notif.created_at)}
          </span>
        </div>
        <p className={`text-[11px] mt-0.5 leading-snug ${isRead ? 'text-gray-500' : 'text-gray-700 font-medium'}`}>{notif.body}</p>
      </div>
      {!isRead && (
        <div className="w-2 h-2 rounded-full bg-[#4B21A2] mt-2 flex-shrink-0" />
      )}
    </div>
  )
}
