import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth/rbac'
import { updatePayment } from '@/lib/finance/payment'
import { db } from '@/lib/db/client'
import { financePayments, financePaymentAllocations, financeInvoices, financeFeeTypes, students, financeAccounts, users } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const updateSchema = z.object({
  amount: z.string().regex(/^\d+$/).optional(),
  paymentDate: z.string().optional(),
  paymentMethod: z.string().optional(),
  destinationAccountId: z.number().int().positive().optional(),
  referenceNumber: z.string().optional(),
  notes: z.string().optional()
})

export async function GET(request: Request, context: any) {
  try {
    await requirePermission('finance.payment.view')
    
    // In Next 15 App router with Turbopack, context.params should be awaited if we want to be safe,
    // but in Page Router or Next 13-14 it's sync. In Next 15 it's a promise, we await it.
    const { id } = await Promise.resolve(context.params)
    const paymentId = Number(id)

    const [payment] = await db.select({
      id: financePayments.id,
      paymentNumber: financePayments.paymentNumber,
      amount: financePayments.amount,
      paymentDate: financePayments.paymentDate,
      paymentMethod: financePayments.paymentMethod,
      referenceNumber: financePayments.referenceNumber,
      notes: financePayments.notes,
      status: financePayments.status,
      studentId: financePayments.studentId,
      destinationAccountId: financePayments.destinationAccountId,
      studentName: students.fullName,
      destinationAccountName: financeAccounts.name,
      receivedBy: users.fullName
    })
    .from(financePayments)
    .innerJoin(students, eq(students.id, financePayments.studentId))
    .leftJoin(financeAccounts, eq(financeAccounts.id, financePayments.destinationAccountId))
    .leftJoin(users, eq(users.id, financePayments.receivedBy))
    .where(eq(financePayments.id, paymentId))

    if (!payment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const allocations = await db.select({
      id: financePaymentAllocations.id,
      invoiceId: financePaymentAllocations.invoiceId,
      allocatedAmount: financePaymentAllocations.allocatedAmount,
      invoiceNumber: financeInvoices.invoiceNumber,
      feeTypeName: financeFeeTypes.name,
      period: financeInvoices.period
    })
    .from(financePaymentAllocations)
    .innerJoin(financeInvoices, eq(financeInvoices.id, financePaymentAllocations.invoiceId))
    .innerJoin(financeFeeTypes, eq(financeFeeTypes.id, financeInvoices.feeTypeId))
    .where(eq(financePaymentAllocations.paymentId, paymentId))

    return NextResponse.json({
      data: {
        ...payment,
        amount: String(payment.amount),
        allocations: allocations.map(a => ({
          ...a,
          allocatedAmount: String(a.allocatedAmount)
        }))
      }
    })
  } catch (err: any) {
    if (err.name === 'AuthError') return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(request: Request, context: any) {
  try {
    const { session } = await requirePermission('finance.payment.manage')
    const { id } = await Promise.resolve(context.params)
    const paymentId = Number(id)
    
    const body = await request.json()
    const parsed = updateSchema.parse(body)

    const updateData: any = { ...parsed }
    if (parsed.amount) updateData.amount = BigInt(parsed.amount)

    await updatePayment(paymentId, updateData, session.userId)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    if (err.name === 'AuthError') return NextResponse.json({ error: err.message }, { status: err.status })
    if (err instanceof z.ZodError) return NextResponse.json({ error: (err as any).errors || (err as any).issues }, { status: 400 })
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 400 })
  }
}
