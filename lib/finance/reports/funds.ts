import { financeDb as db } from '../tx'
import { sql } from 'drizzle-orm'
import { DateRange, dateFilter } from './utils'
import { getDashboardConfigurationState } from '../dashboard'

export async function getFundMutationReport(range?: DateRange): Promise<any> {
  const configState = await getDashboardConfigurationState()

  const openFilter = range && range.from ? sql` AND e.transaction_date < ${range.from}` : sql` AND 1=0` 
  const periodFilter = range && (range.from || range.to) ? sql` AND ${dateFilter('e', range)}` : sql``

  const res = await db.execute(sql`
    WITH opening AS (
      SELECT l.fund_id, COALESCE(SUM(l.debit - l.credit), 0) as balance
      FROM finance_journal_lines l
      JOIN finance_journal_entries e ON l.journal_entry_id = e.id
      JOIN finance_accounts a ON l.account_id = a.id
      WHERE e.status IN ('POSTED', 'REVERSED')
        AND a.account_type = 'ASSET' AND a.asset_subtype IN ('CASH', 'BANK')
        ${openFilter}
      GROUP BY l.fund_id
    ),
    period_inflow AS (
      SELECT l.fund_id, COALESCE(SUM(l.debit), 0) as inflow
      FROM finance_journal_lines l
      JOIN finance_journal_entries e ON l.journal_entry_id = e.id
      JOIN finance_accounts a ON l.account_id = a.id
      WHERE e.status IN ('POSTED', 'REVERSED')
        AND a.account_type = 'ASSET' AND a.asset_subtype IN ('CASH', 'BANK')
        ${periodFilter}
      GROUP BY l.fund_id
    ),
    period_outflow AS (
      SELECT l.fund_id, COALESCE(SUM(l.credit), 0) as outflow
      FROM finance_journal_lines l
      JOIN finance_journal_entries e ON l.journal_entry_id = e.id
      JOIN finance_accounts a ON l.account_id = a.id
      WHERE e.status IN ('POSTED', 'REVERSED')
        AND a.account_type = 'ASSET' AND a.asset_subtype IN ('CASH', 'BANK')
        ${periodFilter}
      GROUP BY l.fund_id
    ),
    period_income AS (
      SELECT l.fund_id, COALESCE(SUM(l.credit - l.debit), 0) as income
      FROM finance_journal_lines l
      JOIN finance_journal_entries e ON l.journal_entry_id = e.id
      JOIN finance_accounts a ON l.account_id = a.id
      WHERE e.status IN ('POSTED', 'REVERSED')
        AND a.account_type = 'INCOME'
        ${periodFilter}
      GROUP BY l.fund_id
    ),
    period_expense AS (
      SELECT l.fund_id, COALESCE(SUM(l.debit - l.credit), 0) as expense
      FROM finance_journal_lines l
      JOIN finance_journal_entries e ON l.journal_entry_id = e.id
      JOIN finance_accounts a ON l.account_id = a.id
      WHERE e.status IN ('POSTED', 'REVERSED')
        AND a.account_type = 'EXPENSE'
        ${periodFilter}
      GROUP BY l.fund_id
    )
    SELECT 
      f.id,
      f.name,
      f.restriction_type as restriction,
      COALESCE(o.balance, 0) as opening_balance,
      COALESCE(i.inflow, 0) as liquid_inflow,
      COALESCE(out.outflow, 0) as liquid_outflow,
      COALESCE(inc.income, 0) as period_income,
      COALESCE(exp.expense, 0) as period_expense
    FROM finance_funds f
    LEFT JOIN opening o ON f.id = o.fund_id
    LEFT JOIN period_inflow i ON f.id = i.fund_id
    LEFT JOIN period_outflow out ON f.id = out.fund_id
    LEFT JOIN period_income inc ON f.id = inc.fund_id
    LEFT JOIN period_expense exp ON f.id = exp.fund_id
    WHERE f.is_active = true
    ORDER BY f.name
  `)

  const items = res.rows.map((r: any) => {
    const opening = BigInt(r.opening_balance as string)
    const inflow = BigInt(r.liquid_inflow as string)
    const outflow = BigInt(r.liquid_outflow as string)
    const closing = opening + inflow - outflow

    return {
      id: r.id,
      fundName: r.name,
      restriction: r.restriction,
      openingBalance: opening.toString(),
      liquidInflow: inflow.toString(),
      liquidOutflow: outflow.toString(),
      closingBalance: closing.toString(),
      periodIncome: (r.period_income as string).toString(),
      periodExpense: (r.period_expense as string).toString()
    }
  })

  return {
    configurationComplete: configState.configurationComplete,
    unclassifiedAssetAccounts: configState.unclassifiedAssetAccounts,
    items
  }
}
