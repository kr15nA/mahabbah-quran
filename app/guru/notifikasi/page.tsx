import { requireAuth } from '@/lib/auth/rbac'
import { getNotificationsByUser, getUnreadCount } from '@/lib/db/queries/notifications'
import NotificationInboxClient from '@/components/notifications/NotificationInboxClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Notifikasi Guru | Mahabbah Qur\'an',
}

export default async function GuruNotifikasiPage() {
  const { session, role } = await requireAuth()

  const [notifs, unreadCount] = await Promise.all([
    getNotificationsByUser(session.userId),
    getUnreadCount(session.userId),
  ])

  return (
    <NotificationInboxClient
      initialNotifs={notifs}
      initialUnreadCount={unreadCount}
      title="Pemberitahuan Guru"
      subtitle="Pengumuman madrasah, jadwal akademik, dan notifikasi sistem"
      backHref="/guru/dashboard"
    />
  )
}
