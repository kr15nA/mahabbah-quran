import { db } from '@/lib/db/client'
import {
  financeInvoices,
  enrollments,
  academicYears,
  students,
  classes
} from '@/drizzle/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { createInvoiceDraft, issueInvoice } from './invoices'

export interface BulkGenerateInput {
  academicYearId: number
  feeTypeId: number
  period?: string | null
  description?: string
  amount: bigint
  dueDate: string
  createdBy: number

  // Filters
  studentIds?: number[]
  classId?: number
  programId?: number
  allActive?: boolean
}

export async function bulkGenerateInvoices(input: BulkGenerateInput) {
  // Find the active academic year (ensure it matches input.academicYearId and is active)
  const [year] = await db.select().from(academicYears).where(and(eq(academicYears.id, input.academicYearId), eq(academicYears.isActive, true)))
  if (!year) throw new Error('Target academic year is not active or does not exist')

  const filters = [
    eq(enrollments.academicYearId, input.academicYearId),
    eq(students.status, 'AKTIF')
  ]
  if (input.classId) filters.push(eq(classes.id, input.classId))
  if (input.programId) filters.push(eq(classes.programId, input.programId))
  if (input.studentIds && input.studentIds.length > 0) filters.push(inArray(students.id, input.studentIds))

  if (filters.length === 2 && !input.allActive) {
    throw new Error('Must provide a filter or explicitly select allActive')
  }

  // Find target students
  const targetStudents = await db.select({
    studentId: students.id
  })
  .from(students)
  .innerJoin(enrollments, eq(enrollments.studentId, students.id))
  .innerJoin(classes, eq(classes.id, enrollments.classId))
  .where(and(...filters))

  let created = 0
  let skipped_duplicate = 0
  let failed = 0

  for (const { studentId } of targetStudents) {
    try {
      await createInvoiceDraft({
        studentId,
        academicYearId: input.academicYearId,
        feeTypeId: input.feeTypeId,
        period: input.period,
        description: input.description,
        amount: input.amount,
        dueDate: input.dueDate,
        createdBy: input.createdBy
      })
      created++
    } catch (e: any) {
      if (String(e).includes('Duplicate recurring invoice detected') || String(e).includes('duplicate key value')) {
        skipped_duplicate++
      } else {
        console.error('Failed to generate draft for student', studentId, e)
        failed++
      }
    }
  }

  return { created, skipped_duplicate, failed }
}

export async function bulkIssueInvoices(invoiceIds: number[], issuedBy: number) {
  let issued = 0
  let skipped = 0
  let failed = 0

  for (const id of invoiceIds) {
    try {
      await issueInvoice(id, issuedBy)
      issued++
    } catch (e: any) {
      if (String(e).includes('Only DRAFT invoices can be issued') || String(e).includes('not found')) {
        skipped++
      } else {
        console.error('Failed to issue invoice', id, e)
        failed++
      }
    }
  }

  return { issued, skipped, failed }
}
