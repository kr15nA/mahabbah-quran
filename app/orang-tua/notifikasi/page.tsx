import { Bell } from 'lucide-react'
import { getSession } from '@/lib/auth/session'
import { getNotificationsByUser } from '@/lib/db/queries/notifications'
import { redirect } from 'next/navigation'
import { NotificationItem } from './NotificationItem'

export default async function ParentNotifikasiPage() {
  const session = await getSession()
  if (!session || session.role !== 'orang_tua') {
    redirect('/login')
  }

  const notifs = await getNotificationsByUser(session.userId)

  return (
    <div className="space-y-3 pb-20">
      <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="font-bold text-gray-900 text-xs">Pemberitahuan Orang Tua</h3>
      </div>

      {notifs.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bell className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="font-bold text-gray-900 mb-1">Belum Ada Notifikasi</h3>
          <p className="text-sm text-gray-500">Anda belum menerima pemberitahuan baru.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifs.map((n) => (
            <NotificationItem key={n.id} notif={n} />
          ))}
        </div>
      )}
    </div>
  )
}
