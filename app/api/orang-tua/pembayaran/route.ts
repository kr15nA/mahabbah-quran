import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, hasPermission } from '@/lib/auth/rbac'
import { db } from '@/lib/db/client'
import { studentParents, students } from '@/drizzle/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { normalizeStudentId } from '@/lib/guardians/parent-context'
import { getStudentPayments } from '@/lib/finance/queries/parent-finance'

export async function GET(request: NextRequest) {
  try {
    const { session, role } = await requireAuth()
    const isParent = await hasPermission(session, 'finance.billing.read_own_children')
    if (!isParent && role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const rawChildId = searchParams.get('child_id')

    let allowedStudentIds: number[] = []

    if (role === 'SUPER_ADMIN') {
      const all = await db.select({ id: students.id }).from(students)
      allowedStudentIds = all.map(s => s.id)
    } else {
      const linked = await db.select({ studentId: studentParents.studentId })
        .from(studentParents)
        .where(
          and(
            eq(studentParents.parentId, session.userId),
            eq(studentParents.isActive, true),
            isNull(studentParents.deletedAt),
            eq(studentParents.canViewFinance, true)
          )
        )
      allowedStudentIds = linked.map(s => s.studentId)
    }

    if (allowedStudentIds.length === 0) {
      return NextResponse.json({ data: [] })
    }

    if (rawChildId) {
      const normalizedChildId = normalizeStudentId(rawChildId)
      const childIdNum = normalizedChildId ? parseInt(normalizedChildId) : null

      if (!childIdNum || !allowedStudentIds.includes(childIdNum)) {
        return NextResponse.json({ error: 'Akses ditolak: Anda tidak memiliki akses finansial untuk santri ini.' }, { status: 403 })
      }

      const payments = await getStudentPayments(childIdNum)
      return NextResponse.json({ data: payments })
    }

    // All authorized children
    const allPayments = await Promise.all(
      allowedStudentIds.map(sId => getStudentPayments(sId))
    )
    const flattened = allPayments.flat().sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())

    return NextResponse.json({ data: flattened })
  } catch (err: any) {
    if (err.name === 'AuthError') return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
