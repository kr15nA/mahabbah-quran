import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/auth/rbac'
import { createPayment } from '@/lib/finance/payment'
import { db } from '@/lib/db/client'
import { financePayments, students, financeAccounts } from '@/drizzle/schema'
import { eq, desc, and } from 'drizzle-orm'
import { z } from 'zod'

const createSchema = z.object({
  studentId: z.number().int().positive(),
  amount: z.string().regex(/^\d+$/),
  paymentDate: z.string(),
  paymentMethod: z.string(),
  destinationAccountId: z.number().int().positive(),
  referenceNumber: z.string().optional(),
  notes: z.string().optional()
})

export async function GET(request: Request) {
  try {
    await requirePermission('finance.payment.view')
    
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    const status = searchParams.get('status')
    
    let conditions = undefined
    if (studentId) conditions = eq(financePayments.studentId, Number(studentId))
    if (status) conditions = conditions ? and(conditions, eq(financePayments.status, status)) : eq(financePayments.status, status)
    
    const payments = await db.select({
      id: financePayments.id,
      paymentNumber: financePayments.paymentNumber,
      amount: financePayments.amount,
      paymentDate: financePayments.paymentDate,
      paymentMethod: financePayments.paymentMethod,
      status: financePayments.status,
      studentName: students.fullName,
      destinationAccountName: financeAccounts.name
    })
    .from(financePayments)
    .innerJoin(students, eq(students.id, financePayments.studentId))
    .leftJoin(financeAccounts, eq(financeAccounts.id, financePayments.destinationAccountId))
    .where(conditions)
    .orderBy(desc(financePayments.createdAt))

    return NextResponse.json({
      data: payments.map(p => ({
        ...p,
        amount: String(p.amount)
      }))
    })
  } catch (err: any) {
    if (err.name === 'AuthError') return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { session } = await requirePermission('finance.payment.manage')
    const body = await request.json()
    const parsed = createSchema.parse(body)

    const paymentId = await createPayment({
      ...parsed,
      amount: BigInt(parsed.amount),
      receivedBy: session.userId
    })

    return NextResponse.json({ id: paymentId }, { status: 201 })
  } catch (err: any) {
    if (err.name === 'AuthError') return NextResponse.json({ error: err.message }, { status: err.status })
    if (err instanceof z.ZodError) return NextResponse.json({ error: (err as any).errors || (err as any).issues }, { status: 400 })
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 400 })
  }
}
