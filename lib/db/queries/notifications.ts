import { sql } from '@/lib/db/client'

export type NotificationRow = {
  id: number
  user_id: number
  title: string
  body: string
  type: 'report' | 'attendance' | 'system' | 'reminder'
  reference_type: string | null
  reference_id: number | null
  is_read: boolean
  created_at: Date
}

export async function getNotificationsByUser(userId: number, page = 1, limit = 20): Promise<NotificationRow[]> {
  const offset = (page - 1) * limit
  const rows = await sql`
    SELECT * FROM notifications
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `
  return rows as NotificationRow[]
}

export async function getNotificationById(id: number): Promise<NotificationRow | null> {
  const rows = await sql`
    SELECT * FROM notifications
    WHERE id = ${id}
    LIMIT 1
  `
  return (rows[0] as NotificationRow) ?? null
}

export async function getUnreadCount(userId: number): Promise<number> {
  const rows = await sql`
    SELECT COUNT(*)::int AS count
    FROM notifications
    WHERE user_id = ${userId} AND is_read = FALSE
  `
  return (rows[0] as { count: number }).count
}

export async function insertNotification(data: {
  user_id: number
  title: string
  body: string
  type: 'report' | 'attendance' | 'system' | 'reminder'
  reference_type?: string
  reference_id?: number
}): Promise<number> {
  const rows = await sql`
    INSERT INTO notifications (user_id, title, body, type, reference_type, reference_id)
    VALUES (${data.user_id}, ${data.title}, ${data.body}, ${data.type}, ${data.reference_type ?? null}, ${data.reference_id ?? null})
    RETURNING id
  `
  return (rows[0] as { id: number }).id
}

export async function markNotificationRead(id: number): Promise<void> {
  await sql`
    UPDATE notifications SET is_read = TRUE WHERE id = ${id}
  `
}

export async function markAllRead(userId: number): Promise<void> {
  await sql`
    UPDATE notifications SET is_read = TRUE WHERE user_id = ${userId}
  `
}

export async function searchNotifications(params: {
  userId: number
  search?: string | null
  isRead?: boolean | null
  limit: number
  offset: number
}): Promise<{ data: NotificationRow[]; total: number }> {
  const searchPattern = params.search ? `%${params.search}%` : null

  const dataRows = await sql`
    SELECT *
    FROM notifications
    WHERE user_id = ${params.userId}
      AND (${searchPattern}::text IS NULL OR title ILIKE ${searchPattern} OR body ILIKE ${searchPattern})
      AND (${params.isRead ?? null}::boolean IS NULL OR is_read = ${params.isRead})
    ORDER BY created_at DESC
    LIMIT ${params.limit} OFFSET ${params.offset}
  `

  const countRows = await sql`
    SELECT COUNT(*)::int as total
    FROM notifications
    WHERE user_id = ${params.userId}
      AND (${searchPattern}::text IS NULL OR title ILIKE ${searchPattern} OR body ILIKE ${searchPattern})
      AND (${params.isRead ?? null}::boolean IS NULL OR is_read = ${params.isRead})
  `

  return {
    data: dataRows as NotificationRow[],
    total: Number((countRows[0] as any).total)
  }
}
