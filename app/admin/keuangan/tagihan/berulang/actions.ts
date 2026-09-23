'use server'

import { requirePermission } from '@/lib/auth/rbac'
import { createOrUpdateRecurringConfig, assignStudentFee, voidStudentFeeAssignment } from '@/lib/finance/recurring'
import { dryRunRecurringBilling, prepareRecurringBillingRun, processRecurringBillingRunChunk } from '@/lib/finance/recurring-generator'
import { mapRecurringError } from '@/lib/finance/recurring-generator-ui-errors'
import { db } from '@/lib/db/client'
import { auditLogs } from '@/drizzle/schema'
import { serializeForAudit } from '@/lib/finance/audit'
import { searchStudents } from '@/lib/db/queries/students'
import { z } from 'zod'

const updateConfigSchema = z.object({
  feeTypeId: z.number(),
  isActive: z.boolean(),
  dueDayOfMonth: z.number().min(1).max(28)
})

async function auditLog(userId: number, action: string, details: any) {
  await db.insert(auditLogs).values({
    entityId: userId,
    entityType: 'RECURRING_BILLING',
    action,
    metadata: serializeForAudit(details),
    actorUserId: userId
  })
}

export async function updateConfigAction(input: z.infer<typeof updateConfigSchema>) {
  try {
    const auth = await requirePermission('finance.billing.manage')
    const valid = updateConfigSchema.parse(input)
    
    await createOrUpdateRecurringConfig({
      feeTypeId: valid.feeTypeId,
      dueDayOfMonth: valid.dueDayOfMonth
    }, valid.isActive)

    await auditLog(auth.session.userId, 'RECURRING_CONFIG_UPDATED', {
      feeTypeId: valid.feeTypeId,
      isActive: valid.isActive,
      dueDayOfMonth: valid.dueDayOfMonth
    })

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Terjadi kesalahan internal' }
  }
}

const assignFeeSchema = z.object({
  studentId: z.number(),
  academicYearId: z.number(),
  feeTypeId: z.number(),
  startPeriod: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Format periode tidak valid'),
  endPeriod: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Format periode tidak valid').optional().nullable()
})

export async function assignFeeAction(input: z.infer<typeof assignFeeSchema>) {
  try {
    const auth = await requirePermission('finance.billing.manage')
    const valid = assignFeeSchema.parse(input)
    
    const assignment = await assignStudentFee({
      ...valid,
      createdBy: auth.session.userId
    })

    await auditLog(auth.session.userId, 'STUDENT_FEE_ASSIGNMENT_CREATED', {
      assignmentId: assignment.id,
      studentId: valid.studentId,
      feeTypeId: valid.feeTypeId
    })

    return { success: true, assignment }
  } catch (error: any) {
    let msg = error.message
    if (msg.includes('Overlapping VALID fee assignment exists')) {
      msg = 'Assignment bentrok dengan assignment yang sudah ada.'
    } else if (msg.includes('Student not found')) {
      msg = 'Santri tidak ditemukan.'
    }
    return { success: false, error: msg }
  }
}

export async function voidAssignmentAction(assignmentId: number) {
  try {
    const auth = await requirePermission('finance.billing.manage')
    await voidStudentFeeAssignment(assignmentId)
    await auditLog(auth.session.userId, 'STUDENT_FEE_ASSIGNMENT_VOIDED', { assignmentId })
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Gagal membatalkan assignment' }
  }
}

export async function bulkAssignAction(inputs: z.infer<typeof assignFeeSchema>[]) {
  try {
    const auth = await requirePermission('finance.billing.manage')
    if (!Array.isArray(inputs)) throw new Error('Format salah')
    if (inputs.length > 50) throw new Error('Maksimal 50 santri dalam satu proses massal')

    const results = []
    
    for (const raw of inputs) {
      try {
        const valid = assignFeeSchema.parse(raw)
        const assignment = await assignStudentFee({
          ...valid,
          createdBy: auth.session.userId
        })
        results.push({ studentId: valid.studentId, status: 'CREATED', assignmentId: assignment.id })
      } catch (err: any) {
        let msg = err.message
        let code = 'FAILED'
        if (msg.includes('Overlapping')) {
          code = 'OVERLAP_CONFLICT'
        } else if (msg.includes('not enrolled')) {
          code = 'INVALID'
        }
        results.push({ studentId: raw.studentId, status: code, error: msg })
      }
    }

    await auditLog(auth.session.userId, 'BULK_STUDENT_FEE_ASSIGNMENT_COMPLETED', {
      processed: inputs.length,
      successCount: results.filter(r => r.status === 'CREATED').length
    })

    return { success: true, results }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

const runSelectorSchema = z.object({
  academicYearId: z.number(),
  feeTypeId: z.number(),
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Format periode tidak valid')
})

export async function dryRunAction(input: z.infer<typeof runSelectorSchema>) {
  try {
    await requirePermission('finance.billing.manage')
    const valid = runSelectorSchema.parse(input)
    const result = await dryRunRecurringBilling(valid)
    return { success: true, data: result }
  } catch (error: any) {
    return { success: false, error: mapRecurringError(error.message) }
  }
}

export async function prepareRunAction(input: z.infer<typeof runSelectorSchema>) {
  try {
    const auth = await requirePermission('finance.billing.manage')
    const valid = runSelectorSchema.parse(input)
    const run = await prepareRecurringBillingRun({ ...valid, actorId: auth.session.userId })
    await auditLog(auth.session.userId, 'BILLING_RUN_PREPARED', { runId: run.id })
    return { success: true, runId: run.id }
  } catch (error: any) {
    return { success: false, error: mapRecurringError(error.message) }
  }
}

export async function processChunkAction(runId: number) {
  try {
    const auth = await requirePermission('finance.billing.manage')
    // Bounded chunk to 50
    const res = await processRecurringBillingRunChunk(runId, auth.session.userId, 50)
    return { success: true, processed: res.processed }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function searchStudentsForAssignAction(filters: { class_id?: number; program_id?: number; search?: string }) {
  try {
    await requirePermission('finance.billing.manage')
    // Get active students only for assignment
    const { data } = await searchStudents(filters.search, { ...filters, status: 'active' }, { limit: 100, offset: 0 })
    return { success: true, data }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

