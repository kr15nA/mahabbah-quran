import { financeDb as db } from '../tx'
import { sql } from 'drizzle-orm'
import { DateRange, PaginationParams, buildPagination, dateFilter, PaginatedResult } from './utils'

export async function getAcademicBillingReport(params?: PaginationParams, filters?: any): Promise<PaginatedResult<any>> {
  const { page, pageSize, limitClause } = buildPagination(params)

  let filterSql = sql`1=1`
  if (filters?.academicYearId) filterSql = sql`${filterSql} AND i.academic_year_id = ${filters.academicYearId}`
  if (filters?.feeTypeId) filterSql = sql`${filterSql} AND i.fee_type_id = ${filters.feeTypeId}`
  if (filters?.studentId) filterSql = sql`${filterSql} AND i.student_id = ${filters.studentId}`
  if (filters?.status) filterSql = sql`${filterSql} AND i.status = ${filters.status}`
  if (filters?.overdue) {
    const today = new Date().toISOString().split('T')[0]
    filterSql = sql`${filterSql} AND i.due_date < ${today} AND i.status IN ('ISSUED', 'PARTIALLY_PAID')`
  }

  const countRes = await db.execute(sql`
    SELECT count(i.id) as count
    FROM finance_invoices i
    WHERE ${filterSql}
  `)
  const totalRows = parseInt(countRes.rows[0].count as string, 10)
  const totalPages = Math.ceil(totalRows / pageSize)

  const res = await db.execute(sql`
    SELECT 
      i.id,
      i.invoice_number,
      s.full_name as student_name,
      ft.name as fee_type,
      ay.name as academic_year,
      i.amount,
      i.due_date,
      i.status,
      COALESCE(
        (SELECT SUM(a.allocated_amount) 
         FROM finance_payment_allocations a 
         JOIN finance_payments p ON a.payment_id = p.id 
         WHERE a.invoice_id = i.id AND p.status = 'CONFIRMED'), 0
      ) as paid_amount,
      COALESCE(s.scholarship_amount, 0) as scholarship_amount
    FROM finance_invoices i
    JOIN users u ON i.student_id = u.id
    JOIN finance_fee_types ft ON i.fee_type_id = ft.id
    JOIN academic_years ay ON i.academic_year_id = ay.id
    LEFT JOIN finance_invoice_scholarships s ON i.id = s.invoice_id
    WHERE ${filterSql}
    ORDER BY i.due_date DESC, i.id DESC
    ${limitClause}
  `)

  return {
    items: res.rows.map((r: any) => {
      const amount = BigInt(r.amount as string)
      const scholarshipAmount = BigInt(r.scholarship_amount as string)
      const paid = BigInt(r.paid_amount as string)
      const netPayable = amount > scholarshipAmount ? amount - scholarshipAmount : BigInt(0)
      const outstanding = netPayable > paid ? netPayable - paid : BigInt(0)
      const today = new Date().toISOString().split('T')[0]
      const overdue = r.due_date < today && outstanding > BigInt(0) && (r.status === 'ISSUED' || r.status === 'PARTIALLY_PAID')

      return {
        id: r.id,
        invoiceNumber: r.invoice_number,
        studentName: r.student_name,
        feeType: r.fee_type,
        academicYear: r.academic_year,
        dueDate: r.due_date,
        status: r.status,
        amount: amount.toString(),
        paid: paid.toString(),
        outstanding: outstanding.toString(),
        overdue
      }
    }),
    page, pageSize, totalRows, totalPages
  }
}

export async function getAcademicCollectionReport(range?: DateRange, params?: PaginationParams): Promise<PaginatedResult<any> & { grossCollections: string, refunds: string, netCollections: string }> {
  const { page, pageSize, limitClause } = buildPagination(params)
  const dFilter = range && (range.from || range.to) ? sql` AND ${dateFilter('p', range, 'payment_date')}` : sql``

  const summaryRes = await db.execute(sql`
    SELECT 
      COALESCE(SUM(CASE WHEN p.status = 'CONFIRMED' THEN p.amount ELSE 0 END), 0) as gross,
      COALESCE(SUM(CASE WHEN p.status = 'REFUNDED' THEN p.amount ELSE 0 END), 0) as refunds
    FROM finance_payments p
    WHERE p.status IN ('CONFIRMED', 'REFUNDED') ${dFilter}
  `)

  const grossCollections = BigInt(summaryRes.rows[0].gross as string)
  const refunds = BigInt(summaryRes.rows[0].refunds as string)
  const netCollections = grossCollections - refunds

  const countRes = await db.execute(sql`
    SELECT count(p.id) as count
    FROM finance_payments p
    WHERE p.status IN ('CONFIRMED', 'REFUNDED') ${dFilter}
  `)
  const totalRows = parseInt(countRes.rows[0].count as string, 10)
  const totalPages = Math.ceil(totalRows / pageSize)

  const res = await db.execute(sql`
    SELECT 
      p.id,
      p.payment_number,
      p.payment_date,
      p.payment_method,
      p.amount,
      p.status,
      a.name as account_name,
      s.full_name as student_name
    FROM finance_payments p
    LEFT JOIN finance_accounts a ON p.destination_account_id = a.id
    LEFT JOIN users s ON p.student_id = s.id
    WHERE p.status IN ('CONFIRMED', 'REFUNDED') ${dFilter}
    ORDER BY p.payment_date DESC, p.id DESC
    ${limitClause}
  `)

  return {
    grossCollections: grossCollections.toString(),
    refunds: refunds.toString(),
    netCollections: netCollections.toString(),
    items: res.rows.map((r: any) => ({
      id: r.id,
      paymentNumber: r.payment_number,
      date: r.payment_date,
      studentName: r.student_name,
      method: r.payment_method,
      accountName: r.account_name,
      amount: r.amount as string,
      status: r.status
    })),
    page, pageSize, totalRows, totalPages
  }
}

export async function getReceivableAgingReport(asOfDate?: string): Promise<{ items: any[], summary: any }> {
  const asOf = asOfDate || new Date().toISOString().split('T')[0]
  
  const res = await db.execute(sql`
    WITH invoice_balances AS (
      SELECT 
        i.id,
        i.invoice_number,
        u.full_name as student_name,
        ft.name as fee_type,
        i.due_date,
        GREATEST(0, (GREATEST(0, i.amount - COALESCE(s.scholarship_amount, 0)) - COALESCE(
          (SELECT SUM(a.allocated_amount) 
           FROM finance_payment_allocations a 
           JOIN finance_payments p ON a.payment_id = p.id 
           WHERE a.invoice_id = i.id AND p.status = 'CONFIRMED' AND p.payment_date <= ${asOf}), 0
        ))) as outstanding
      FROM finance_invoices i
      JOIN users u ON i.student_id = u.id
      JOIN finance_fee_types ft ON i.fee_type_id = ft.id
      LEFT JOIN finance_invoice_scholarships s ON i.id = s.invoice_id
      WHERE i.status IN ('ISSUED', 'PARTIALLY_PAID')
    )
    SELECT * FROM invoice_balances WHERE outstanding > 0
    ORDER BY due_date ASC
  `)

  const summary = {
    NOT_DUE: BigInt(0),
    _1_30: BigInt(0),
    _31_60: BigInt(0),
    _61_90: BigInt(0),
    OVER_90: BigInt(0),
    TOTAL: BigInt(0)
  }

  const items = res.rows.map((r: any) => {
    const outstanding = BigInt(r.outstanding as string)
    summary.TOTAL += outstanding

    let bucket = 'NOT_DUE'
    let daysOverdue = 0

    if (asOf > r.due_date) {
      const asOfTime = new Date(asOf).getTime()
      const dueTime = new Date(r.due_date).getTime()
      daysOverdue = Math.floor((asOfTime - dueTime) / (1000 * 60 * 60 * 24))

      if (daysOverdue >= 1 && daysOverdue <= 30) {
        bucket = '1_30'
        summary._1_30 += outstanding
      } else if (daysOverdue >= 31 && daysOverdue <= 60) {
        bucket = '31_60'
        summary._31_60 += outstanding
      } else if (daysOverdue >= 61 && daysOverdue <= 90) {
        bucket = '61_90'
        summary._61_90 += outstanding
      } else if (daysOverdue >= 91) {
        bucket = 'OVER_90'
        summary.OVER_90 += outstanding
      } else {
        // Fallback for edge cases where time truncation might make it 0 days but string comparison >
        summary.NOT_DUE += outstanding
      }
    } else {
      summary.NOT_DUE += outstanding
    }

    return {
      invoiceNumber: r.invoice_number,
      studentName: r.student_name,
      feeType: r.fee_type,
      dueDate: r.due_date,
      outstanding: outstanding.toString(),
      daysOverdue,
      bucket
    }
  })

  return {
    items,
    summary: {
      NOT_DUE: summary.NOT_DUE.toString(),
      _1_30: summary._1_30.toString(),
      _31_60: summary._31_60.toString(),
      _61_90: summary._61_90.toString(),
      OVER_90: summary.OVER_90.toString(),
      TOTAL: summary.TOTAL.toString()
    }
  }
}

export async function getAcademicReconciliationReport() {
  const invoiceRes = await db.execute(sql`
    SELECT 
      COALESCE(SUM(i.amount), 0) as total_gross,
      COALESCE(SUM(s.scholarship_amount), 0) as total_scholarship
    FROM finance_invoices i
    LEFT JOIN finance_invoice_scholarships s ON i.id = s.invoice_id
    WHERE i.status IN ('ISSUED', 'PARTIALLY_PAID')
  `)
  const totalGross = BigInt(invoiceRes.rows[0].total_gross as string)
  const totalScholarship = BigInt(invoiceRes.rows[0].total_scholarship as string)
  const totalInvoiced = totalGross > totalScholarship ? totalGross - totalScholarship : BigInt(0)

  const allocationsRes = await db.execute(sql`
    SELECT COALESCE(SUM(a.allocated_amount), 0) as total_paid
    FROM finance_payment_allocations a
    JOIN finance_payments p ON a.payment_id = p.id
    JOIN finance_invoices i ON a.invoice_id = i.id
    WHERE p.status = 'CONFIRMED' AND i.status IN ('ISSUED', 'PARTIALLY_PAID')
  `)
  const totalPaid = BigInt(allocationsRes.rows[0].total_paid as string)
  const businessOutstanding = totalInvoiced - totalPaid

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
