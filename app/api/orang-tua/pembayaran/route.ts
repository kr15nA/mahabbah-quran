import { NextResponse } from 'next/server'
import { requireAuth, hasPermission } from '@/lib/auth/rbac'
import { canAccessStudentFinance } from '@/lib/finance/authorization'
import { db } from '@/lib/db/client'
import { financePayments, students } from '@/drizzle/schema'
import { eq, desc, inArray } from 'drizzle-orm'
import { getChildrenByParent } from '@/lib/db/queries/student-parents'

export async function GET(request: Request) {
  try {
    const { session, role } = await requireAuth()
    const isParent = await hasPermission(session, 'finance.billing.read_own_children')
    if (!isParent && role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let allowedStudentIds: number[] = []

    if (role === 'SUPER_ADMIN') {
      // For testing/admin convenience
      const all = await db.select({ id: students.id }).from(students)
      allowedStudentIds = all.map(s => s.id)
    } else {
      const children = await getChildrenByParent(session.userId)
      allowedStudentIds = children.map(c => c.id)
    }

    if (allowedStudentIds.length === 0) {
      return NextResponse.json({ data: [] })
    }

    const payments = await db.select({
      id: financePayments.id,
      paymentNumber: financePayments.paymentNumber,
      amount: financePayments.amount,
      paymentDate: financePayments.paymentDate,
      paymentMethod: financePayments.paymentMethod,
      status: financePayments.status,
      studentName: students.fullName,
      studentId: students.id
    })
    .from(financePayments)
    .innerJoin(students, eq(students.id, financePayments.studentId))
    .where(inArray(financePayments.studentId, allowedStudentIds))
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
