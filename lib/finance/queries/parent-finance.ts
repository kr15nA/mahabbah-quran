import { db } from '@/lib/db/client'
import {
  financeInvoices,
  financeFeeTypes,
  financePayments,
  financePaymentAllocations,
  financeInvoiceScholarships,
  students,
} from '@/drizzle/schema'
import { eq, and, desc, inArray } from 'drizzle-orm'
import { calculateInvoiceBalance } from '../invoice-balance'
import { serializeAmountForApi } from '../utils'
import { canAccessStudentFinance } from '../authorization'

export type ParentInvoiceListItem = {
  id: number
  invoiceNumber: string
  studentId: number
  studentName: string
  feeTypeId: number
  feeTypeName: string
  period: string | null
  description: string | null
  dueDate: string
  status: string
  grossAmount: string
  scholarshipAmount: string
  netPayable: string
  paidAmount: string
  outstandingAmount: string
  createdAt: Date
}

export type ParentPaymentListItem = {
  id: number
  paymentNumber: string
  paymentDate: string
  amount: string
  paymentMethod: string
  referenceNumber: string | null
  status: string
  studentId: number
  studentName: string
  allocations: {
    id: number
    invoiceId: number
    invoiceNumber: string
    feeTypeName: string
    period: string | null
    allocatedAmount: string
  }[]
}

export async function getParentInvoicesForStudent(
  parentId: number,
  studentId: number,
  academicYearId?: number
): Promise<ParentInvoiceListItem[]> {
  const hasAccess = await canAccessStudentFinance({ userId: parentId, role: 'orang_tua' }, studentId)
  if (!hasAccess) {
    throw new Error('Akses ditolak: Anda tidak memiliki hak akses finansial untuk santri ini')
  }

  return await getStudentInvoices(studentId, academicYearId)
}

export async function getStudentInvoices(
  studentId: number,
  academicYearId?: number
): Promise<ParentInvoiceListItem[]> {
  const conditions = [
    eq(financeInvoices.studentId, studentId),
  ]
  if (academicYearId) {
    conditions.push(eq(financeInvoices.academicYearId, academicYearId))
  }

  const invoices = await db
    .select({
      id: financeInvoices.id,
      invoiceNumber: financeInvoices.invoiceNumber,
      studentId: financeInvoices.studentId,
      studentName: students.fullName,
      feeTypeId: financeInvoices.feeTypeId,
      feeTypeName: financeFeeTypes.name,
      period: financeInvoices.period,
      description: financeInvoices.description,
      amount: financeInvoices.amount,
      dueDate: financeInvoices.dueDate,
      status: financeInvoices.status,
      createdAt: financeInvoices.createdAt,
    })
    .from(financeInvoices)
    .innerJoin(students, eq(students.id, financeInvoices.studentId))
    .innerJoin(financeFeeTypes, eq(financeFeeTypes.id, financeInvoices.feeTypeId))
    .where(and(...conditions))
    .orderBy(desc(financeInvoices.createdAt))

  const visible = invoices.filter(i => i.status !== 'DRAFT')
  if (visible.length === 0) return []

  const invoiceIds = visible.map(i => i.id)

  const allocations = await db
    .select({
      invoiceId: financePaymentAllocations.invoiceId,
      allocatedAmount: financePaymentAllocations.allocatedAmount,
    })
    .from(financePaymentAllocations)
    .innerJoin(financePayments, eq(financePayments.id, financePaymentAllocations.paymentId))
    .where(
      and(
        inArray(financePaymentAllocations.invoiceId, invoiceIds),
        eq(financePayments.status, 'CONFIRMED')
      )
    )

  const paidMap = new Map<number, bigint>()
  for (const alloc of allocations) {
    const cur = paidMap.get(alloc.invoiceId) || BigInt(0)
    paidMap.set(alloc.invoiceId, cur + alloc.allocatedAmount)
  }

  const scholarships = await db
    .select({
      invoiceId: financeInvoiceScholarships.invoiceId,
      scholarshipAmount: financeInvoiceScholarships.scholarshipAmount,
    })
    .from(financeInvoiceScholarships)
    .where(inArray(financeInvoiceScholarships.invoiceId, invoiceIds))

  const scholarshipMap = new Map<number, bigint>()
  for (const s of scholarships) {
    scholarshipMap.set(s.invoiceId, s.scholarshipAmount)
  }

  return visible.map(inv => {
    const grossAmount = inv.amount
    const scholarshipAmount = scholarshipMap.get(inv.id) || BigInt(0)
    const paidAmount = paidMap.get(inv.id) || BigInt(0)
    const balance = calculateInvoiceBalance({
      grossAmount,
      scholarshipAmount,
      paidAmount,
    })

    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      studentId: inv.studentId,
      studentName: inv.studentName,
      feeTypeId: inv.feeTypeId,
      feeTypeName: inv.feeTypeName,
      period: inv.period,
      description: inv.description,
      dueDate: inv.dueDate,
      status: inv.status,
      grossAmount: serializeAmountForApi(balance.grossAmount),
      scholarshipAmount: serializeAmountForApi(balance.scholarshipAmount),
      netPayable: serializeAmountForApi(balance.netPayable),
      paidAmount: serializeAmountForApi(balance.paidAmount),
      outstandingAmount: serializeAmountForApi(balance.outstandingAmount),
      createdAt: inv.createdAt,
    }
  })
}

export async function getParentPaymentsForStudent(
  parentId: number,
  studentId: number
): Promise<ParentPaymentListItem[]> {
  const hasAccess = await canAccessStudentFinance({ userId: parentId, role: 'orang_tua' }, studentId)
  if (!hasAccess) {
    throw new Error('Akses ditolak: Anda tidak memiliki hak akses finansial untuk santri ini')
  }

  return await getStudentPayments(studentId)
}

export async function getStudentPayments(
  studentId: number
): Promise<ParentPaymentListItem[]> {
  const payments = await db
    .select({
      id: financePayments.id,
      paymentNumber: financePayments.paymentNumber,
      paymentDate: financePayments.paymentDate,
      amount: financePayments.amount,
      paymentMethod: financePayments.paymentMethod,
      referenceNumber: financePayments.referenceNumber,
      status: financePayments.status,
      studentId: financePayments.studentId,
      studentName: students.fullName,
      createdAt: financePayments.createdAt,
    })
    .from(financePayments)
    .innerJoin(students, eq(students.id, financePayments.studentId))
    .where(eq(financePayments.studentId, studentId))
    .orderBy(desc(financePayments.paymentDate), desc(financePayments.id))

  if (payments.length === 0) return []

  const paymentIds = payments.map(p => p.id)

  const allocations = await db
    .select({
      id: financePaymentAllocations.id,
      paymentId: financePaymentAllocations.paymentId,
      invoiceId: financeInvoices.id,
      invoiceNumber: financeInvoices.invoiceNumber,
      feeTypeName: financeFeeTypes.name,
      period: financeInvoices.period,
      allocatedAmount: financePaymentAllocations.allocatedAmount,
    })
    .from(financePaymentAllocations)
    .innerJoin(financeInvoices, eq(financeInvoices.id, financePaymentAllocations.invoiceId))
    .innerJoin(financeFeeTypes, eq(financeFeeTypes.id, financeInvoices.feeTypeId))
    .where(inArray(financePaymentAllocations.paymentId, paymentIds))

  const allocMap = new Map<number, any[]>()
  for (const a of allocations) {
    const list = allocMap.get(a.paymentId) || []
    list.push({
      id: a.id,
      invoiceId: a.invoiceId,
      invoiceNumber: a.invoiceNumber,
      feeTypeName: a.feeTypeName,
      period: a.period,
      allocatedAmount: serializeAmountForApi(a.allocatedAmount),
    })
    allocMap.set(a.paymentId, list)
  }

  return payments.map(p => ({
    id: p.id,
    paymentNumber: p.paymentNumber,
    paymentDate: p.paymentDate,
    amount: serializeAmountForApi(p.amount),
    paymentMethod: p.paymentMethod,
    referenceNumber: p.referenceNumber,
    status: p.status,
    studentId: p.studentId,
    studentName: p.studentName,
    allocations: allocMap.get(p.id) || [],
  }))
}
