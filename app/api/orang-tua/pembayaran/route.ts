import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { hasPermission } from '@/lib/auth/rbac'
import { db } from '@/lib/db/client'
import { studentParents } from '@/drizzle/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { normalizeStudentId } from '@/lib/guardians/parent-context'
import { getStudentPayments } from '@/lib/finance/queries/parent-finance'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Explicitly restrict to parent context (Case A: parent-only endpoint)
    // Administrative payment inspection belongs on canonical /api/finance/payments
    if (session.role === 'admin') {
      return NextResponse.json(
        {
          error: 'Forbidden: Endpoint ini khusus konteks orang tua. Untuk akses pembayaran administratif, gunakan endpoint /api/finance/payments.',
          code: 'PARENT_CONTEXT_REQUIRED',
        },
        { status: 403 }
      )
    }

    if (session.role !== 'orang_tua') {
      return NextResponse.json(
        {
          error: 'Forbidden: Hanya akun orang tua yang diizinkan mengakses data pembayaran santri.',
          code: 'FORBIDDEN_ROLE',
        },
        { status: 403 }
      )
    }

    const canReadOwn = await hasPermission(session, 'finance.billing.read_own_children')
    if (!canReadOwn) {
      return NextResponse.json({ error: 'Forbidden: Akses finansial santri tidak tersedia.' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const rawChildId = searchParams.get('child_id')

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

    const allowedStudentIds = linked.map(s => s.studentId)

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
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
