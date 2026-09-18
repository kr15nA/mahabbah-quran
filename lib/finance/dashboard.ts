import { financeDb as db } from './tx'
import { sql, and, eq, inArray, gte, lte } from 'drizzle-orm'
import {
  financeAccounts,
  financeJournalEntries,
  financeJournalLines,
  financeFunds,
  financeInvoices,
  financePaymentAllocations,
  financePayments,
  financeFeeTypes
} from '@/drizzle/schema'
import { toBigIntSafely } from './utils'

export interface DateRange {
  from?: string
  to?: string
}

function dateFilter(alias: string, range?: DateRange, col: string = 'transaction_date') {
  if (!range) return sql``
  if (range.from && range.to) {
    return sql` ${sql.raw(alias)}.${sql.raw(col)} >= ${range.from} AND ${sql.raw(alias)}.${sql.raw(col)} <= ${range.to}`
  }
  if (range.from) return sql` ${sql.raw(alias)}.${sql.raw(col)} >= ${range.from}`
  if (range.to) return sql` ${sql.raw(alias)}.${sql.raw(col)} <= ${range.to}`
  return sql``
}

export async function getDashboardConfigurationState() {
  // Count ASSET accounts without asset_subtype
  const res = await db.execute(sql`
    SELECT count(*) as count 
    FROM finance_accounts 
    WHERE account_type = 'ASSET' AND asset_subtype IS NULL
  `)
  const unclassifiedCount = parseInt(res.rows[0].count as string, 10)
  return {
    configurationComplete: unclassifiedCount === 0,
    unclassifiedAssetAccounts: unclassifiedCount
  }
}

export async function getLiquidAssetBalance(range?: DateRange) {
  const dFilter = range && (range.from || range.to) ? sql` AND ${dateFilter('e', range)}` : sql``
  const res = await db.execute(sql`
    SELECT COALESCE(SUM(l.debit - l.credit), 0) as balance
    FROM finance_journal_lines l
    JOIN finance_journal_entries e ON l.journal_entry_id = e.id
    JOIN finance_accounts a ON l.account_id = a.id
    WHERE e.status IN ('POSTED', 'REVERSED')
      AND a.account_type = 'ASSET'
      AND a.asset_subtype IN ('CASH', 'BANK')
      ${dFilter}
  `)
  return res.rows[0].balance as string
}

export async function getPeriodIncomeExpense(range?: DateRange) {
  const dFilter = range && (range.from || range.to) ? sql` AND ${dateFilter('e', range)}` : sql``
  const resIncome = await db.execute(sql`
    SELECT COALESCE(SUM(l.credit - l.debit), 0) as total
    FROM finance_journal_lines l
    JOIN finance_journal_entries e ON l.journal_entry_id = e.id
    JOIN finance_accounts a ON l.account_id = a.id
    WHERE e.status IN ('POSTED', 'REVERSED')
      AND a.account_type = 'INCOME'
      ${dFilter}
  `)
  
  const resExpense = await db.execute(sql`
    SELECT COALESCE(SUM(l.debit - l.credit), 0) as total
    FROM finance_journal_lines l
    JOIN finance_journal_entries e ON l.journal_entry_id = e.id
    JOIN finance_accounts a ON l.account_id = a.id
    WHERE e.status IN ('POSTED', 'REVERSED')
      AND a.account_type = 'EXPENSE'
      ${dFilter}
  `)
  
  return {
    income: resIncome.rows[0].total as string,
    expense: resExpense.rows[0].total as string
  }
}

export async function getFundLiquidBalances() {
  const res = await db.execute(sql`
    SELECT f.id, f.name, f.fund_type, f.restriction_type, COALESCE(SUM(l.debit - l.credit), 0) as balance
    FROM finance_funds f
    LEFT JOIN finance_journal_lines l ON f.id = l.fund_id
    LEFT JOIN finance_journal_entries e ON l.journal_entry_id = e.id AND e.status IN ('POSTED', 'REVERSED')
    LEFT JOIN finance_accounts a ON l.account_id = a.id AND a.account_type = 'ASSET' AND a.asset_subtype IN ('CASH', 'BANK')
    WHERE f.is_active = true
    GROUP BY f.id, f.name, f.fund_type, f.restriction_type
    ORDER BY f.name
  `)
  return res.rows.map((r: any) => ({
    id: r.id,
    name: r.name,
    fundType: r.fund_type,
    restrictionType: r.restriction_type,
    balance: r.balance as string
  }))
}

export async function getAcademicReceivableReconciliation() {
  // Business Outstanding
  const invoiceRes = await db.execute(sql`
    SELECT 
      COALESCE(SUM(i.amount), 0) as total_invoiced
    FROM finance_invoices i
    WHERE i.status IN ('ISSUED', 'PARTIALLY_PAID')
  `)
  const totalInvoiced = BigInt(invoiceRes.rows[0].total_invoiced as string)

  const allocationsRes = await db.execute(sql`
    SELECT 
      COALESCE(SUM(a.allocated_amount), 0) as total_paid
    FROM finance_payment_allocations a
    JOIN finance_payments p ON a.payment_id = p.id
    JOIN finance_invoices i ON a.invoice_id = i.id
    WHERE p.status = 'CONFIRMED' AND i.status IN ('ISSUED', 'PARTIALLY_PAID')
  `)
  const totalPaid = BigInt(allocationsRes.rows[0].total_paid as string)
  const businessOutstanding = totalInvoiced - totalPaid

  // Ledger Receivable
  const ledgerRes = await db.execute(sql`
    SELECT COALESCE(SUM(l.debit - l.credit), 0) as balance
    FROM finance_journal_lines l
    JOIN finance_journal_entries e ON l.journal_entry_id = e.id
    JOIN finance_accounts a ON l.account_id = a.id
    WHERE e.status IN ('POSTED', 'REVERSED')
      AND a.account_type = 'ASSET'
      AND a.asset_subtype = 'RECEIVABLE'
      AND a.id IN (SELECT receivable_account_id FROM finance_fee_types)
  `)
  const ledgerReceivable = BigInt(ledgerRes.rows[0].balance as string)
  const difference = businessOutstanding - ledgerReceivable

  return {
    businessOutstanding: businessOutstanding.toString(),
    ledgerReceivable: ledgerReceivable.toString(),
    difference: difference.toString(),
    isReconciled: difference === BigInt(0)
  }
}

export async function getRecentActivity(limit = 10) {
  const res = await db.execute(sql`
    SELECT e.id, e.journal_number, e.transaction_date, e.source_type, e.source_id, e.source_event, e.status, e.description,
           (SELECT COALESCE(SUM(debit), 0) FROM finance_journal_lines WHERE journal_entry_id = e.id) as amount
    FROM finance_journal_entries e
    ORDER BY e.transaction_date DESC, e.id DESC
    LIMIT ${limit}
  `)
  return res.rows.map((r: any) => ({
    id: r.id,
    date: r.transaction_date,
    documentNumber: r.journal_number,
    type: r.source_type,
    event: r.source_event,
    description: r.description,
    status: r.status,
    amount: r.amount as string
  }))
}

export async function getInvoiceStatusSummary(range?: DateRange) {
  const dFilter = range && (range.from || range.to) ? sql` AND ${dateFilter('i', range, 'created_at')}` : sql``
  const res = await db.execute(sql`
    SELECT 
      i.status, 
      count(i.id) as count, 
      COALESCE(SUM(
        i.amount - COALESCE(
          (SELECT SUM(a.allocated_amount) 
           FROM finance_payment_allocations a 
           JOIN finance_payments p ON a.payment_id = p.id 
           WHERE a.invoice_id = i.id AND p.status = 'CONFIRMED'), 0
        )
      ), 0) as total_amount
    FROM finance_invoices i
    WHERE i.status IN ('ISSUED', 'PARTIALLY_PAID', 'PAID')
      ${dFilter}
    GROUP BY i.status
  `)
  const summary = {
    PAID: { count: 0, amount: '0' },
    PARTIALLY_PAID: { count: 0, amount: '0' },
    ISSUED: { count: 0, amount: '0' }
  }
  for (const row of res.rows) {
    const st = row.status as keyof typeof summary
    if (summary[st]) {
      summary[st] = { count: parseInt(row.count as string, 10), amount: row.total_amount as string }
    }
  }
  return summary
}

export async function getIncomeExpenseTrend(range?: DateRange) {
  const dFilter = range && (range.from || range.to) ? sql` AND ${dateFilter('e', range)}` : sql``
  const res = await db.execute(sql`
    SELECT 
      TO_CHAR(e.transaction_date, 'YYYY-MM-DD') as date,
      COALESCE(SUM(CASE WHEN a.account_type = 'INCOME' THEN l.credit - l.debit ELSE 0 END), 0) as income,
      COALESCE(SUM(CASE WHEN a.account_type = 'EXPENSE' THEN l.debit - l.credit ELSE 0 END), 0) as expense
    FROM finance_journal_lines l
    JOIN finance_journal_entries e ON l.journal_entry_id = e.id
    JOIN finance_accounts a ON l.account_id = a.id
    WHERE e.status IN ('POSTED', 'REVERSED')
      AND a.account_type IN ('INCOME', 'EXPENSE')
      ${dFilter}
    GROUP BY TO_CHAR(e.transaction_date, 'YYYY-MM-DD')
    ORDER BY date ASC
  `)
  
  return res.rows.map((r: any) => ({
    date: r.date,
    income: r.income as string,
    expense: r.expense as string
  }))
}
