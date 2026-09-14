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
  getAcademicReceivableReconciliation
} from '@/lib/finance/dashboard'

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

  const configState = await getDashboardConfigurationState()
  const liquidBalance = await getLiquidAssetBalance(range) // Liquid balance can take range if requested, but normally it's current. Wait, liquid balance is CURRENT.
  
  // The user said: "Changing dashboard date range must NOT alter current balance cards"
  // So we pass range to getPeriodIncomeExpense but not getLiquidAssetBalance.
  const currentLiquidBalance = await getLiquidAssetBalance()
  const { income, expense } = await getPeriodIncomeExpense(range)
  
  // Receivables
  const reconciliation = await getAcademicReceivableReconciliation()

  return NextResponse.json({
    configState,
    currentLiquidBalance,
    periodIncome: income,
    periodExpense: expense,
    netActivity: (BigInt(income) - BigInt(expense)).toString(),
    academicReceivables: reconciliation.ledgerReceivable
  })
}
