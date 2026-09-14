import { financeDb as db } from '../tx'
import { sql } from 'drizzle-orm'
import { DateRange, PaginationParams, buildPagination, dateFilter, PaginatedResult } from './utils'

export async function getZiswafReceiptReport(range?: DateRange, params?: PaginationParams, filters?: any): Promise<PaginatedResult<any> & { grossReceived: string, refunds: string, netReceived: string }> {
  const { page, pageSize, limitClause } = buildPagination(params)
  
  let filterSql = range && (range.from || range.to) ? sql` AND ${dateFilter('r', range, 'received_date')}` : sql``
  if (filters?.ziswafType) filterSql = sql`${filterSql} AND r.ziswaf_type = ${filters.ziswafType}`
  if (filters?.campaignId) filterSql = sql`${filterSql} AND r.campaign_id = ${filters.campaignId}`

  const summaryRes = await db.execute(sql`
    SELECT 
      COALESCE(SUM(CASE WHEN r.status = 'CONFIRMED' THEN r.amount ELSE 0 END), 0) as gross,
      COALESCE(SUM(CASE WHEN r.status = 'REFUNDED' THEN r.amount ELSE 0 END), 0) as refunds
    FROM ziswaf_receipts r
    WHERE r.status IN ('CONFIRMED', 'REFUNDED') ${filterSql}
  `)
  const grossReceived = BigInt(summaryRes.rows[0].gross as string)
  const refunds = BigInt(summaryRes.rows[0].refunds as string)
  const netReceived = grossReceived - refunds

  const countRes = await db.execute(sql`
    SELECT count(r.id) as count
    FROM ziswaf_receipts r
    WHERE r.status IN ('CONFIRMED', 'REFUNDED') ${filterSql}
  `)
  const totalRows = parseInt(countRes.rows[0].count as string, 10)
  const totalPages = Math.ceil(totalRows / pageSize)

  const res = await db.execute(sql`
    SELECT 
      r.id,
      r.receipt_number,
      r.received_date,
      p.display_name as donor_name,
      r.is_anonymous,
      r.ziswaf_type,
      cat.name as category_name,
      camp.name as campaign_name,
      r.amount,
      r.status,
      (SELECT STRING_AGG(f.name, ', ') 
       FROM ziswaf_receipt_allocations a 
       JOIN finance_funds f ON a.fund_id = f.id 
       WHERE a.receipt_id = r.id) as funds
    FROM ziswaf_receipts r
    LEFT JOIN finance_parties p ON r.donor_party_id = p.id
    LEFT JOIN finance_categories cat ON r.category_id = cat.id
    LEFT JOIN finance_campaigns camp ON r.campaign_id = camp.id
    WHERE r.status IN ('CONFIRMED', 'REFUNDED') ${filterSql}
    ORDER BY r.received_date DESC, r.id DESC
    ${limitClause}
  `)

  return {
    grossReceived: grossReceived.toString(),
    refunds: refunds.toString(),
    netReceived: netReceived.toString(),
    items: res.rows.map((r: any) => ({
      id: r.id,
      receiptNumber: r.receipt_number,
      date: r.received_date,
      donor: r.is_anonymous ? 'Hamba Allah' : (r.donor_name || 'Hamba Allah'),
      ziswafType: r.ziswaf_type,
      category: r.category_name,
      campaign: r.campaign_name,
      funds: r.funds,
      amount: r.amount as string,
      status: r.status
    })),
    page, pageSize, totalRows, totalPages
  }
}

export async function getZiswafFundReport(range?: DateRange): Promise<any[]> {
  const dFilter = range && (range.from || range.to) ? sql` AND ${dateFilter('e', range)}` : sql``
  const openFilter = range && range.from ? sql` AND e.transaction_date < ${range.from}` : sql` AND 1=0`

  // We find ZISWAF relevant funds (restricted to ZISWAF categories usually, or we just group by ZISWAF types based on receipt allocations)
  // Or we just get all funds and show ZISWAF types. Wait, ZISWAF Fund report should breakdown by Zakat, Infaq, Sedekah, Wakaf.
  // The most authoritative way is to look at the ledger, but ledger doesn't have ziswaf_type natively.
  // We can join finance_journal_entries.source_type = 'ZISWAF_RECEIPT' and ziswaf_receipts to find ziswaf_type.
  
  const res = await db.execute(sql`
    WITH ziswaf_lines AS (
      SELECT 
        l.fund_id,
        r.ziswaf_type,
        l.debit,
        l.credit,
        e.transaction_date,
        e.status
      FROM finance_journal_lines l
      JOIN finance_journal_entries e ON l.journal_entry_id = e.id
      JOIN finance_accounts a ON l.account_id = a.id
      JOIN ziswaf_receipts r ON e.source_id = CAST(r.id AS VARCHAR) AND e.source_type = 'ZISWAF_RECEIPT'
      WHERE e.status IN ('POSTED', 'REVERSED')
        AND a.account_type = 'ASSET' AND a.asset_subtype IN ('CASH', 'BANK')
    ),
    opening AS (
      SELECT fund_id, ziswaf_type, COALESCE(SUM(debit - credit), 0) as balance
      FROM ziswaf_lines
      WHERE 1=1 ${openFilter ? sql` AND transaction_date < ${range?.from}` : sql` AND 1=0`}
      GROUP BY fund_id, ziswaf_type
    ),
    period_inflow AS (
      SELECT fund_id, ziswaf_type, COALESCE(SUM(debit), 0) as inflow
      FROM ziswaf_lines
      WHERE 1=1 ${range && range.from ? sql` AND transaction_date >= ${range.from}` : sql``}
                ${range && range.to ? sql` AND transaction_date <= ${range.to}` : sql``}
      GROUP BY fund_id, ziswaf_type
    ),
    period_outflow AS (
      SELECT fund_id, ziswaf_type, COALESCE(SUM(credit), 0) as outflow
      FROM ziswaf_lines
      WHERE 1=1 ${range && range.from ? sql` AND transaction_date >= ${range.from}` : sql``}
                ${range && range.to ? sql` AND transaction_date <= ${range.to}` : sql``}
      GROUP BY fund_id, ziswaf_type
    )
    SELECT 
      f.id,
      f.name as fund_name,
      f.restriction_type as restriction,
      t.ziswaf_type,
      COALESCE(o.balance, 0) as opening,
      COALESCE(i.inflow, 0) as received,
      COALESCE(out.outflow, 0) as distributed
    FROM finance_funds f
    CROSS JOIN (SELECT DISTINCT ziswaf_type FROM ziswaf_receipts) t
    LEFT JOIN opening o ON f.id = o.fund_id AND t.ziswaf_type = o.ziswaf_type
    LEFT JOIN period_inflow i ON f.id = i.fund_id AND t.ziswaf_type = i.ziswaf_type
    LEFT JOIN period_outflow out ON f.id = out.fund_id AND t.ziswaf_type = out.ziswaf_type
    WHERE f.is_active = true 
      AND (o.balance != 0 OR i.inflow != 0 OR out.outflow != 0)
    ORDER BY t.ziswaf_type, f.name
  `)

  return res.rows.map((r: any) => {
    const opening = BigInt(r.opening as string)
    const received = BigInt(r.received as string)
    const distributed = BigInt(r.distributed as string)
    const closing = opening + received - distributed

    return {
      fundId: r.id,
      fundName: r.fund_name,
      restriction: r.restriction,
      ziswafType: r.ziswaf_type,
      openingBalance: opening.toString(),
      received: received.toString(),
      distributed: distributed.toString(),
      closingBalance: closing.toString()
    }
  })
}

export async function getZiswafCampaignReport(range?: DateRange): Promise<any[]> {
  const filterSql = range && (range.from || range.to) ? sql` AND ${dateFilter('r', range, 'received_date')}` : sql``

  const res = await db.execute(sql`
    SELECT 
      c.id,
      c.name as campaign_name,
      COUNT(r.id) as receipt_count,
      COALESCE(SUM(CASE WHEN r.status = 'CONFIRMED' THEN r.amount ELSE 0 END), 0) as gross,
      COALESCE(SUM(CASE WHEN r.status = 'REFUNDED' THEN r.amount ELSE 0 END), 0) as refunds
    FROM finance_campaigns c
    LEFT JOIN ziswaf_receipts r ON c.id = r.campaign_id AND r.status IN ('CONFIRMED', 'REFUNDED') ${filterSql}
    GROUP BY c.id, c.name
    ORDER BY c.name ASC
  `)

  return res.rows.map((r: any) => {
    const gross = BigInt(r.gross as string)
    const refunds = BigInt(r.refunds as string)
    return {
      campaignId: r.id,
      campaignName: r.campaign_name,
      receiptCount: parseInt(r.receipt_count as string, 10),
      grossReceived: gross.toString(),
      refunds: refunds.toString(),
      netReceived: (gross - refunds).toString()
    }
  })
}
