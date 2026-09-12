import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { markNotificationRead, getNotificationById } from '@/lib/db/queries/notifications'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const resolvedParams = await params
  const id = Number(resolvedParams.id)

  const notification = await getNotificationById(id)
  if (!notification) {
    return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
  }

  if (notification.user_id !== session.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await markNotificationRead(id)
  return NextResponse.json({ success: true })
}
