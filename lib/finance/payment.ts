import { db } from '@/lib/db/client'
import { financeDb } from './tx'
import {
  financePayments,
  financeInvoices,
  financePaymentAllocations,
  financeAccounts,
  financeFeeTypes,
  financeFunds,
  financeJournalEntries,
  auditLogs,
  students
} from '@/drizzle/schema'
import { eq, inArray, sum, and, sql } from 'drizzle-orm'
import { postJournalEntry, reverseJournalEntry } from './ledger'
import { generateDocumentNumber } from './sequence'

function serializeForAudit(obj: any) {
  if (!obj) return obj
  return JSON.parse(JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ))
}

export interface CreatePaymentInput {
  studentId: number
  amount: bigint
  paymentDate: string
  paymentMethod: string
  destinationAccountId: number
  referenceNumber?: string
  notes?: string
  receivedBy: number
}

export interface UpdatePaymentInput {
  amount?: bigint
  paymentDate?: string
  paymentMethod?: string
  destinationAccountId?: number
  referenceNumber?: string
  notes?: string
}

export async function createPayment(input: CreatePaymentInput): Promise<number> {
  if (input.amount <= BigInt(0)) throw new Error('Amount must be greater than 0')

  // Check student
  const [student] = await db.select({ id: students.id }).from(students).where(eq(students.id, input.studentId))
  if (!student) throw new Error('Student not found')

  // Check account
  const [account] = await db.select().from(financeAccounts).where(and(eq(financeAccounts.id, input.destinationAccountId), eq(financeAccounts.accountType, 'ASSET'), eq(financeAccounts.isActive, true)))
  if (!account) throw new Error('Destination account is not an active ASSET account')

  const paymentNumber = await generateDocumentNumber('PAY')

  const [payment] = await db.insert(financePayments).values({
    paymentNumber,
    studentId: input.studentId,
    amount: input.amount,
    paymentDate: input.paymentDate,
    paymentMethod: input.paymentMethod,
    destinationAccountId: input.destinationAccountId,
    referenceNumber: input.referenceNumber,
    notes: input.notes,
    status: 'PENDING',
    receivedBy: input.receivedBy
  }).returning({ id: financePayments.id })

  await db.insert(auditLogs).values({
    actorUserId: input.receivedBy,
    action: 'PAYMENT_CREATE',
    entityType: 'PAYMENT',
    entityId: payment.id,
    newValues: serializeForAudit({ ...input, paymentNumber, status: 'PENDING' })
  })

  return payment.id
}

export async function updatePayment(id: number, input: UpdatePaymentInput, actorId: number) {
  await financeDb.transaction(async (tx) => {
    const [payment] = await tx.select().from(financePayments).where(eq(financePayments.id, id))
    if (!payment) throw new Error('Payment not found')
    if (payment.status !== 'PENDING') throw new Error('Only PENDING payments can be updated')

    if (input.destinationAccountId) {
      const [account] = await tx.select().from(financeAccounts).where(and(eq(financeAccounts.id, input.destinationAccountId), eq(financeAccounts.accountType, 'ASSET'), eq(financeAccounts.isActive, true)))
      if (!account) throw new Error('Destination account is not an active ASSET account')
    }

    if (input.amount) {
      // Check if new amount < allocated total
      const allocations = await tx.select().from(financePaymentAllocations).where(eq(financePaymentAllocations.paymentId, id))
      const allocatedTotal = allocations.reduce((sum, a) => sum + BigInt(a.allocatedAmount), BigInt(0))
      if (input.amount < allocatedTotal) {
        throw new Error('New amount cannot be less than currently allocated total')
      }
    }

    await tx.update(financePayments).set({ ...input, updatedAt: new Date() }).where(eq(financePayments.id, id))

    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: 'PAYMENT_UPDATE_PENDING',
      entityType: 'PAYMENT',
      entityId: id,
      newValues: serializeForAudit(input)
    })
  })
}

export async function cancelPayment(id: number, actorId: number) {
  await financeDb.transaction(async (tx) => {
    const [payment] = await tx.select().from(financePayments).where(eq(financePayments.id, id))
    if (!payment) throw new Error('Payment not found')
    if (payment.status !== 'PENDING') throw new Error('Only PENDING payments can be cancelled. Use refund for CONFIRMED payments.')

    await tx.update(financePayments).set({ status: 'CANCELLED', updatedAt: new Date() }).where(eq(financePayments.id, id))

    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: 'PAYMENT_CANCEL',
      entityType: 'PAYMENT',
      entityId: id,
      newValues: serializeForAudit({ status: 'CANCELLED' })
    })
  })
}

export async function allocatePayment(paymentId: number, allocations: { invoiceId: number, amount: bigint }[], actorId: number) {
  await financeDb.transaction(async (tx) => {
    const [payment] = await tx.select().from(financePayments).where(eq(financePayments.id, paymentId))
    if (!payment) throw new Error('Payment not found')
    if (payment.status !== 'PENDING') throw new Error('Allocations can only be modified for PENDING payments')

    // Validate total amount
    const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, BigInt(0))
    if (totalAllocated > payment.amount) {
      throw new Error('Total allocation exceeds payment amount')
    }

    // Check invoices
    for (const alloc of allocations) {
      const [invoice] = await tx.select().from(financeInvoices).where(eq(financeInvoices.id, alloc.invoiceId))
      if (!invoice) throw new Error(`Invoice ${alloc.invoiceId} not found`)
      if (invoice.studentId !== payment.studentId) throw new Error(`Invoice ${alloc.invoiceId} belongs to a different student`)
      if (invoice.status === 'DRAFT' || invoice.status === 'CANCELLED' || invoice.status === 'PAID') {
        throw new Error(`Cannot allocate to invoice ${alloc.invoiceId} with status ${invoice.status}`)
      }
    }

    // Delete old allocations
    await tx.delete(financePaymentAllocations).where(eq(financePaymentAllocations.paymentId, paymentId))

    // Insert new allocations
    if (allocations.length > 0) {
      await tx.insert(financePaymentAllocations).values(
        allocations.map(a => ({
          paymentId,
          invoiceId: a.invoiceId,
          allocatedAmount: a.amount
        }))
      )
    }

    await tx.insert(auditLogs).values({
      actorUserId: actorId,
      action: 'PAYMENT_ALLOCATE',
      entityType: 'PAYMENT',
      entityId: paymentId,
      newValues: serializeForAudit({ allocations: allocations.map(a => ({ invoiceId: a.invoiceId, amount: a.amount })) })
    })
  })
}

export async function reconcileInvoiceStatus(invoiceId: number, tx: any) {
  const [invoice] = await tx.select().from(financeInvoices).where(eq(financeInvoices.id, invoiceId))
  if (!invoice) return

  // Only CONFIRMED payments count
  const allocs = await tx.select({
    allocatedAmount: financePaymentAllocations.allocatedAmount
  })
  .from(financePaymentAllocations)
  .innerJoin(financePayments, eq(financePayments.id, financePaymentAllocations.paymentId))
  .where(and(eq(financePaymentAllocations.invoiceId, invoiceId), eq(financePayments.status, 'CONFIRMED')))

  const paidAmount = allocs.reduce((sum: bigint, a: any) => sum + BigInt(a.allocatedAmount), BigInt(0))
  
  let newStatus = 'ISSUED'
  if (paidAmount >= invoice.amount) {
    newStatus = 'PAID'
  } else if (paidAmount > BigInt(0)) {
    newStatus = 'PARTIALLY_PAID'
  }

  await tx.update(financeInvoices).set({ status: newStatus, updatedAt: new Date() }).where(eq(financeInvoices.id, invoiceId))
}

export async function confirmPayment(paymentId: number, confirmedBy: number): Promise<void> {
  await financeDb.transaction(async (tx) => {
    const [payment] = await tx.select().from(financePayments).where(eq(financePayments.id, paymentId))
    if (!payment) throw new Error('Payment not found')
    if (payment.status !== 'PENDING') throw new Error('Payment is not in PENDING state')

    // Verify destination account
    const [account] = await tx.select().from(financeAccounts).where(and(eq(financeAccounts.id, payment.destinationAccountId!), eq(financeAccounts.accountType, 'ASSET'), eq(financeAccounts.isActive, true)))
    if (!account) throw new Error('Destination account is not an active ASSET account')

    // Verify allocations
    const allocations = await tx.select().from(financePaymentAllocations).where(eq(financePaymentAllocations.paymentId, paymentId))
    const allocatedTotal = allocations.reduce((sum, a) => sum + BigInt(a.allocatedAmount), BigInt(0))
    if (allocatedTotal !== payment.amount) {
      throw new Error(`Cannot confirm: payment amount is ${payment.amount} but allocations total ${allocatedTotal}. Full allocation is required.`)
    }

    const journalLines: any[] = []
    
    // Process each allocation
    for (const alloc of allocations) {
      // Lock invoice
      const invoiceResult = await tx.execute(sql`SELECT * FROM finance_invoices WHERE id = ${alloc.invoiceId} FOR UPDATE`)
      const invoice = invoiceResult.rows[0] as any
      if (!invoice) throw new Error(`Invoice ${alloc.invoiceId} not found`)
      if (invoice.status === 'DRAFT' || invoice.status === 'CANCELLED' || invoice.status === 'PAID') {
        throw new Error(`Cannot confirm payment against invoice ${invoice.id} with status ${invoice.status}`)
      }

      // Calculate existing paid amount
      const existingAllocs = await tx.select({
        allocatedAmount: financePaymentAllocations.allocatedAmount
      })
      .from(financePaymentAllocations)
      .innerJoin(financePayments, eq(financePayments.id, financePaymentAllocations.paymentId))
      .where(and(eq(financePaymentAllocations.invoiceId, invoice.id), eq(financePayments.status, 'CONFIRMED')))

      const existingPaid = existingAllocs.reduce((sum: bigint, a: any) => sum + BigInt(a.allocatedAmount), BigInt(0))
      
      const newPaid = existingPaid + BigInt(alloc.allocatedAmount)
      if (newPaid > BigInt(invoice.amount)) {
        throw new Error(`Overpayment: Invoice ${invoice.id} amount is ${invoice.amount}, already paid ${existingPaid}, allocation is ${alloc.allocatedAmount}`)
      }

      // Find Fee Type to get fund & accounts
      const [feeType] = await tx.select().from(financeFeeTypes).where(eq(financeFeeTypes.id, invoice.fee_type_id))
      if (!feeType || !feeType.isActive) throw new Error(`Fee Type for invoice ${invoice.id} is inactive or missing`)
      if (!feeType.receivableAccountId) throw new Error(`Fee Type ${feeType.id} missing receivable account`)
      if (!feeType.defaultFundId) throw new Error(`Fee Type ${feeType.id} missing default fund`)

      // Add Credit Line (Receivable)
      journalLines.push({
        accountId: feeType.receivableAccountId,
        fundId: feeType.defaultFundId,
        debit: BigInt(0),
        credit: BigInt(alloc.allocatedAmount),
        description: `Payment applied to invoice ${invoice.invoice_number}`
      })

      // Add Debit Line (Cash/Bank) - split by Fund
      journalLines.push({
        accountId: payment.destinationAccountId,
        fundId: feeType.defaultFundId,
        debit: BigInt(alloc.allocatedAmount),
        credit: BigInt(0),
        description: `Payment received for invoice ${invoice.invoice_number}`
      })
    }

    // Consolidate journal lines if possible (same account + fund + type)
    const consolidatedLines: any[] = []
    for (const line of journalLines) {
      const existing = consolidatedLines.find(l => l.accountId === line.accountId && l.fundId === line.fundId && ((l.debit > BigInt(0) && line.debit > BigInt(0)) || (l.credit > BigInt(0) && line.credit > BigInt(0))))
      if (existing) {
        existing.debit += line.debit
        existing.credit += line.credit
        existing.description = `Payment received (Consolidated)`
      } else {
        consolidatedLines.push(line)
      }
    }

    // Post to ledger
    await postJournalEntry({
      transactionDate: new Date(),
      description: `Payment confirmation for ${payment.paymentNumber}`,
      sourceType: 'PAYMENT',
      sourceId: paymentId,
      sourceEvent: 'CONFIRM',
      createdBy: confirmedBy,
      lines: consolidatedLines
    }, tx)

    // Mark confirmed
    await tx.update(financePayments).set({ status: 'CONFIRMED', confirmedBy, updatedAt: new Date() }).where(eq(financePayments.id, paymentId))

    // Reconcile invoices
    const uniqueInvoiceIds = [...new Set(allocations.map(a => a.invoiceId))]
    for (const invId of uniqueInvoiceIds) {
      await reconcileInvoiceStatus(invId, tx)
    }

    await tx.insert(auditLogs).values({
      actorUserId: confirmedBy,
      action: 'PAYMENT_CONFIRM',
      entityType: 'PAYMENT',
      entityId: paymentId,
      newValues: serializeForAudit({ status: 'CONFIRMED' }),
    })
  })
}

export async function refundPayment(paymentId: number, refundedBy: number) {
  await financeDb.transaction(async (tx) => {
    const [payment] = await tx.select().from(financePayments).where(eq(financePayments.id, paymentId))
    if (!payment) throw new Error('Payment not found')
    if (payment.status !== 'CONFIRMED') throw new Error('Only CONFIRMED payments can be refunded')

    // Find original journal entry
    const [journal] = await tx.select().from(financeJournalEntries).where(and(eq(financeJournalEntries.sourceType, 'PAYMENT'), eq(financeJournalEntries.sourceId, paymentId), eq(financeJournalEntries.sourceEvent, 'CONFIRM')))
    if (!journal) throw new Error('Original payment journal not found')

    // Reverse it
    await reverseJournalEntry(journal.id, refundedBy, tx)

    // Mark payment REFUNDED
    await tx.update(financePayments).set({ status: 'REFUNDED', updatedAt: new Date() }).where(eq(financePayments.id, paymentId))

    // Reconcile invoices
    const allocations = await tx.select().from(financePaymentAllocations).where(eq(financePaymentAllocations.paymentId, paymentId))
    const uniqueInvoiceIds = [...new Set(allocations.map(a => a.invoiceId))]
    for (const invId of uniqueInvoiceIds) {
      await reconcileInvoiceStatus(invId, tx)
    }

    await tx.insert(auditLogs).values({
      actorUserId: refundedBy,
      action: 'PAYMENT_REFUND',
      entityType: 'PAYMENT',
      entityId: paymentId,
      newValues: serializeForAudit({ status: 'REFUNDED' }),
    })
  })
}
