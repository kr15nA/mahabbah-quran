import { financeDb as db } from '../tx'
import { sql } from 'drizzle-orm'
import { DateRange, PaginationParams, buildPagination, dateFilter, PaginatedResult } from './utils'

export async function getDisbursementReport(range?: DateRange, params?: PaginationParams): Promise<PaginatedResult<any> & { paid: string, reversed: string, netExpense: string }> {
  const { page, pageSize, limitClause } = buildPagination(params)
  const dFilter = range && (range.from || range.to) ? sql` AND ${dateFilter('d', range, 'transaction_date')}` : sql``

  const summaryRes = await db.execute(sql`
    SELECT 
      COALESCE(SUM(CASE WHEN d.status IN ('PAID', 'REVERSED') THEN d.amount ELSE 0 END), 0) as paid,
      COALESCE(SUM(CASE WHEN d.status = 'REVERSED' THEN d.amount ELSE 0 END), 0) as reversed
    FROM finance_disbursements d
    WHERE 1=1 ${dFilter}
  `)

  // Net Expense considers PAID as expense, REVERSED as expense but netted out (- amount)
  // Wait, if it's REVERSED, the original payment is still paid but then negated by reversal.
  // The gross paid should count PAID. If REVERSED, it was paid then reversed, so gross paid = PAID + REVERSED.
  // Net = Gross Paid - Reversed.
  const paid = BigInt(summaryRes.rows[0].paid as string)
  const reversed = BigInt(summaryRes.rows[0].reversed as string)
  const netExpense = paid - reversed

  const countRes = await db.execute(sql`
    SELECT count(d.id) as count
    FROM finance_disbursements d
    WHERE 1=1 ${dFilter}
  `)
  const totalRows = parseInt(countRes.rows[0].count as string, 10)
  const totalPages = Math.ceil(totalRows / pageSize)

  const res = await db.execute(sql`
    SELECT 
      d.id,
      d.disbursement_number,
      d.transaction_date,
      f.name as fund_name,
      c.name as category_name,
      d.beneficiary_name,
      d.amount,
      d.status,
      d.maker_id,
      m.full_name as maker_name,
      d.checker_id,
      chk.full_name as checker_name,
      a.name as payment_account_name
    FROM finance_disbursements d
    JOIN finance_funds f ON d.fund_id = f.id
    JOIN finance_categories c ON d.expense_category_id = c.id
    LEFT JOIN users m ON d.maker_id = m.id
    LEFT JOIN users chk ON d.checker_id = chk.id
    LEFT JOIN finance_accounts a ON d.payment_account_id = a.id
    WHERE 1=1 ${dFilter}
    ORDER BY d.transaction_date DESC, d.id DESC
    ${limitClause}
  `)

  return {
    paid: paid.toString(),
    reversed: reversed.toString(),
    netExpense: netExpense.toString(),
    items: res.rows.map((r: any) => ({
      id: r.id,
      disbursementNumber: r.disbursement_number,
      date: r.transaction_date,
      fundName: r.fund_name,
      categoryName: r.category_name,
      beneficiaryName: r.beneficiary_name,
      amount: (r.amount as string).toString(),
      status: r.status,
      makerName: r.maker_name,
      checkerName: r.checker_name,
      paymentAccountName: r.payment_account_name
    })),
    page, pageSize, totalRows, totalPages
  }
}
