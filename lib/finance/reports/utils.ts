import { sql } from 'drizzle-orm'

export interface DateRange {
  from?: string
  to?: string
}

export interface PaginationParams {
  page?: number
  pageSize?: number
}

export interface PaginatedResult<T> {
  items: T[]
  page: number
  pageSize: number
  totalRows: number
  totalPages: number
}

export function dateFilter(alias: string, range?: DateRange, field = 'transaction_date') {
  if (!range) return sql``
  const fieldRef = sql.raw(`${alias}.${field}`)
  
  if (range.from && range.to) {
    if (range.from > range.to) throw new Error('from date cannot be greater than to date')
    return sql` ${fieldRef} >= ${range.from} AND ${fieldRef} <= ${range.to}`
  }
  if (range.from) return sql` ${fieldRef} >= ${range.from}`
  if (range.to) return sql` ${fieldRef} <= ${range.to}`
  return sql``
}

export function buildPagination(params?: PaginationParams, maxPageSize = 100) {
  const page = Math.max(1, params?.page || 1)
  const pageSize = Math.min(maxPageSize, Math.max(1, params?.pageSize || 50))
  const offset = (page - 1) * pageSize
  
  return {
    page,
    pageSize,
    limitClause: sql`LIMIT ${pageSize} OFFSET ${offset}`
  }
}

/**
 * Calculates account mutation based on normal balance rules.
 * 
 * ASSET / EXPENSE: debit - credit
 * LIABILITY / EQUITY / INCOME: credit - debit
 */
export function calculateAccountMutation(accountType: string, debit: bigint, credit: bigint): bigint {
  if (accountType === 'ASSET' || accountType === 'EXPENSE') {
    return debit - credit
  }
  return credit - debit
}
