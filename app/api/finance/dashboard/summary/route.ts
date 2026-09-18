import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { hasPermission } from '@/lib/auth/rbac'
import { db } from '@/lib/db/client'
import { rolePermissions, permissions } from '@/drizzle/schema'
import { eq, inArray } from 'drizzle-orm'
import { 
  getDashboardConfigurationState, 
  getLiquidAssetBalance, 
  getPeriodIncomeExpense,
  getAcademicReceivableReconciliation,
  getInvoiceStatusSummary,
  getIncomeExpenseTrend
} from '@/lib/finance/dashboard'
import { getReceivableAgingReport } from '@/lib/finance/reports/academic'
import { getZiswafSummaryMetrics } from '@/lib/finance/ziswaf-dashboard'

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check permission
  
    const hasPerm = await hasPermission(session as any, 'finance.dashboard.view')
    if (!hasPerm) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from') || undefined
  const to = searchParams.get('to') || undefined

  if (from && to && from > to) {
    return NextResponse.json({ error: 'Invalid date range' }, { status: 400 })
  }

  const range = { from, to }

  const [
    configState,
    currentLiquidBalance,
    periodIncomeExpense,
    reconciliation,
    invoiceStatus,
    trend,
    aging,
    ziswaf
  ] = await Promise.all([
    getDashboardConfigurationState(),
    getLiquidAssetBalance(),
    getPeriodIncomeExpense(range),
    getAcademicReceivableReconciliation(),
    getInvoiceStatusSummary(range),
    getIncomeExpenseTrend(range),
    getReceivableAgingReport(), // As of today by default
    getZiswafSummaryMetrics(range)
  ])

  // Process Aging report for tunggakan (overdue)
  const tunggakanItems = aging.items.filter((i: any) => i.daysOverdue > 0)
  const tunggakanAmount = tunggakanItems.reduce((acc: bigint, i: any) => acc + BigInt(i.outstanding), BigInt(0)).toString()
  const tunggakanCount = tunggakanItems.length

  return NextResponse.json({
    configState,
    currentLiquidBalance,
    periodIncome: periodIncomeExpense.income,
    periodExpense: periodIncomeExpense.expense,
    netActivity: (BigInt(periodIncomeExpense.income) - BigInt(periodIncomeExpense.expense)).toString(),
    academicReceivables: reconciliation.ledgerReceivable,
    reconciliationDifference: reconciliation.difference,
    invoiceStatus,
    trend,
    tunggakan: {
      amount: tunggakanAmount,
      count: tunggakanCount,
      items: tunggakanItems.slice(0, 10) // top 10 for follow-up list
    },
    ziswaf
  })
}
