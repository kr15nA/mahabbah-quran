import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { db } from '@/lib/db/client'
import { financeInvoices, studentParents } from '@/drizzle/schema'
import { eq, inArray, and, isNull } from 'drizzle-orm'
import { serializeAmountForApi } from '@/lib/finance/utils'
import { hasPermission } from '@/lib/auth/rbac'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const canReadOwn = await hasPermission(session as any, 'finance.billing.read_own_children')
  if (!canReadOwn) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Find linked students
  const linkedStudents = await db.select({ studentId: studentParents.studentId })
    .from(studentParents)
    .where(
      and(
        eq(studentParents.parentId, session.userId),
        eq(studentParents.isActive, true),
        isNull(studentParents.deletedAt),
        eq(studentParents.canViewFinance, true)
      )
    )

  if (linkedStudents.length === 0) {
    return NextResponse.json([])
  }

  const studentIds = linkedStudents.map(s => s.studentId)

  const items = await db.select()
    .from(financeInvoices)
    .where(inArray(financeInvoices.studentId, studentIds))

  // Hide DRAFT invoices from parents, they only see ISSUED, PARTIALLY_PAID, PAID, CANCELLED
  const visible = items.filter(i => i.status !== 'DRAFT')

  const serialized = visible.map(item => ({
    ...item,
    amount: serializeAmountForApi(item.amount)
  }))

  return NextResponse.json(serialized)
}
