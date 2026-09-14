import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { hasPermission } from '@/lib/auth/rbac'
import { bulkGenerateInvoices } from '@/lib/finance/bulk-billing'
import { toBigIntSafely } from '@/lib/finance/utils'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const canManage = await hasPermission(session as any, 'finance.billing.manage')
  if (!canManage) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await req.json()

    if (!body.amount) return NextResponse.json({ error: 'Amount is required' }, { status: 400 })

    const input = {
      academicYearId: Number(body.academicYearId),
      feeTypeId: Number(body.feeTypeId),
      period: body.period,
      description: body.description,
      amount: toBigIntSafely(body.amount),
      dueDate: new Date(body.dueDate).toISOString().split('T')[0],
      createdBy: session.userId,
      studentIds: body.studentIds?.map(Number),
      classId: body.classId ? Number(body.classId) : undefined,
      programId: body.programId ? Number(body.programId) : undefined,
      allActive: body.allActive
    }

    const result = await bulkGenerateInvoices(input)
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 400 })
  }
}
