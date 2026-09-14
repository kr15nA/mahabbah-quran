import { sql } from 'drizzle-orm'
import { financeDb } from '@/lib/finance/tx'
import {
  financeInvoices,
  financePayments,
  financePaymentAllocations,
  ziswafReceipts,
  ziswafReceiptAllocations,
  financeDisbursements,
  financeJournalLines,
  financeJournalEntries,
  financeCategoryFunds
} from '@/drizzle/schema'

async function checkPreflight() {
  console.log('--- RUNNING PRE-MIGRATION DATA PREFLIGHT ---')

  let hasViolations = false

  // 1. Check amounts <= 0
  const invoiceViolations = await financeDb.select({ id: financeInvoices.id }).from(financeInvoices).where(sql`${financeInvoices.amount} <= 0`)
  if (invoiceViolations.length > 0) { console.error('Violations found in financeInvoices amount <= 0'); hasViolations = true }

  const paymentViolations = await financeDb.select({ id: financePayments.id }).from(financePayments).where(sql`${financePayments.amount} <= 0`)
  if (paymentViolations.length > 0) { console.error('Violations found in financePayments amount <= 0'); hasViolations = true }

  const allocViolations = await financeDb.select({ id: financePaymentAllocations.id }).from(financePaymentAllocations).where(sql`${financePaymentAllocations.allocatedAmount} <= 0`)
  if (allocViolations.length > 0) { console.error('Violations found in financePaymentAllocations allocatedAmount <= 0'); hasViolations = true }

  const ziswafViolations = await financeDb.select({ id: ziswafReceipts.id }).from(ziswafReceipts).where(sql`${ziswafReceipts.amount} <= 0`)
  if (ziswafViolations.length > 0) { console.error('Violations found in ziswafReceipts amount <= 0'); hasViolations = true }

  const ziswafAllocViolations = await financeDb.select({ id: ziswafReceiptAllocations.id }).from(ziswafReceiptAllocations).where(sql`${ziswafReceiptAllocations.amount} <= 0`)
  if (ziswafAllocViolations.length > 0) { console.error('Violations found in ziswafReceiptAllocations amount <= 0'); hasViolations = true }

  const disbursementViolations = await financeDb.select({ id: financeDisbursements.id }).from(financeDisbursements).where(sql`${financeDisbursements.amount} <= 0`)
  if (disbursementViolations.length > 0) { console.error('Violations found in financeDisbursements amount <= 0'); hasViolations = true }

  // 2. Check journal lines
  const negativeDebit = await financeDb.select({ id: financeJournalLines.id }).from(financeJournalLines).where(sql`${financeJournalLines.debit} < 0`)
  if (negativeDebit.length > 0) { console.error('Violations found in financeJournalLines debit < 0'); hasViolations = true }

  const negativeCredit = await financeDb.select({ id: financeJournalLines.id }).from(financeJournalLines).where(sql`${financeJournalLines.credit} < 0`)
  if (negativeCredit.length > 0) { console.error('Violations found in financeJournalLines credit < 0'); hasViolations = true }

  const zeroZero = await financeDb.select({ id: financeJournalLines.id }).from(financeJournalLines).where(sql`${financeJournalLines.debit} = 0 AND ${financeJournalLines.credit} = 0`)
  if (zeroZero.length > 0) { console.error('Violations found in financeJournalLines debit = 0 AND credit = 0'); hasViolations = true }

  const posPos = await financeDb.select({ id: financeJournalLines.id }).from(financeJournalLines).where(sql`${financeJournalLines.debit} > 0 AND ${financeJournalLines.credit} > 0`)
  if (posPos.length > 0) { console.error('Violations found in financeJournalLines debit > 0 AND credit > 0'); hasViolations = true }

  // 3. Invalid Statuses
  const invStatus = await financeDb.select({ id: financeInvoices.id }).from(financeInvoices).where(sql`${financeInvoices.status} NOT IN ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED')`)
  if (invStatus.length > 0) { console.error('Violations found in financeInvoices status'); hasViolations = true }

  const payStatus = await financeDb.select({ id: financePayments.id }).from(financePayments).where(sql`${financePayments.status} NOT IN ('PENDING', 'CONFIRMED', 'CANCELLED', 'REFUNDED')`)
  if (payStatus.length > 0) { console.error('Violations found in financePayments status'); hasViolations = true }

  const zisStatus = await financeDb.select({ id: ziswafReceipts.id }).from(ziswafReceipts).where(sql`${ziswafReceipts.status} NOT IN ('DRAFT', 'CONFIRMED', 'CANCELLED', 'REFUNDED')`)
  if (zisStatus.length > 0) { console.error('Violations found in ziswafReceipts status'); hasViolations = true }

  const disStatus = await financeDb.select({ id: financeDisbursements.id }).from(financeDisbursements).where(sql`${financeDisbursements.status} NOT IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PAID', 'CANCELLED')`)
  if (disStatus.length > 0) { console.error('Violations found in financeDisbursements status'); hasViolations = true }

  const jrnStatus = await financeDb.select({ id: financeJournalEntries.id }).from(financeJournalEntries).where(sql`${financeJournalEntries.status} NOT IN ('POSTED', 'REVERSED')`)
  if (jrnStatus.length > 0) { console.error('Violations found in financeJournalEntries status'); hasViolations = true }

  // 4. Multiple default funds per category
  const multiDefault = await financeDb.execute(sql`
    SELECT category_id FROM finance_category_funds WHERE is_default = true GROUP BY category_id HAVING count(*) > 1
  `)
  if (multiDefault.rows.length > 0) { console.error('Violations found: Multiple default funds per category'); hasViolations = true }

  // 5. Reversal of ID pointing to nonexistent journal
  const invalidReversals = await financeDb.execute(sql`
    SELECT id FROM finance_journal_entries f1 WHERE reversal_of_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM finance_journal_entries f2 WHERE f2.id = f1.reversal_of_id)
  `)
  if (invalidReversals.rows.length > 0) { console.error('Violations found: reversal_of_id pointing to nonexistent journal'); hasViolations = true }

  // 6. Duplicate reversals
  const duplicateReversals = await financeDb.execute(sql`
    SELECT reversal_of_id FROM finance_journal_entries WHERE reversal_of_id IS NOT NULL GROUP BY reversal_of_id HAVING count(*) > 1
  `)
  if (duplicateReversals.rows.length > 0) { console.error('Violations found: Duplicate reversals for the same journal'); hasViolations = true }

  if (hasViolations) {
    console.error('PREFLIGHT FAILED: Existing data violates constraints.')
    process.exit(1)
  } else {
    console.log('PREFLIGHT PASSED: No violations found.')
    process.exit(0)
  }
}

checkPreflight().catch(e => {
  console.error(e)
  process.exit(1)
})
