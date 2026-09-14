import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '../../../../lib/auth/rbac'
import { db } from '../../../../lib/db/client'
import { financeDisbursements, financeCategories, financeFunds, users } from '../../../../drizzle/schema'
import { createDisbursementDraft } from '../../../../lib/finance/disbursement'
import { desc, eq, and, sql } from 'drizzle-orm'
import { z } from 'zod'

const createSchema = z.object({
  fundId: z.number().positive(),
  categoryId: z.number().positive(),
  amount: z.string().min(1),
  transactionDate: z.string(),
  description: z.string().min(1),
  beneficiaryName: z.string().nullable().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const { session } = await requirePermission('finance.disbursement.view')
    
    // In a real application, you would parse searchParams to filter list.
    // For V1, we'll return a simple list.
    
    const records = await db.select({
      id: financeDisbursements.id,
      disbursementNumber: financeDisbursements.disbursementNumber,
      amount: financeDisbursements.amount,
      transactionDate: financeDisbursements.transactionDate,
      description: financeDisbursements.description,
      beneficiaryName: financeDisbursements.beneficiaryName,
      status: financeDisbursements.status,
      categoryName: financeCategories.name,
      fundName: financeFunds.name,
      requesterName: users.fullName,
    })
    .from(financeDisbursements)
    .leftJoin(financeCategories, eq(financeDisbursements.categoryId, financeCategories.id))
    .leftJoin(financeFunds, eq(financeDisbursements.fundId, financeFunds.id))
    .leftJoin(users, eq(financeDisbursements.requestedBy, users.id))
    .orderBy(desc(financeDisbursements.createdAt))
    .limit(50)

    const serialized = records.map(r => ({
      ...r,
      amount: typeof r.amount === 'bigint' ? r.amount.toString() : r.amount
    }))

    return NextResponse.json(serialized)
  } catch (error: any) {
    console.error('GET /api/finance/disbursements error:', error)
    return NextResponse.json({ error: error.message }, { status: error.status || 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session } = await requirePermission('finance.disbursement.manage')
    const body = await req.json()
    const data = createSchema.parse(body)

    const disbursement = await createDisbursementDraft({
      fundId: data.fundId,
      categoryId: data.categoryId,
      amount: data.amount,
      transactionDate: data.transactionDate,
      description: data.description,
      beneficiaryName: data.beneficiaryName || null
    }, session.userId)

    const serialized = {
      ...disbursement,
      amount: typeof disbursement.amount === 'bigint' ? disbursement.amount.toString() : disbursement.amount
    }

    return NextResponse.json(serialized, { status: 201 })
  } catch (error: any) {
    if (error.name === 'ZodError') return NextResponse.json({ error: error.errors }, { status: 400 })
    return NextResponse.json({ error: error.message }, { status: error.status || 500 })
  }
}
