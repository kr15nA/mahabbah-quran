import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth/rbac'
import { db } from '@/lib/db/client'
import { financePayments, financePaymentAllocations, financeInvoices, financeFeeTypes, students, users } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'

export async function GET(request: Request, context: any) {
  try {
    await requirePermission('finance.payment.view')
    
    const { id } = await Promise.resolve(context.params)
    const paymentId = Number(id)

    const [payment] = await db.select({
      id: financePayments.id,
      paymentNumber: financePayments.paymentNumber,
      amount: financePayments.amount,
      paymentDate: financePayments.paymentDate,
      paymentMethod: financePayments.paymentMethod,
      referenceNumber: financePayments.referenceNumber,
      status: financePayments.status,
      studentName: students.fullName,
      receivedBy: users.fullName
    })
    .from(financePayments)
    .innerJoin(students, eq(students.id, financePayments.studentId))
    .leftJoin(users, eq(users.id, financePayments.receivedBy))
    .where(eq(financePayments.id, paymentId))

    if (!payment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const allocations = await db.select({
      id: financePaymentAllocations.id,
      invoiceNumber: financeInvoices.invoiceNumber,
      feeTypeName: financeFeeTypes.name,
      period: financeInvoices.period,
      allocatedAmount: financePaymentAllocations.allocatedAmount
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
