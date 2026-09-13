/**
 * Audit Logger — server-side only helper for writing append-only audit records.
 *
 * SECURITY RULES (enforced here, not by callers):
 * - actor_user_id MUST come from the authenticated server session; never from client input.
 * - Sensitive fields are stripped from old_values and new_values before any write.
 * - This module must never be imported by client components.
 */

import { db } from '@/lib/db/client'
import { auditLogs } from '@/drizzle/schema'
import type { AuditAction, AuditEntityType } from './types'

/**
 * Fields that must never appear in audit log payloads.
 * Matched using normalized keys (lowercase, underscores removed).
 */
const SENSITIVE_KEYS_NORMALIZED = new Set([
  'password',
  'passwordhash',
  'temporarypassword',
  'accesstoken',
  'refreshtoken',
  'fcmtoken',
  'session',
  'jwt',
  'token',
  'secret',
  'apikey',
])

/**
 * Recursively strips sensitive fields from an object or array.
 * Returns a new object/array — does not mutate input.
 */
function stripSensitive(data: unknown): unknown {
  if (Array.isArray(data)) {
    return data.map(item => stripSensitive(item))
  }
  
  if (data !== null && typeof data === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const normalizedKey = key.toLowerCase().replace(/_/g, '')
      if (SENSITIVE_KEYS_NORMALIZED.has(normalizedKey)) continue
      result[key] = stripSensitive(value)
    }
    return result
  }
  
  return data
}

export type CreateAuditLogInput = {
  /** Actor user ID — MUST be sourced from the authenticated server session. */
  actorUserId: number | null
  action: AuditAction
  entityType: AuditEntityType
  entityId?: number | null
  /** Previous state — sensitive fields will be automatically stripped. */
  oldValues?: Record<string, unknown> | null
  /** New state — sensitive fields will be automatically stripped. */
  newValues?: Record<string, unknown> | null
  /** Extra context (e.g. academic_year_id). Sensitive fields stripped. */
  metadata?: Record<string, unknown> | null
}

export type AuditLogRow = {
  id: number
  actorUserId: number | null
  action: string
  entityType: string
  entityId: number | null
  oldValues: Record<string, unknown> | null
  newValues: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  createdAt: Date
}

/**
 * Write one append-only audit record.
 *
 * Sensitive fields are stripped from all JSONB payloads automatically.
 * This function returns the created row so callers can confirm the write.
 *
 * Transaction behavior:
 *   The audit insert is a separate DB round-trip. For the Neon HTTP driver
 *   (which does not support interactive transactions), this means the business
 *   mutation and audit write are NOT atomic. The convention is: always call
 *   createAuditLog AFTER a successful business mutation, never before.
 *   A failed business mutation must not call createAuditLog at all.
 *   See AUDIT-LOG-001.md §Transaction Behavior for details.
 */
export async function createAuditLog(input: CreateAuditLogInput): Promise<AuditLogRow> {
  const [row] = await db.insert(auditLogs).values({
    actorUserId:  input.actorUserId ?? null,
    action:       input.action,
    entityType:   input.entityType,
    entityId:     input.entityId ?? null,
    oldValues:    input.oldValues ? (stripSensitive(input.oldValues) as Record<string, unknown>) : null,
    newValues:    input.newValues ? (stripSensitive(input.newValues) as Record<string, unknown>) : null,
    metadata:     input.metadata  ? (stripSensitive(input.metadata) as Record<string, unknown>)  : null,
  }).returning()

  return row as AuditLogRow
}

/** Exported for testing — do not use outside tests. */
export { stripSensitive as _stripSensitiveForTesting }
