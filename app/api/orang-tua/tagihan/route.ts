import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { db } from '@/lib/db/client'
import { studentParents } from '@/drizzle/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { hasPermission } from '@/lib/auth/rbac'
import { normalizeStudentId } from '@/lib/guardians/parent-context'
import { getStudentInvoices } from '@/lib/finance/queries/parent-finance'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const canReadOwn = await hasPermission(session as any, 'finance.billing.read_own_children')
  if (!canReadOwn) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const searchParams = req.nextUrl.searchParams
  const rawChildId = searchParams.get('child_id')
  const academicYearIdStr = searchParams.get('academicYearId')
  const academicYearId = academicYearIdStr ? parseInt(academicYearIdStr) : undefined

  // Find linked students strictly with can_view_finance = true
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

  const allowedStudentIds = linkedStudents.map(s => s.studentId)

  if (rawChildId) {
    const normalizedChildId = normalizeStudentId(rawChildId)
    const childIdNum = normalizedChildId ? parseInt(normalizedChildId) : null
    
    if (!childIdNum || !allowedStudentIds.includes(childIdNum)) {
      return NextResponse.json({ error: 'Akses ditolak: Anda tidak memiliki akses finansial untuk santri ini.' }, { status: 403 })
    }

    const items = await getStudentInvoices(childIdNum, academicYearId)
    return NextResponse.json(items)
  }

  // All authorized children
  const allItems = await Promise.all(
    allowedStudentIds.map(sId => getStudentInvoices(sId, academicYearId))
  )
  const flattened = allItems.flat().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return NextResponse.json(flattened)
}
