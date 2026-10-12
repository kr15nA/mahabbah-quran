import { eq } from 'drizzle-orm'
import { db } from '../client'
import { institutionSettings } from '../../../drizzle/schema'
import { createAuditLog } from '@/lib/audit/logger'
import { AuditAction, AuditEntityType } from '@/lib/audit/types'

export type InstitutionSettingsRow = {
  id: number
  institutionName: string
  shortName: string | null
  address: string | null
  phone: string | null
  email: string | null
  minAttendancePct: number
  dailyReportSchedule: string
  updatedAt: Date
  updatedBy: number | null
}

export type UpdateInstitutionSettingsInput = {
  institutionName: string
  shortName?: string
  address?: string
  phone?: string
  email?: string
  minAttendancePct: number
  dailyReportSchedule: string
}

/**
 * Fetch singleton institution settings.
 * Seeds row with ID 1 if not yet created.
 */
export async function getInstitutionSettings(): Promise<InstitutionSettingsRow> {
  const existing = await db
    .select()
    .from(institutionSettings)
    .where(eq(institutionSettings.id, 1))
    .limit(1)

  if (existing.length > 0) {
    return existing[0] as InstitutionSettingsRow
  }

  // Insert initial default settings row if table is empty
  const inserted = await db
    .insert(institutionSettings)
    .values({
      id: 1,
      institutionName: "Yayasan Rumah Tahfizh Mahabbah Qur'an Indonesia",
      shortName: "Mahabbah Qur'an",
      address: "Jl. Mahabbah No. 1, Jakarta",
      phone: "081234567890",
      email: "info@mahabbahquran.id",
      minAttendancePct: 70,
      dailyReportSchedule: "16:30",
    })
    .onConflictDoNothing()
    .returning()

  if (inserted.length > 0) {
    return inserted[0] as InstitutionSettingsRow
  }

  const [fallback] = await db
    .select()
    .from(institutionSettings)
    .where(eq(institutionSettings.id, 1))
    .limit(1)

  return fallback as InstitutionSettingsRow
}

/**
 * Update institution settings and record audit log.
 */
export async function updateInstitutionSettings(
  input: UpdateInstitutionSettingsInput,
  actorUserId: number
): Promise<InstitutionSettingsRow> {
  const current = await getInstitutionSettings()

  const [updated] = await db
    .update(institutionSettings)
    .set({
      institutionName: input.institutionName.trim(),
      shortName: input.shortName?.trim() || null,
      address: input.address?.trim() || null,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      minAttendancePct: input.minAttendancePct,
      dailyReportSchedule: input.dailyReportSchedule.trim(),
      updatedAt: new Date(),
      updatedBy: actorUserId,
    })
    .where(eq(institutionSettings.id, 1))
    .returning()

  // Authoritative Audit Log
  try {
    await createAuditLog({
      actorUserId,
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.SYSTEM_SETTINGS,
      entityId: 1,
      oldValues: {
        institutionName: current.institutionName,
        shortName: current.shortName,
        address: current.address,
        phone: current.phone,
        email: current.email,
        minAttendancePct: current.minAttendancePct,
        dailyReportSchedule: current.dailyReportSchedule,
      },
      newValues: {
        institutionName: updated.institutionName,
        shortName: updated.shortName,
        address: updated.address,
        phone: updated.phone,
        email: updated.email,
        minAttendancePct: updated.minAttendancePct,
        dailyReportSchedule: updated.dailyReportSchedule,
      },
    })
  } catch (auditErr) {
    console.error('Audit log failed for institution settings update:', auditErr)
  }

  return updated as InstitutionSettingsRow
}
