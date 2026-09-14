import { financeDb } from './tx'
import { financeInvoices, financePayments, financePaymentAllocations, auditLogs } from '@/drizzle/schema'
import { eq, sum } from 'drizzle-orm'

export async function allocatePaymentToInvoice(
  paymentId: number,
  invoiceId: number,
  allocatedAmount: bigint
): Promise<void> {
  await financeDb.transaction(async (tx) => {
    // Basic checks
    if (allocatedAmount <= BigInt(0)) throw new Error('Allocation amount must be greater than 0')

    const [payment] = await tx.select().from(financePayments).where(eq(financePayments.id, paymentId)).limit(1)
    const [invoice] = await tx.select().from(financeInvoices).where(eq(financeInvoices.id, invoiceId)).limit(1)

    if (!payment) throw new Error('Payment not found')
    if (!invoice) throw new Error('Invoice not found')
    if (payment.studentId !== invoice.studentId) throw new Error('Payment and Invoice belong to different students')
    if (payment.status === 'CANCELLED' || payment.status === 'REFUNDED') throw new Error('Cannot allocate from cancelled/refunded payment')
    if (invoice.status === 'CANCELLED') throw new Error('Cannot allocate to cancelled invoice')

    // Check payment total allocation
    const paymentAllocs = await tx.select().from(financePaymentAllocations).where(eq(financePaymentAllocations.paymentId, paymentId))
    const totalAllocatedPayment = paymentAllocs.reduce((acc, curr) => acc + curr.allocatedAmount, BigInt(0))
    if (totalAllocatedPayment + allocatedAmount > payment.amount) {
      throw new Error('Total payment allocations exceed payment amount')
    }

    // Check invoice total allocation
    const invoiceAllocs = await tx.select().from(financePaymentAllocations).where(eq(financePaymentAllocations.invoiceId, invoiceId))
    const totalAllocatedInvoice = invoiceAllocs.reduce((acc, curr) => acc + curr.allocatedAmount, BigInt(0))
    if (totalAllocatedInvoice + allocatedAmount > invoice.amount) {
      throw new Error('Total invoice allocations exceed invoice amount')
    }

    // Insert allocation
    await tx.insert(financePaymentAllocations).values({
      paymentId,
      invoiceId,
      allocatedAmount
    })

    // Update invoice status based on total allocated
    const newInvoiceTotal = totalAllocatedInvoice + allocatedAmount
    const newStatus = newInvoiceTotal >= invoice.amount ? 'PAID' : 'PARTIALLY_PAID'
    
    await tx.update(financeInvoices)
      .set({      status: newStatus,
      updatedAt: new Date()
    }).where(eq(financeInvoices.id, invoiceId))

    await tx.insert(auditLogs).values({
      actorUserId: 1, // System or current user if passed
      action: 'ALLOCATE',
      entityType: 'PAYMENT_ALLOCATION',
      entityId: paymentId,
      newValues: { invoiceId, allocatedAmount },
    })
  })
}
