import { requireAuth } from '@/lib/auth/rbac'
import { getNotificationsByUser, getUnreadCount } from '@/lib/db/queries/notifications'
import NotificationInboxClient from '@/components/notifications/NotificationInboxClient'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Notifikasi Santri | Mahabbah Qur\'an',
}

export default async function SantriNotifikasiPage() {
  const { session } = await requireAuth()

  const [notifs, unreadCount] = await Promise.all([
    getNotificationsByUser(session.userId),
    getUnreadCount(session.userId),
  ])

  return (
    <NotificationInboxClient
      initialNotifs={notifs}
      initialUnreadCount={unreadCount}
      title="Pemberitahuan Santri"
      subtitle="Catatan guru, perkembangan hafalan, dan pengumuman madrasah"
      backHref="/santri"
    />
  )
}
