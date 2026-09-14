import { financeDb as db } from './tx'
import { sql, and, eq, gte, lte } from 'drizzle-orm'
import {
  financeJournalEntries,
  financeJournalLines,
  financeFunds,
  financeCategories,
  financeCategoryFunds,
  financeCampaigns,
  ziswafReceipts
} from '@/drizzle/schema'
import { DateRange } from './dashboard'

function dateFilter(alias: string, range?: DateRange) {
  if (!range) return sql``
  if (range.from && range.to) {
    if (alias === 'r') return sql` ${sql.raw(alias)}.created_at >= ${range.from} AND ${sql.raw(alias)}.created_at <= ${range.to}`
    return sql` ${sql.raw(alias)}.transaction_date >= ${range.from} AND ${sql.raw(alias)}.transaction_date <= ${range.to}`
  }
  if (range.from) {
    if (alias === 'r') return sql` ${sql.raw(alias)}.created_at >= ${range.from}`
    return sql` ${sql.raw(alias)}.transaction_date >= ${range.from}`
  }
  if (range.to) {
    if (alias === 'r') return sql` ${sql.raw(alias)}.created_at <= ${range.to}`
    return sql` ${sql.raw(alias)}.transaction_date <= ${range.to}`
  }
  return sql``
}

export async function getZiswafFunds() {
  // ZISWAF funds: connected to a Category with domain = 'ZISWAF'
  const res = await db.execute(sql`
    SELECT DISTINCT f.id, f.code, f.name, f.fund_type, f.restriction_type
    FROM finance_funds f
    JOIN finance_category_funds cf ON f.id = cf.fund_id
    JOIN finance_categories c ON cf.category_id = c.id
    WHERE c.domain = 'ZISWAF' AND f.is_active = true
    ORDER BY f.name
  `)
  return res.rows.map((r: any) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    fundType: r.fund_type,
    restrictionType: r.restriction_type
  }))
}

export async function getZiswafSummaryMetrics(range?: DateRange) {
  const dFilter = range && (range.from || range.to) ? sql` AND ${dateFilter('ziswaf_receipts', range)}` : sql``
  
  // Gross Received (CONFIRMED receipts, not counting REFUNDED) -> Wait! 
  // User instruction: "Gross Received: confirmed receipts originally received in the selected period"
  // If a receipt is REFUNDED, it was once CONFIRMED. Is its status now REFUNDED? Yes.
  // We need both CONFIRMED and REFUNDED for Gross.
  const grossRes = await db.execute(sql`
    SELECT COALESCE(SUM(amount), 0) as gross
    FROM ziswaf_receipts
    WHERE status IN ('CONFIRMED', 'REFUNDED')
      ${dFilter}
  `)
  const grossReceived = BigInt(grossRes.rows[0].gross as string)

  // Refunds: "refund/reversal activity in the selected period"
  // For refunds, we can look at finance_journal_entries where sourceType = 'ZISWAF_RECEIPT' and status = 'REVERSED'?
  // Wait, the reversal itself has sourceType = 'REVERSAL' and sourceEvent = 'REVERSE'. 
  // It's better to get refunds from ZISWAF Receipts that are REFUNDED and whose reversal is in the date range.
  // Actually, let's use the REVERSAL journals linked to ZISWAF.
  const dFilterJournal = range && (range.from || range.to) ? sql` AND ${dateFilter('e', range)}` : sql``
  const refundsRes = await db.execute(sql`
    SELECT COALESCE(SUM(l.debit), 0) as refunds
    FROM finance_journal_lines l
    JOIN finance_journal_entries e ON l.journal_entry_id = e.id
    JOIN finance_journal_entries orig ON e.reversal_of_id = orig.id
    WHERE e.status = 'POSTED' AND e.source_type = 'REVERSAL' AND orig.source_type = 'ZISWAF_RECEIPT'
      ${dFilterJournal}
  `)
  const refunds = BigInt(refundsRes.rows[0].refunds as string)

  const netReceived = grossReceived - refunds

  // Distributed: actual PAID disbursements for ZISWAF funds.
  // We can join disbursement lines to ziswaf funds, or just use expense journals.
  // User says: "Use PAID Disbursement records or posted Expense journal activity associated with ZISWAF Funds."
  const distributedRes = await db.execute(sql`
    SELECT COALESCE(SUM(l.debit - l.credit), 0) as distributed
    FROM finance_journal_lines l
    JOIN finance_journal_entries e ON l.journal_entry_id = e.id
    JOIN finance_accounts a ON l.account_id = a.id
    WHERE e.status IN ('POSTED', 'REVERSED')
      AND e.source_type = 'DISBURSEMENT'
      AND a.account_type = 'EXPENSE'
      AND l.fund_id IN (
        SELECT f.id FROM finance_funds f
        JOIN finance_category_funds cf ON f.id = cf.fund_id
        JOIN finance_categories c ON cf.category_id = c.id
        WHERE c.domain = 'ZISWAF'
      )
      ${dFilterJournal}
  `)
  const distributed = BigInt(distributedRes.rows[0].distributed as string)

  return {
    grossReceived: grossReceived.toString(),
    refunds: refunds.toString(),
    netReceived: netReceived.toString(),
    distributed: distributed.toString()
  }
}

export async function getCampaignPerformance(range?: DateRange) {
  // Campaign receipt count, gross, refunded, net.
  // This can be complex. We'll do it with CTEs or subqueries.
  const dFilter = range && (range.from || range.to) ? sql` AND ${dateFilter('r', range)}` : sql``
  const dFilterJournal = range && (range.from || range.to) ? sql` AND ${dateFilter('e', range)}` : sql``

  const res = await db.execute(sql`
    SELECT 
      c.id, c.code, c.name,
      COUNT(DISTINCT r.id) as receipt_count,
      COALESCE(SUM(r.amount), 0) as gross_received,
      COALESCE((
        SELECT COALESCE(SUM(l.debit), 0)
        FROM finance_journal_lines l
        JOIN finance_journal_entries e ON l.journal_entry_id = e.id
        JOIN finance_journal_entries orig ON e.reversal_of_id = orig.id
        WHERE e.status = 'POSTED' AND e.source_type = 'REVERSAL' AND orig.source_type = 'ZISWAF_RECEIPT'
          AND orig.source_id IN (SELECT id FROM ziswaf_receipts WHERE campaign_id = c.id)
          ${dFilterJournal}
      ), 0) as refunded
    FROM finance_campaigns c
    LEFT JOIN ziswaf_receipts r ON r.campaign_id = c.id AND r.status IN ('CONFIRMED', 'REFUNDED') ${dFilter}
    WHERE c.is_active = true
    GROUP BY c.id, c.code, c.name
    ORDER BY gross_received DESC
  `)
  
  return res.rows.map((r: any) => {
    const gross = BigInt(r.gross_received as string)
    const refunded = BigInt(r.refunded as string)
    const net = gross - refunded
    return {
      id: r.id,
      code: r.code,
      name: r.name,
      receiptCount: parseInt(r.receipt_count as string, 10),
      grossReceived: gross.toString(),
      refunded: refunded.toString(),
      netReceived: net.toString()
    }
  })
}
