'use strict'
'use server'

import { requirePermission } from '@/lib/auth/rbac'
import { revalidatePath } from 'next/cache'
import { 
  createScholarshipProgram, 
  updateScholarshipProgramDraft, 
  activateScholarshipProgram, 
  deactivateScholarshipProgram,
  setScholarshipProgramAccounting
} from '@/lib/finance/scholarships/programs'
import {
  assignStudentScholarship,
  updateStudentScholarship,
  revokeStudentScholarship
} from '@/lib/finance/scholarships/awards'
import { parsePercentageToBasisPoints, parseRupiahToBigInt } from '@/lib/finance/utils'

export async function createScholarshipProgramAction(formData: FormData) {
  const { session } = await requirePermission('finance.billing.manage')

  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const calculationType = formData.get('calculationType') as 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FULL'
  
  const percentageStr = formData.get('percentage') as string
  const fixedAmountStr = formData.get('fixedAmount') as string
  
  const feeTypeIds = formData.getAll('feeTypeIds').map(id => Number(id))
  
  // Minimal validation
  if (!name) throw new Error('Nama program wajib diisi')
  if (!calculationType) throw new Error('Jenis perhitungan wajib dipilih')
  if (feeTypeIds.length === 0) throw new Error('Program harus mencakup minimal satu jenis biaya')

  let percentageBasisPoints: number | null = null
  let fixedAmount: bigint | null = null

  if (calculationType === 'PERCENTAGE') {
    if (!percentageStr) throw new Error('Persentase wajib diisi')
    percentageBasisPoints = parsePercentageToBasisPoints(percentageStr)
  } else if (calculationType === 'FIXED_AMOUNT') {
    if (!fixedAmountStr) throw new Error('Nominal wajib diisi')
    fixedAmount = parseRupiahToBigInt(fixedAmountStr)
  }

  const id = await createScholarshipProgram({
    name,
    description,
    calculationType,
    percentageBasisPoints,
    fixedAmount,
    feeTypeIds,
    createdBy: session.userId
  })

  // Optional: If they provided fund and account during creation, update the draft
  const fundingFundId = formData.get('fundingFundId')
  const scholarshipAccountId = formData.get('scholarshipAccountId')
  if (fundingFundId && scholarshipAccountId) {
    await setScholarshipProgramAccounting(id, Number(fundingFundId), Number(scholarshipAccountId), session.userId)
  }

  revalidatePath('/admin/keuangan/beasiswa')
  return id
}

export async function updateScholarshipProgramAction(id: number, formData: FormData) {
  const { session } = await requirePermission('finance.billing.manage')

  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const calculationType = formData.get('calculationType') as 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FULL'
  
  const percentageStr = formData.get('percentage') as string
  const fixedAmountStr = formData.get('fixedAmount') as string
  
  const feeTypeIds = formData.getAll('feeTypeIds').map(id => Number(id))
  const fundingFundId = formData.get('fundingFundId') ? Number(formData.get('fundingFundId')) : null
  const scholarshipAccountId = formData.get('scholarshipAccountId') ? Number(formData.get('scholarshipAccountId')) : null

  if (!name) throw new Error('Nama program wajib diisi')
  if (feeTypeIds.length === 0) throw new Error('Program harus mencakup minimal satu jenis biaya')

  let percentageBasisPoints: number | null = null
  let fixedAmount: bigint | null = null

  if (calculationType === 'PERCENTAGE') {
    if (!percentageStr) throw new Error('Persentase wajib diisi')
    percentageBasisPoints = parsePercentageToBasisPoints(percentageStr)
  } else if (calculationType === 'FIXED_AMOUNT') {
    if (!fixedAmountStr) throw new Error('Nominal wajib diisi')
    fixedAmount = parseRupiahToBigInt(fixedAmountStr)
  }

  await updateScholarshipProgramDraft(id, {
    name,
    description,
    calculationType,
    percentageBasisPoints,
    fixedAmount,
    feeTypeIds,
    fundingFundId,
    scholarshipAccountId
  }, session.userId)

  revalidatePath('/admin/keuangan/beasiswa')
  revalidatePath(`/admin/keuangan/beasiswa/${id}`)
}

export async function activateScholarshipProgramAction(id: number) {
  const { session } = await requirePermission('finance.billing.manage')
  await activateScholarshipProgram(id, session.userId)
  revalidatePath('/admin/keuangan/beasiswa')
  revalidatePath(`/admin/keuangan/beasiswa/${id}`)
}

export async function deactivateScholarshipProgramAction(id: number) {
  const { session } = await requirePermission('finance.billing.manage')
  await deactivateScholarshipProgram(id, session.userId)
  revalidatePath('/admin/keuangan/beasiswa')
  revalidatePath(`/admin/keuangan/beasiswa/${id}`)
}

export async function assignStudentScholarshipAction(formData: FormData) {
  const { session } = await requirePermission('finance.billing.manage')

  const studentId = Number(formData.get('studentId'))
  const scholarshipProgramId = Number(formData.get('scholarshipProgramId'))
  const academicYearId = Number(formData.get('academicYearId'))
  
  const startMonth = formData.get('startMonth') as string // Expected YYYY-MM
  const endMonth = formData.get('endMonth') as string // Expected YYYY-MM
  const notes = formData.get('notes') as string

  if (!studentId || !scholarshipProgramId || !academicYearId || !startMonth) {
    throw new Error('Semua field wajib harus diisi')
  }

  // Convert month to YYYY-MM-01 canonical date
  const startDate = `${startMonth}-01`
  const endDate = endMonth ? `${endMonth}-01` : null

  await assignStudentScholarship({
    studentId,
    scholarshipProgramId,
    academicYearId,
    startDate,
    endDate,
    notes,
    assignedBy: session.userId
  })

  revalidatePath('/admin/keuangan/beasiswa')
  revalidatePath(`/admin/santri/${studentId}`)
}

export async function updateStudentScholarshipAction(id: number, formData: FormData) {
  const { session } = await requirePermission('finance.billing.manage')

  const startMonth = formData.get('startMonth') as string // Expected YYYY-MM
  const endMonth = formData.get('endMonth') as string // Expected YYYY-MM
  const notes = formData.get('notes') as string

  if (!startMonth) {
    throw new Error('Bulan mulai wajib diisi')
  }

  const startDate = `${startMonth}-01`
  const endDate = endMonth ? `${endMonth}-01` : null

  await updateStudentScholarship(id, {
    startDate,
    endDate,
    notes
  }, session.userId)

  revalidatePath('/admin/keuangan/beasiswa')
}

export async function revokeStudentScholarshipAction(id: number, notes?: string) {
  const { session } = await requirePermission('finance.billing.manage')
  await revokeStudentScholarship(id, session.userId)
  revalidatePath('/admin/keuangan/beasiswa')
}

export async function searchStudentsAction(query: string) {
  await requirePermission('finance.billing.view')
  if (!query || query.length < 3) return []

  const { financeDb } = await import('@/lib/finance/tx')
  const { students } = await import('@/drizzle/schema')
  const { ilike, eq, and } = await import('drizzle-orm')

  const results = await financeDb.select({
    id: students.id,
    fullName: students.fullName,
  })
  .from(students)
  .where(
    and(
      eq(students.status, 'active'),
      ilike(students.fullName, `%${query}%`)
    )
  )
  .limit(10)

  return results
}

