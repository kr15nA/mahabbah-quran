import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getNotificationsByUser, getUnreadCount, markAllRead } from '@/lib/db/queries/notifications'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const notifications = await getNotificationsByUser(session.userId)
  const unreadCount = await getUnreadCount(session.userId)

  return NextResponse.json({ data: notifications, unreadCount })
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await markAllRead(session.userId)
  return NextResponse.json({ success: true })
}
