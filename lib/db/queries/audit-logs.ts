import { desc, eq, and, sql as drizzleSql } from 'drizzle-orm'
import { db, sql } from '../client'
import { auditLogs, users } from '../../../drizzle/schema'

export type AuditLogWithActor = {
  id: number
  actorUserId: number | null
  actorName: string | null
  action: string
  entityType: string
  entityId: number | null
  oldValues: Record<string, unknown> | null
  newValues: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  createdAt: Date
}

export type GetAuditLogsFilters = {
  actorUserId?: number
  action?: string
  entityType?: string
  entityId?: number
  limit?: number
  offset?: number
}

/**
 * Fetch audit logs with optional filtering and pagination.
 * Includes the actor's full name.
 * Ordered by newest first.
 */
export async function getAuditLogs(filters: GetAuditLogsFilters = {}): Promise<AuditLogWithActor[]> {
  const { actorUserId, action, entityType, entityId, limit = 50, offset = 0 } = filters

  const conditions = []
  if (actorUserId !== undefined) conditions.push(eq(auditLogs.actorUserId, actorUserId))
  if (action !== undefined) conditions.push(eq(auditLogs.action, action))
  if (entityType !== undefined) conditions.push(eq(auditLogs.entityType, entityType))
  if (entityId !== undefined) conditions.push(eq(auditLogs.entityId, entityId))

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const rows = await db
    .select({
      id: auditLogs.id,
      actorUserId: auditLogs.actorUserId,
      actorName: users.fullName,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      oldValues: auditLogs.oldValues,
      newValues: auditLogs.newValues,
      metadata: auditLogs.metadata,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.actorUserId, users.id))
    .where(whereClause)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit)
    .offset(offset)

  return rows as AuditLogWithActor[]
}
