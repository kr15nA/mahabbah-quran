import { NextResponse } from 'next/server'
import { requireAuth, hasPermission } from '@/lib/auth/rbac'
import { canAccessStudentFinance } from '@/lib/finance/authorization'
import { db } from '@/lib/db/client'
import { financePayments, financePaymentAllocations, financeInvoices, financeFeeTypes, students, users } from '@/drizzle/schema'
import { eq } from 'drizzle-orm'

export async function GET(request: Request, context: any) {
  try {
    const { session, role } = await requireAuth()
    const isParent = await hasPermission(session, 'finance.billing.read_own_children')
    if (!isParent && role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

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
      studentId: financePayments.studentId,
      receivedBy: users.fullName
    })
    .from(financePayments)
    .innerJoin(students, eq(students.id, financePayments.studentId))
    .leftJoin(users, eq(users.id, financePayments.receivedBy))
    .where(eq(financePayments.id, paymentId))

    if (!payment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const canAccess = await canAccessStudentFinance(session, payment.studentId)
    if (!canAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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
