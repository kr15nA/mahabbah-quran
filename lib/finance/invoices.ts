import { db } from '@/lib/db/client'
import { financeDb } from './tx'
import {
  financeInvoices,
  financeFeeTypes,
  financeCategories,
  financeFunds,
  financeAccounts,
  financePaymentAllocations,
  financePayments,
  financeJournalEntries,
  auditLogs,
  students,
  academicYears,
  financeInvoiceScholarships
} from '@/drizzle/schema'
import { eq, and, sql, isNotNull, inArray } from 'drizzle-orm'
import { generateDocumentNumber } from './sequence'
import { postJournalEntry, reverseJournalEntry } from './ledger'
import { resolveScholarshipForInvoice } from './scholarships/resolver'
import { calculateInvoiceBalance } from './invoice-balance'
import { serializeForAudit } from './audit'

export interface InvoiceDraftInput {
  studentId: number
  academicYearId: number
  feeTypeId: number
  period?: string | null
  description?: string
  amount: bigint
  dueDate: string
  createdBy: number
}

// Ensure MONTHLY period is YYYY-MM
export function validatePeriod(billingFrequency: string, period?: string | null) {
  if (billingFrequency === 'MONTHLY') {
    if (!period) throw new Error('MONTHLY fee types require a period')
    const regex = /^\d{4}-(0[1-9]|1[0-2])$/
    if (!regex.test(period)) throw new Error('MONTHLY period must be in YYYY-MM format')
  }
}

export async function createInvoiceDraft(input: InvoiceDraftInput): Promise<number> {
  const [feeType] = await db.select().from(financeFeeTypes).where(eq(financeFeeTypes.id, input.feeTypeId))
  if (!feeType) throw new Error('Fee type not found')
  if (!feeType.isActive) throw new Error('Fee type is inactive')

  validatePeriod(feeType.billingFrequency, input.period)

  if (input.amount <= BigInt(0)) throw new Error('Invoice amount must be greater than 0')

  // Check student & year
  const [student] = await db.select({ id: students.id }).from(students).where(eq(students.id, input.studentId))
  if (!student) throw new Error('Student not found')

  const [year] = await db.select({ id: academicYears.id }).from(academicYears).where(eq(academicYears.id, input.academicYearId))
  if (!year) throw new Error('Academic year not found')

  return await financeDb.transaction(async (tx) => {
    // Unique check if period is defined
    if (input.period) {
      const existing = await tx.select({ id: financeInvoices.id })
        .from(financeInvoices)
        .where(and(
          eq(financeInvoices.studentId, input.studentId),
          eq(financeInvoices.academicYearId, input.academicYearId),
          eq(financeInvoices.feeTypeId, input.feeTypeId),
          eq(financeInvoices.period, input.period)
        ))
      
      if (existing.length > 0) {
        throw new Error('Duplicate recurring invoice detected')
      }
    }

    const invoiceNumber = await generateDocumentNumber('INV', tx)

    const [result] = await tx.insert(financeInvoices).values({
      invoiceNumber,
      studentId: input.studentId,
      academicYearId: input.academicYearId,
      feeTypeId: input.feeTypeId,
      period: input.period,
      description: input.description,
      amount: input.amount,
      dueDate: input.dueDate,
      status: 'DRAFT',
      createdBy: input.createdBy
    }).returning({ id: financeInvoices.id })

    if (input.period) {
      const snapshot = await resolveScholarshipForInvoice({
        studentId: input.studentId,
        academicYearId: input.academicYearId,
        feeTypeId: input.feeTypeId,
        period: input.period,
        grossAmount: input.amount
      }, tx)

      if (snapshot) {
        await tx.insert(financeInvoiceScholarships).values({
          invoiceId: result.id,
          ...snapshot
        })
      }
    }

    await tx.insert(auditLogs).values({
      actorUserId: input.createdBy,
      action: 'CREATE',
      entityType: 'INVOICE',
      entityId: result.id,
      newValues: { status: 'DRAFT' }
    })

    return result.id
  })
}

export async function recalculateDraftScholarship(invoiceId: number, actorId: number): Promise<void> {
  await financeDb.transaction(async (tx) => {
    const [invoice] = await tx.select().from(financeInvoices).where(eq(financeInvoices.id, invoiceId))
    if (!invoice) throw new Error('Invoice not found')
    if (invoice.status !== 'DRAFT') throw new Error('Only DRAFT invoices can be recalculated')

    await tx.delete(financeInvoiceScholarships).where(eq(financeInvoiceScholarships.invoiceId, invoiceId))

    if (invoice.period) {
      const snapshot = await resolveScholarshipForInvoice({
        studentId: invoice.studentId,
        academicYearId: invoice.academicYearId,
        feeTypeId: invoice.feeTypeId,
        period: invoice.period,
        grossAmount: invoice.amount
      }, tx)

      if (snapshot) {
        await tx.insert(financeInvoiceScholarships).values({
          invoiceId: invoiceId,
          ...snapshot
        })
      }
    }
  })
}

export async function issueInvoice(invoiceId: number, issuedBy: number): Promise<void> {
  await financeDb.transaction(async (tx) => {
    const [invoice] = await tx.select().from(financeInvoices).where(eq(financeInvoices.id, invoiceId))
    if (!invoice) throw new Error('Invoice not found')
    if (invoice.status !== 'DRAFT') throw new Error('Only DRAFT invoices can be issued')

    const [feeType] = await tx.select().from(financeFeeTypes).where(eq(financeFeeTypes.id, invoice.feeTypeId))
    if (!feeType || !feeType.isActive) throw new Error('Fee type configuration missing or inactive')

    // Validate configuration
    if (!feeType.receivableAccountId || !feeType.incomeAccountId || !feeType.categoryId) {
      throw new Error('Incomplete accounting configuration for Fee Type')
    }

    const [receivable] = await tx.select().from(financeAccounts).where(and(eq(financeAccounts.id, feeType.receivableAccountId), eq(financeAccounts.accountType, 'ASSET')))
    const [income] = await tx.select().from(financeAccounts).where(and(eq(financeAccounts.id, feeType.incomeAccountId), eq(financeAccounts.accountType, 'INCOME')))
    const [category] = await tx.select().from(financeCategories).where(and(eq(financeCategories.id, feeType.categoryId), eq(financeCategories.type, 'INCOME')))

    if (!receivable || !income || !category) throw new Error('Invalid accounting configuration for Fee Type')
    
    const [snapshot] = await tx.select().from(financeInvoiceScholarships).where(eq(financeInvoiceScholarships.invoiceId, invoiceId))
    
    let fundId = feeType.defaultFundId
    if (fundId) {
      const [fund] = await tx.select().from(financeFunds).where(eq(financeFunds.id, fundId))
      if (!fund || fund.isActive !== true) throw new Error('Configured default fund is missing or inactive')
    }

    if (snapshot) {
      if (snapshot.fundIdSnapshot && snapshot.fundIdSnapshot !== fundId) {
        throw new Error('DEFERRED: Cross-fund scholarship not supported in Phase B V1')
      }
      if (snapshot.fundIdSnapshot) {
        const [fund] = await tx.select().from(financeFunds).where(eq(financeFunds.id, snapshot.fundIdSnapshot))
        if (!fund || fund.restrictionType !== 'UNRESTRICTED') {
          throw new Error('DEFERRED: Restricted fund scholarship not supported in Phase B V1')
        }
      }
      if (snapshot.scholarshipAccountIdSnapshot) {
        const [account] = await tx.select().from(financeAccounts).where(and(eq(financeAccounts.id, snapshot.scholarshipAccountIdSnapshot), eq(financeAccounts.accountType, 'EXPENSE')))
        if (!account || !account.isActive) {
          throw new Error('Scholarship account is missing, inactive, or not an EXPENSE account')
        }
      } else {
        throw new Error('Scholarship account is required for scholarship program')
      }
    }

    const scholarshipAmount = snapshot ? snapshot.scholarshipAmount : BigInt(0)
    const { netPayable } = calculateInvoiceBalance({
      grossAmount: invoice.amount,
      scholarshipAmount,
      paidAmount: BigInt(0)
    })

    const newStatus = netPayable === BigInt(0) ? 'PAID' : 'ISSUED'

    await tx.update(financeInvoices)
      .set({ status: newStatus, issuedAt: new Date(), updatedAt: new Date() })
      .where(eq(financeInvoices.id, invoiceId))

    const lines: any[] = []
    
    // Debit Receivable for Net
    if (netPayable > BigInt(0)) {
      lines.push({
        accountId: feeType.receivableAccountId,
        fundId: feeType.defaultFundId,
        debit: netPayable,
        credit: BigInt(0),
        description: `Receivable for ${invoice.invoiceNumber}`
      })
    }

    // Debit Scholarship Expense
    if (scholarshipAmount > BigInt(0) && snapshot) {
      lines.push({
        accountId: snapshot.scholarshipAccountIdSnapshot,
        fundId: feeType.defaultFundId, // Safe because we asserted it equals fundingFundId
        debit: scholarshipAmount,
        credit: BigInt(0),
        description: `Scholarship for ${invoice.invoiceNumber}`
      })
    }

    // Credit Income for Gross
    if (invoice.amount > BigInt(0)) {
      lines.push({
        accountId: feeType.incomeAccountId,
        fundId: feeType.defaultFundId,
        debit: BigInt(0),
        credit: invoice.amount,
        description: `Income for ${invoice.invoiceNumber}`
      })
    }

    if (lines.length > 0) {
      await postJournalEntry({
        transactionDate: new Date(),
        description: `Invoice Issuance ${invoice.invoiceNumber}`,
        sourceType: 'INVOICE',
        sourceId: invoiceId,
        sourceEvent: 'ISSUED',
        createdBy: issuedBy,
        lines
      }, tx)
    }

    await tx.insert(auditLogs).values({
      actorUserId: issuedBy,
      action: 'ISSUE',
      entityType: 'INVOICE',
      entityId: invoiceId,
      newValues: serializeForAudit({ 
        status: newStatus,
        hasScholarship: !!snapshot,
        scholarshipAmount: scholarshipAmount.toString(),
        netPayable: netPayable.toString()
      })
    })
  })
}

export async function cancelInvoice(invoiceId: number, canceledBy: number): Promise<void> {
  await financeDb.transaction(async (tx) => {
    const [invoice] = await tx.select().from(financeInvoices).where(eq(financeInvoices.id, invoiceId))
    if (!invoice) throw new Error('Invoice not found')
    
    if (invoice.status === 'CANCELLED') throw new Error('Invoice is already cancelled')
    if (invoice.status === 'PARTIALLY_PAID' || invoice.status === 'PAID') {
      throw new Error('Cannot naive cancel an invoice with payments. Reverse payments first.')
    }

    if (invoice.status === 'ISSUED') {
      // Find original journal and reverse it
      const [journal] = await tx.select().from(financeJournalEntries).where(and(
        eq(financeJournalEntries.sourceType, 'INVOICE'),
        eq(financeJournalEntries.sourceId, invoiceId),
        eq(financeJournalEntries.sourceEvent, 'ISSUED')
      ))
      if (!journal) throw new Error('Cannot find original invoice journal to reverse')
      await reverseJournalEntry(journal.id, canceledBy, tx)
    }

    await tx.update(financeInvoices)
      .set({ status: 'CANCELLED', updatedAt: new Date() })
      .where(eq(financeInvoices.id, invoiceId))

    await tx.insert(auditLogs).values({
      actorUserId: canceledBy,
      action: 'CANCEL',
      entityType: 'INVOICE',
      entityId: invoiceId,
      newValues: { status: 'CANCELLED' }
    })
  })
}

export async function getInvoiceDetails(invoiceId: number) {
  const [invoice] = await db.select().from(financeInvoices).where(eq(financeInvoices.id, invoiceId))
  if (!invoice) return null

  const allocations = await db.select({
    allocatedAmount: financePaymentAllocations.allocatedAmount,
    status: financePayments.status
  })
  .from(financePaymentAllocations)
  .leftJoin(financePayments, eq(financePayments.id, financePaymentAllocations.paymentId))
  .where(and(
    eq(financePaymentAllocations.invoiceId, invoiceId),
    eq(financePayments.status, 'CONFIRMED')
  ))

  const payments = await db.select({
    id: financePayments.id,
    paymentNumber: financePayments.paymentNumber,
    paymentDate: financePayments.paymentDate,
    amount: financePayments.amount,
    status: financePayments.status,
    paymentMethod: financePayments.paymentMethod,
    allocatedAmount: financePaymentAllocations.allocatedAmount
  })
  .from(financePaymentAllocations)
  .innerJoin(financePayments, eq(financePayments.id, financePaymentAllocations.paymentId))
  .where(eq(financePaymentAllocations.invoiceId, invoiceId))
  .orderBy(financePayments.paymentDate)

  let paidAmount = BigInt(0)
  for (const alloc of allocations) {
    if (alloc.allocatedAmount) paidAmount += alloc.allocatedAmount
  }

  const [snapshot] = await db.select().from(financeInvoiceScholarships).where(eq(financeInvoiceScholarships.invoiceId, invoiceId))
  const scholarshipAmount = snapshot ? snapshot.scholarshipAmount : BigInt(0)

  const balance = calculateInvoiceBalance({
    grossAmount: invoice.amount,
    scholarshipAmount,
    paidAmount
  })

  return {
    ...invoice,
    scholarshipAmount: balance.scholarshipAmount,
    netPayable: balance.netPayable,
    paidAmount: balance.paidAmount,
    outstandingAmount: balance.outstandingAmount,
    payments
  }
}
