import { financeDb as db } from '../tx'
import { sql } from 'drizzle-orm'
import { DateRange, PaginationParams, buildPagination, dateFilter, PaginatedResult } from './utils'

export async function getJournalReport(range?: DateRange, params?: PaginationParams): Promise<PaginatedResult<any>> {
  const { page, pageSize, limitClause } = buildPagination(params)
  
  const dFilter = range && (range.from || range.to) ? sql` AND ${dateFilter('e', range)}` : sql``

  const countRes = await db.execute(sql`
    SELECT count(l.id) as count
    FROM finance_journal_lines l
    JOIN finance_journal_entries e ON l.journal_entry_id = e.id
    JOIN finance_accounts a ON l.account_id = a.id
    LEFT JOIN finance_funds f ON l.fund_id = f.id
    WHERE e.status IN ('POSTED', 'REVERSED') ${dFilter}
  `)
  const totalRows = parseInt(countRes.rows[0].count as string, 10)
  const totalPages = Math.ceil(totalRows / pageSize)

  const res = await db.execute(sql`
    SELECT 
      e.transaction_date as date,
      e.journal_number,
      e.source_type,
      e.source_event,
      e.source_id,
      e.description as header_description,
      e.status,
      l.description as line_description,
      a.code as account_code,
      a.name as account_name,
      f.name as fund_name,
      l.debit,
      l.credit
    FROM finance_journal_lines l
    JOIN finance_journal_entries e ON l.journal_entry_id = e.id
    JOIN finance_accounts a ON l.account_id = a.id
    LEFT JOIN finance_funds f ON l.fund_id = f.id
    WHERE e.status IN ('POSTED', 'REVERSED') ${dFilter}
    ORDER BY e.transaction_date DESC, e.journal_number DESC, l.id ASC
    ${limitClause}
  `)

  return {
    items: res.rows.map((r: any) => ({
      date: r.date,
      journalNumber: r.journal_number,
      sourceType: r.source_type,
      sourceEvent: r.source_event,
      description: r.line_description || r.header_description,
      status: r.status,
      accountCode: r.account_code,
      accountName: r.account_name,
      fundName: r.fund_name,
      debit: r.debit as string,
      credit: r.credit as string,
      sourceId: r.source_id
    })),
    page, pageSize, totalRows, totalPages
  }
}

export async function getAccountMutationReport(accountId: number, range?: DateRange): Promise<any> {
  // Opening balance: activity before from-date
  const openFilter = range && range.from ? sql` AND e.transaction_date < ${range.from}` : sql` AND 1=0` 
  // If no range.from, opening is 0 because period is all time.

  // Period balance
  const periodFilter = range && (range.from || range.to) ? sql` AND ${dateFilter('e', range)}` : sql``

  const openingRes = await db.execute(sql`
    SELECT 
      COALESCE(SUM(l.debit), 0) as debit,
      COALESCE(SUM(l.credit), 0) as credit
    FROM finance_journal_lines l
    JOIN finance_journal_entries e ON l.journal_entry_id = e.id
    WHERE e.status IN ('POSTED', 'REVERSED')
      AND l.account_id = ${accountId}
      ${openFilter}
  `)

  const periodRes = await db.execute(sql`
    SELECT 
      COALESCE(SUM(l.debit), 0) as debit,
      COALESCE(SUM(l.credit), 0) as credit
    FROM finance_journal_lines l
    JOIN finance_journal_entries e ON l.journal_entry_id = e.id
    WHERE e.status IN ('POSTED', 'REVERSED')
      AND l.account_id = ${accountId}
      ${periodFilter}
  `)

  const accountInfo = await db.execute(sql`SELECT code, name, account_type FROM finance_accounts WHERE id = ${accountId}`)
  if (accountInfo.rows.length === 0) throw new Error('Account not found')
  const acc = accountInfo.rows[0] as any

  const openDr = BigInt(openingRes.rows[0].debit as string)
  const openCr = BigInt(openingRes.rows[0].credit as string)
  const periodDr = BigInt(periodRes.rows[0].debit as string)
  const periodCr = BigInt(periodRes.rows[0].credit as string)

  let openingBalance = BigInt(0)
  let closingBalance = BigInt(0)
  let periodNetMovement = BigInt(0)

  if (acc.account_type === 'ASSET' || acc.account_type === 'EXPENSE') {
    openingBalance = openDr - openCr
    periodNetMovement = periodDr - periodCr
    closingBalance = openingBalance + periodNetMovement
  } else {
    openingBalance = openCr - openDr
    periodNetMovement = periodCr - periodDr
    closingBalance = openingBalance + periodNetMovement
  }

  return {
    accountCode: acc.code,
    accountName: acc.name,
    accountType: acc.account_type,
    openingBalance: openingBalance.toString(),
    periodDebit: periodDr.toString(),
    periodCredit: periodCr.toString(),
    periodNetMovement: periodNetMovement.toString(),
    closingBalance: closingBalance.toString()
  }
}

export async function getCashBankReport(range?: DateRange, params?: PaginationParams, fundId?: number): Promise<PaginatedResult<any> & { openingBalance: string, closingBalance: string }> {
  const { page, pageSize, limitClause } = buildPagination(params)

  const openFilter = range && range.from ? sql` AND e.transaction_date < ${range.from}` : sql` AND 1=0` 
  const periodFilter = range && (range.from || range.to) ? sql` AND ${dateFilter('e', range)}` : sql``
  const fundFilter = fundId ? sql` AND l.fund_id = ${fundId}` : sql``

  const openingRes = await db.execute(sql`
    SELECT COALESCE(SUM(l.debit - l.credit), 0) as balance
    FROM finance_journal_lines l
    JOIN finance_journal_entries e ON l.journal_entry_id = e.id
    JOIN finance_accounts a ON l.account_id = a.id
    WHERE e.status IN ('POSTED', 'REVERSED')
      AND a.account_type = 'ASSET' AND a.asset_subtype IN ('CASH', 'BANK')
      ${fundFilter}
      ${openFilter}
  `)

  const periodTotalRes = await db.execute(sql`
    SELECT COALESCE(SUM(l.debit - l.credit), 0) as balance
    FROM finance_journal_lines l
    JOIN finance_journal_entries e ON l.journal_entry_id = e.id
    JOIN finance_accounts a ON l.account_id = a.id
    WHERE e.status IN ('POSTED', 'REVERSED')
      AND a.account_type = 'ASSET' AND a.asset_subtype IN ('CASH', 'BANK')
      ${fundFilter}
      ${periodFilter}
  `)

  const openingBalance = BigInt(openingRes.rows[0].balance as string)
  const periodNet = BigInt(periodTotalRes.rows[0].balance as string)
  const closingBalance = openingBalance + periodNet

  const countRes = await db.execute(sql`
    SELECT count(l.id) as count
    FROM finance_journal_lines l
    JOIN finance_journal_entries e ON l.journal_entry_id = e.id
    JOIN finance_accounts a ON l.account_id = a.id
    WHERE e.status IN ('POSTED', 'REVERSED')
      AND a.account_type = 'ASSET' AND a.asset_subtype IN ('CASH', 'BANK')
      ${fundFilter}
      ${periodFilter}
  `)
  const totalRows = parseInt(countRes.rows[0].count as string, 10)
  const totalPages = Math.ceil(totalRows / pageSize)

  const res = await db.execute(sql`
    SELECT 
      e.transaction_date as date,
      e.journal_number,
      e.description as header_description,
      l.description as line_description,
      f.name as fund_name,
      a.name as account_name,
      l.debit,
      l.credit,
      e.source_type,
      e.source_event
    FROM finance_journal_lines l
    JOIN finance_journal_entries e ON l.journal_entry_id = e.id
    JOIN finance_accounts a ON l.account_id = a.id
    LEFT JOIN finance_funds f ON l.fund_id = f.id
    WHERE e.status IN ('POSTED', 'REVERSED')
      AND a.account_type = 'ASSET' AND a.asset_subtype IN ('CASH', 'BANK')
      ${fundFilter}
      ${periodFilter}
    ORDER BY e.transaction_date ASC, e.journal_number ASC, l.id ASC
    ${limitClause}
  `)

  return {
    openingBalance: openingBalance.toString(),
    closingBalance: closingBalance.toString(),
    items: res.rows.map((r: any) => ({
      date: r.date,
      documentNumber: r.journal_number,
      description: r.line_description || r.header_description,
      fundName: r.fund_name,
      accountName: r.account_name,
      debit: r.debit as string,
      credit: r.credit as string,
      sourceType: r.source_type,
      sourceEvent: r.source_event
    })),
    page, pageSize, totalRows, totalPages
  }
}
