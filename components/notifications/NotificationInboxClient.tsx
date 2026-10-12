'use client'

import { useState } from 'react'
import { Bell, FileText, CheckCircle2, Clock, CheckCheck, Inbox, AlertCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { NotificationRow } from '@/lib/db/queries/notifications'

function formatTime(dateStr: Date | string) {
  const date = new Date(dateStr)
  const now = new Date()
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()

  if (isToday) {
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  }
  return (
    date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) +
    ' ' +
    date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  )
}

export default function NotificationInboxClient({
  initialNotifs,
  initialUnreadCount,
  title,
  subtitle,
  backHref,
}: {
  initialNotifs: NotificationRow[]
  initialUnreadCount: number
  title: string
  subtitle?: string
  backHref?: string
}) {
  const [notifs, setNotifs] = useState<NotificationRow[]>(initialNotifs)
  const [unreadCount, setUnreadCount] = useState<number>(initialUnreadCount)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [isMarkingAll, setIsMarkingAll] = useState(false)

  const handleMarkOneRead = async (id: number) => {
    const target = notifs.find((n) => n.id === id)
    if (!target || target.is_read) return

    // Optimistic UI update
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
    setUnreadCount((c) => Math.max(0, c - 1))

    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
      if (!res.ok) {
        // Revert on failure
        setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: false } : n)))
        setUnreadCount((c) => c + 1)
      }
    } catch {
      setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: false } : n)))
      setUnreadCount((c) => c + 1)
    }
  }

  const handleMarkAllRead = async () => {
    if (unreadCount === 0 || isMarkingAll) return

    setIsMarkingAll(true)
    const prevNotifs = [...notifs]
    const prevCount = unreadCount

    // Optimistic UI update
    setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadCount(0)

    try {
      const res = await fetch('/api/notifications', { method: 'PATCH' })
      if (!res.ok) {
        setNotifs(prevNotifs)
        setUnreadCount(prevCount)
      }
    } catch {
      setNotifs(prevNotifs)
      setUnreadCount(prevCount)
    } finally {
      setIsMarkingAll(false)
    }
  }

  const displayedNotifs = filter === 'unread' ? notifs.filter((n) => !n.is_read) : notifs

  const getIcon = (type: string) => {
    switch (type) {
      case 'report':
        return <FileText className="w-4 h-4 text-purple-600" />
      case 'attendance':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />
      case 'reminder':
        return <Clock className="w-4 h-4 text-amber-600" />
      default:
        return <Bell className="w-4 h-4 text-blue-600" />
    }
  }

  return (
    <div className="space-y-4 max-w-3xl mx-auto px-4 sm:px-6 py-4 pb-20">
      {/* Header Bar */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          {backHref && (
            <Link
              href={backHref}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 hover:text-purple-800 mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali</span>
            </Link>
          )}
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">{title}</h1>
            {unreadCount > 0 && (
              <span className="bg-purple-100 text-purple-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                {unreadCount} baru
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={isMarkingAll}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Tandai Semua Dibaca</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
            filter === 'all'
              ? 'bg-[#4B21A2] text-white shadow-xs'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          Semua ({notifs.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('unread')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
            filter === 'unread'
              ? 'bg-[#4B21A2] text-white shadow-xs'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          Belum Dibaca ({unreadCount})
        </button>
      </div>

      {/* Notification List */}
      {displayedNotifs.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-gray-200 shadow-sm text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400">
            <Inbox className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-gray-800 text-sm mb-1">Tidak Ada Notifikasi</h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            {filter === 'unread'
              ? 'Semua notifikasi telah dibaca.'
              : 'Belum ada pesan atau pemberitahuan baru yang masuk.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayedNotifs.map((n) => (
            <div
              key={n.id}
              onClick={() => handleMarkOneRead(n.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                n.is_read
                  ? 'bg-white border-gray-200 hover:bg-gray-50/50 shadow-xs'
                  : 'bg-purple-50/40 border-purple-200 hover:bg-purple-50/70 shadow-xs'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  n.is_read ? 'bg-gray-100' : 'bg-white shadow-xs'
                }`}
              >
                {getIcon(n.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h4
                    className={`text-xs ${
                      n.is_read ? 'font-semibold text-gray-800' : 'font-bold text-gray-950'
                    }`}
                  >
                    {n.title}
                  </h4>
                  <span
                    className={`text-[10px] whitespace-nowrap shrink-0 ${
                      n.is_read ? 'text-gray-400' : 'text-purple-700 font-semibold'
                    }`}
                  >
                    {formatTime(n.created_at)}
                  </span>
                </div>
                <p
                  className={`text-xs mt-1 leading-relaxed ${
                    n.is_read ? 'text-gray-500' : 'text-gray-700 font-medium'
                  }`}
                >
                  {n.body}
                </p>
              </div>

              {!n.is_read && (
                <div className="w-2 h-2 rounded-full bg-purple-700 mt-2 shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
