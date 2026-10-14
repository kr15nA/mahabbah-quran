import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { getCronSecret } from '@/lib/config/env'
import { db } from '@/lib/db/client'
import {
  financeRecurringBillingConfigs,
  financeFeeTypes,
  financeBillingRuns,
  academicYears,
  auditLogs,
} from '@/drizzle/schema'
import { eq, and, sql } from 'drizzle-orm'
import { generateRecurringBilling } from '@/lib/finance/recurring-generator'

// Verify Bearer CRON_SECRET with constant-time comparison
function verifyCronAuth(request: NextRequest): { valid: boolean; status?: number; error?: string } {
  // Reject tokens in query string
  if (
    request.nextUrl.searchParams.has('secret') ||
    request.nextUrl.searchParams.has('token') ||
    request.nextUrl.searchParams.has('cron_secret')
  ) {
    return {
      valid: false,
      status: 400,
      error: 'Query string authentication is forbidden. Use Authorization: Bearer <CRON_SECRET>',
    }
  }

  let configuredSecret: string
  try {
    configuredSecret = getCronSecret()
  } catch {
    return {
      valid: false,
      status: 500,
      error: 'CRON_SECRET configuration missing on server',
    }
  }

  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return {
      valid: false,
      status: 401,
      error: 'Missing Authorization header',
    }
  }

  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return {
      valid: false,
      status: 401,
      error: 'Invalid Authorization header format. Expected Bearer <token>',
    }
  }

  const token = parts[1].trim()
  const secretBuf = Buffer.from(configuredSecret)
  const tokenBuf = Buffer.from(token)

  if (secretBuf.length !== tokenBuf.length || !crypto.timingSafeEqual(secretBuf, tokenBuf)) {
    return {
      valid: false,
      status: 401,
      error: 'Invalid cron secret token',
    }
  }

  return { valid: true }
}

async function handleRecurringBillingCron(request: NextRequest) {
  const auth = verifyCronAuth(request)
  if (!auth.valid) {
    return NextResponse.json(
      {
        success: false,
        error: auth.error,
      },
      { status: auth.status || 401 }
    )
  }

  const startTime = new Date()

  try {
    // 1. Determine period deterministically
    let targetPeriod = request.nextUrl.searchParams.get('period')
    if (!targetPeriod && request.method === 'POST') {
      try {
        const body = await request.json()
        if (body && typeof body.period === 'string') {
          targetPeriod = body.period
        }
      } catch {
        // Ignored if body is empty or non-JSON
      }
    }

    if (!targetPeriod) {
      // Deterministic period: current month in Asia/Jakarta timezone (UTC+7)
      targetPeriod = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
      }).format(startTime)
    }

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(targetPeriod)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid period format. Expected YYYY-MM',
        },
        { status: 400 }
      )
    }

    // 2. Select academic year deterministically
    const [activeYear] = await db
      .select()
      .from(academicYears)
      .where(eq(academicYears.isActive, true))
      .limit(1)

    let targetYear = activeYear
    if (
      !targetYear ||
      targetPeriod < targetYear.startDate.substring(0, 7) ||
      targetPeriod > targetYear.endDate.substring(0, 7)
    ) {
      // Find academic year whose range encompasses targetPeriod
      const [matchingYear] = await db
        .select()
        .from(academicYears)
        .where(
          and(
            sql`${academicYears.startDate} <= ${targetPeriod + '-28'}`,
            sql`${academicYears.endDate} >= ${targetPeriod + '-01'}`
          )
        )
        .limit(1)

      if (matchingYear) {
        targetYear = matchingYear
      }
    }

    if (!targetYear) {
      return NextResponse.json(
        {
          success: false,
          period: targetPeriod,
          processedRules: 0,
          generatedInvoices: 0,
          skippedDuplicates: 0,
          errors: ['No academic year found covering target period'],
        },
        { status: 422 }
      )
    }

    // 3. Find active recurring rules (inactive rules are strictly ignored)
    const activeConfigs = await db
      .select({
        configId: financeRecurringBillingConfigs.id,
        feeTypeId: financeRecurringBillingConfigs.feeTypeId,
        feeTypeName: financeFeeTypes.name,
        dueDayOfMonth: financeRecurringBillingConfigs.dueDayOfMonth,
      })
      .from(financeRecurringBillingConfigs)
      .innerJoin(financeFeeTypes, eq(financeFeeTypes.id, financeRecurringBillingConfigs.feeTypeId))
      .where(
        and(
          eq(financeRecurringBillingConfigs.isActive, true),
          eq(financeFeeTypes.isActive, true),
          eq(financeFeeTypes.billingFrequency, 'MONTHLY')
        )
      )

    let processedRules = 0
    let totalGeneratedInvoices = 0
    let totalSkippedDuplicates = 0
    const errors: string[] = []

    // 4. Process each active recurring rule
    for (const config of activeConfigs) {
      try {
        // Record run state before execution to calculate incremental invoices generated
        const [existingRun] = await db
          .select()
          .from(financeBillingRuns)
          .where(
            and(
              eq(financeBillingRuns.academicYearId, targetYear.id),
              eq(financeBillingRuns.feeTypeId, config.feeTypeId),
              eq(financeBillingRuns.period, targetPeriod)
            )
          )

        const prevGenerated = existingRun?.generatedCount ?? 0
        const prevSkipped = existingRun?.skippedCount ?? 0

        await generateRecurringBilling({
          academicYearId: targetYear.id,
          feeTypeId: config.feeTypeId,
          period: targetPeriod,
          actorId: null,
        })

        const [updatedRun] = await db
          .select()
          .from(financeBillingRuns)
          .where(
            and(
              eq(financeBillingRuns.academicYearId, targetYear.id),
              eq(financeBillingRuns.feeTypeId, config.feeTypeId),
              eq(financeBillingRuns.period, targetPeriod)
            )
          )

        processedRules++
        if (updatedRun) {
          const newlyGenerated = Math.max(0, (updatedRun.generatedCount ?? 0) - prevGenerated)
          const newlySkipped = Math.max(0, (updatedRun.skippedCount ?? 0) - prevSkipped)
          totalGeneratedInvoices += newlyGenerated
          totalSkippedDuplicates += newlySkipped

          if (updatedRun.failedCount && updatedRun.failedCount > 0) {
            errors.push(`Aturan ${config.feeTypeName}: terdapat ${updatedRun.failedCount} kegagalan`)
          }
        }
      } catch (err: any) {
        errors.push(`Aturan ${config.feeTypeName}: ${err.message || 'Eksekusi gagal'}`)
      }
    }

    // 5. Audit Observability (System actor semantics with null actorUserId)
    await db.insert(auditLogs).values({
      actorUserId: null,
      action: 'CRON_RECURRING_BILLING_COMPLETED',
      entityType: 'RECURRING_BILLING',
      entityId: null,
      metadata: {
        source: 'CRON',
        period: targetPeriod,
        academicYearId: targetYear.id,
        processedRules,
        generatedInvoices: totalGeneratedInvoices,
        skippedDuplicates: totalSkippedDuplicates,
        errorsCount: errors.length,
        startedAt: startTime.toISOString(),
        completedAt: new Date().toISOString(),
      },
    })

    // Safe sanitized console log
    console.info('[CRON recurring-billing]', {
      period: targetPeriod,
      processedRules,
      generatedInvoices: totalGeneratedInvoices,
      skippedDuplicates: totalSkippedDuplicates,
      errorsCount: errors.length,
      durationMs: Date.now() - startTime.getTime(),
    })

    return NextResponse.json({
      success: errors.length === 0,
      period: targetPeriod,
      processedRules,
      generatedInvoices: totalGeneratedInvoices,
      skippedDuplicates: totalSkippedDuplicates,
      errors,
    })
  } catch (error: any) {
    console.error('[CRON recurring-billing error]', error.message || error)
    return NextResponse.json(
      {
        success: false,
        error: 'Terjadi kesalahan sistem saat menjalankan recurring billing cron',
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return handleRecurringBillingCron(request)
}

export async function POST(request: NextRequest) {
  return handleRecurringBillingCron(request)
}
