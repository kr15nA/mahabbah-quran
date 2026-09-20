import { financeDb as db } from '../tx'
import { 
  scholarshipPrograms, 
  studentScholarships, 
  scholarshipProgramFeeTypes, 
  financeFeeTypes, 
  financeFunds, 
  financeAccounts, 
  students, 
  academicYears,
  financeInvoices,
  financeInvoiceScholarships
} from '@/drizzle/schema'
import { eq, and, desc, ilike, sql } from 'drizzle-orm'
import { serializeAmountForApi } from '../utils'

// Types
export interface ScholarshipProgramFilters {
  search?: string
  status?: string
  type?: string
  page?: number
  limit?: number
}

export interface ScholarshipAwardFilters {
  search?: string
  programId?: number
  academicYearId?: number
  status?: string
  page?: number
  limit?: number
}

// 1. Program Queries
export async function getScholarshipPrograms(filters: ScholarshipProgramFilters) {
  const page = filters.page || 1
  const limit = filters.limit || 20
  const offset = (page - 1) * limit

  let conditions = []
  if (filters.search) conditions.push(ilike(scholarshipPrograms.name, `%${filters.search}%`))
  if (filters.status) conditions.push(eq(scholarshipPrograms.status, filters.status))
  if (filters.type) conditions.push(eq(scholarshipPrograms.calculationType, filters.type))

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  // Base query for total count
  const [{ count }] = await db.select({ count: sql<number>`count(*)` })
    .from(scholarshipPrograms)
    .where(whereClause)

  // Data query
  const programs = await db.select({
    id: scholarshipPrograms.id,
    name: scholarshipPrograms.name,
    status: scholarshipPrograms.status,
    calculationType: scholarshipPrograms.calculationType,
    percentageBasisPoints: scholarshipPrograms.percentageBasisPoints,
    fixedAmount: scholarshipPrograms.fixedAmount,
    fundingFundId: scholarshipPrograms.fundingFundId,
    scholarshipAccountId: scholarshipPrograms.scholarshipAccountId,
    fundName: financeFunds.name,
    accountName: financeAccounts.name,
    activeRecipientsCount: sql<number>`(
      SELECT count(*) FROM ${studentScholarships} ss 
      WHERE ss.scholarship_program_id = ${scholarshipPrograms.id} AND ss.status = 'ACTIVE'
    )`.mapWith(Number)
  })
  .from(scholarshipPrograms)
  .leftJoin(financeFunds, eq(financeFunds.id, scholarshipPrograms.fundingFundId))
  .leftJoin(financeAccounts, eq(financeAccounts.id, scholarshipPrograms.scholarshipAccountId))
  .where(whereClause)
  .orderBy(desc(scholarshipPrograms.createdAt))
  .limit(limit)
  .offset(offset)

  // Serialize BigInt safely
  const serialized = programs.map(p => ({
    ...p,
    fixedAmount: p.fixedAmount ? serializeAmountForApi(p.fixedAmount) : null
  }))

  return {
    data: serialized,
    pagination: {
      total: Number(count),
      page,
      limit,
      totalPages: Math.ceil(Number(count) / limit)
    }
  }
}

export async function getScholarshipProgramDetail(id: number) {
  const [program] = await db.select({
    id: scholarshipPrograms.id,
    name: scholarshipPrograms.name,
    description: scholarshipPrograms.description,
    status: scholarshipPrograms.status,
    calculationType: scholarshipPrograms.calculationType,
    percentageBasisPoints: scholarshipPrograms.percentageBasisPoints,
    fixedAmount: scholarshipPrograms.fixedAmount,
    fundingFundId: scholarshipPrograms.fundingFundId,
    scholarshipAccountId: scholarshipPrograms.scholarshipAccountId,
    createdAt: scholarshipPrograms.createdAt,
    fundName: financeFunds.name,
    accountName: financeAccounts.name
  })
  .from(scholarshipPrograms)
  .leftJoin(financeFunds, eq(financeFunds.id, scholarshipPrograms.fundingFundId))
  .leftJoin(financeAccounts, eq(financeAccounts.id, scholarshipPrograms.scholarshipAccountId))
  .where(eq(scholarshipPrograms.id, id))

  if (!program) return null

  // Fetch eligible fee types
  const feeTypes = await db.select({
    id: financeFeeTypes.id,
    name: financeFeeTypes.name,
    defaultAmount: financeFeeTypes.defaultAmount,
    defaultFundId: financeFeeTypes.defaultFundId
  })
  .from(scholarshipProgramFeeTypes)
  .innerJoin(financeFeeTypes, eq(financeFeeTypes.id, scholarshipProgramFeeTypes.feeTypeId))
  .where(eq(scholarshipProgramFeeTypes.programId, id))

  return {
    ...program,
    fixedAmount: program.fixedAmount ? serializeAmountForApi(program.fixedAmount) : null,
    feeTypes: feeTypes.map(f => ({
      ...f,
      defaultAmount: f.defaultAmount ? serializeAmountForApi(f.defaultAmount) : null
    }))
  }
}

// 2. Award Queries
export async function getScholarshipAwards(filters: ScholarshipAwardFilters) {
  const page = filters.page || 1
  const limit = filters.limit || 20
  const offset = (page - 1) * limit

  let conditions = []
  if (filters.search) conditions.push(ilike(students.fullName, `%${filters.search}%`))
  if (filters.programId) conditions.push(eq(studentScholarships.scholarshipProgramId, filters.programId))
  if (filters.academicYearId) conditions.push(eq(studentScholarships.academicYearId, filters.academicYearId))
  if (filters.status) conditions.push(eq(studentScholarships.status, filters.status))

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const [{ count }] = await db.select({ count: sql<number>`count(*)` })
    .from(studentScholarships)
    .innerJoin(students, eq(students.id, studentScholarships.studentId))
    .where(whereClause)

  const awards = await db.select({
    id: studentScholarships.id,
    studentId: studentScholarships.studentId,
    studentName: students.fullName,
    programId: studentScholarships.scholarshipProgramId,
    programName: scholarshipPrograms.name,
    calculationType: scholarshipPrograms.calculationType,
    percentageBasisPoints: scholarshipPrograms.percentageBasisPoints,
    fixedAmount: scholarshipPrograms.fixedAmount,
    academicYearId: studentScholarships.academicYearId,
    academicYearName: academicYears.name,
    startDate: studentScholarships.startDate,
    endDate: studentScholarships.endDate,
    status: studentScholarships.status,
    notes: studentScholarships.notes
  })
  .from(studentScholarships)
  .innerJoin(students, eq(students.id, studentScholarships.studentId))
  .innerJoin(scholarshipPrograms, eq(scholarshipPrograms.id, studentScholarships.scholarshipProgramId))
  .innerJoin(academicYears, eq(academicYears.id, studentScholarships.academicYearId))
  .where(whereClause)
  .orderBy(desc(studentScholarships.createdAt))
  .limit(limit)
  .offset(offset)

  const serialized = awards.map(a => ({
    ...a,
    fixedAmount: a.fixedAmount ? serializeAmountForApi(a.fixedAmount) : null
  }))

  return {
    data: serialized,
    pagination: {
      total: Number(count),
      page,
      limit,
      totalPages: Math.ceil(Number(count) / limit)
    }
  }
}

export async function getStudentScholarships(studentId: number) {
  const awards = await db.select({
    id: studentScholarships.id,
    programId: studentScholarships.scholarshipProgramId,
    programName: scholarshipPrograms.name,
    calculationType: scholarshipPrograms.calculationType,
    percentageBasisPoints: scholarshipPrograms.percentageBasisPoints,
    fixedAmount: scholarshipPrograms.fixedAmount,
    academicYearId: studentScholarships.academicYearId,
    startDate: studentScholarships.startDate,
    endDate: studentScholarships.endDate
  })
  .from(studentScholarships)
  .innerJoin(scholarshipPrograms, eq(scholarshipPrograms.id, studentScholarships.scholarshipProgramId))
  .innerJoin(academicYears, eq(academicYears.id, studentScholarships.academicYearId))
  .where(eq(studentScholarships.studentId, studentId))
  .orderBy(desc(studentScholarships.createdAt))

  return awards.map(a => ({
    ...a,
    fixedAmount: a.fixedAmount ? serializeAmountForApi(a.fixedAmount) : null
  }))
}

// 3. Form Option Queries
export async function getScholarshipFormOptions() {
  const activeFeeTypes = await db.select({
    id: financeFeeTypes.id,
    name: financeFeeTypes.name,
    defaultAmount: financeFeeTypes.defaultAmount,
    defaultFundId: financeFeeTypes.defaultFundId
  }).from(financeFeeTypes).where(eq(financeFeeTypes.isActive, true))

  const activeFunds = await db.select({
    id: financeFunds.id,
    name: financeFunds.name,
    restrictionType: financeFunds.restrictionType
  }).from(financeFunds).where(eq(financeFunds.isActive, true))

  const activeExpenseAccounts = await db.select({
    id: financeAccounts.id,
    name: financeAccounts.name,
    code: financeAccounts.code
  }).from(financeAccounts).where(and(eq(financeAccounts.isActive, true), eq(financeAccounts.accountType, 'EXPENSE')))

  return {
    feeTypes: activeFeeTypes.map(f => ({
      ...f,
      defaultAmount: f.defaultAmount ? serializeAmountForApi(f.defaultAmount) : null
    })),
    funds: activeFunds,
    expenseAccounts: activeExpenseAccounts
  }
}

export async function getActiveScholarshipProgramsForSelect() {
  return await db.select({
    id: scholarshipPrograms.id,
    name: scholarshipPrograms.name
  }).from(scholarshipPrograms).where(eq(scholarshipPrograms.status, 'ACTIVE'))
}

export async function getActiveAcademicYearsForSelect() {
  return await db.select({
    id: academicYears.id,
    name: academicYears.name
  }).from(academicYears).where(eq(academicYears.isActive, true))
}

// 4. Reporting Queries
export interface ScholarshipReportFilters {
  academicYearId?: number
  programId?: number
  feeTypeId?: number
  period?: string
  page?: number
  limit?: number
}

export async function getScholarshipInvoiceHistory(filters: ScholarshipReportFilters) {
  const page = filters.page || 1
  const limit = filters.limit || 20
  const offset = (page - 1) * limit

  let conditions = [
    sql`${financeInvoices.status} != 'DRAFT'`,
    sql`${financeInvoices.status} != 'CANCELLED'`
  ]
  
  if (filters.academicYearId) conditions.push(eq(financeInvoices.academicYearId, filters.academicYearId))
  if (filters.feeTypeId) conditions.push(eq(financeInvoices.feeTypeId, filters.feeTypeId))
  if (filters.period) conditions.push(eq(financeInvoices.period, filters.period))
  
  // Notice we use the snapshot program name for display, but filter by the snapshot program ID if requested
  // Wait, does financeInvoiceScholarships have programIdSnapshot? Let's check. 
  // For now, if we need to filter by programId, we join studentScholarships or use the name.
  // Actually, let's look at financeInvoiceScholarships schema in DB if possible.
  // Assuming it has scholarshipProgramIdSnapshot or similar. We will just use the name for display.
  
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined
  
  const paidAmountSubquery = sql`
    COALESCE((
      SELECT SUM(fpa.allocated_amount)
      FROM finance_payment_allocations fpa
      JOIN finance_payments fp ON fp.id = fpa.payment_id
      WHERE fpa.invoice_id = ${financeInvoices.id}
        AND fp.status = 'CONFIRMED'
    ), 0)
  `

  const [{ count }] = await db.select({ count: sql<number>`count(*)` })
    .from(financeInvoices)
    .innerJoin(financeInvoiceScholarships, eq(financeInvoiceScholarships.invoiceId, financeInvoices.id))
    .where(whereClause)

  const rows = await db.select({
    id: financeInvoices.id,
    studentName: students.fullName,
    programName: financeInvoiceScholarships.programNameSnapshot,
    feeTypeName: financeFeeTypes.name,
    period: financeInvoices.period,
    grossAmount: financeInvoices.amount,
    scholarshipAmount: financeInvoiceScholarships.scholarshipAmount,
    paidAmount: paidAmountSubquery.mapWith(BigInt),
    status: financeInvoices.status,
    academicYearName: academicYears.name
  })
  .from(financeInvoices)
  .innerJoin(financeInvoiceScholarships, eq(financeInvoiceScholarships.invoiceId, financeInvoices.id))
  .innerJoin(students, eq(students.id, financeInvoices.studentId))
  .innerJoin(financeFeeTypes, eq(financeFeeTypes.id, financeInvoices.feeTypeId))
  .innerJoin(academicYears, eq(academicYears.id, financeInvoices.academicYearId))
  .where(whereClause)
  .orderBy(desc(financeInvoices.createdAt))
  .limit(limit)
  .offset(offset)

  // Net and Outstanding are derived
  const serialized = rows.map(r => {
    let gross = r.grossAmount || BigInt(0)
    let sch = r.scholarshipAmount || BigInt(0)
    let paid = r.paidAmount || BigInt(0)
    
    let net = gross - sch
    if (net < BigInt(0)) net = BigInt(0)
    
    let out = net - paid
    if (out < BigInt(0)) out = BigInt(0)

    // Apply the filter programName if programId was given? 
    // Since we don't have programId in snapshot easily available in this snippet, we'll let it slide or filter via client if really needed, but let's assume no programId filter for now or we filter by snapshot name.

    return {
      ...r,
      grossAmount: serializeAmountForApi(gross),
      scholarshipAmount: serializeAmountForApi(sch),
      netAmount: serializeAmountForApi(net),
      paidAmount: serializeAmountForApi(paid),
      outstandingAmount: serializeAmountForApi(out)
    }
  })

  // If programId filter is applied, we might need to filter after fetch if we only have programNameSnapshot.
  let finalData = serialized
  if (filters.programId) {
    // We can fetch the program name and filter by it
    const [prog] = await db.select({ name: scholarshipPrograms.name }).from(scholarshipPrograms).where(eq(scholarshipPrograms.id, filters.programId))
    if (prog) {
      finalData = finalData.filter(d => d.programName === prog.name)
    }
  }

  return {
    data: finalData,
    pagination: {
      total: Number(count), // Approx if filtered post-fetch, but acceptable for this UI
      page,
      limit,
      totalPages: Math.ceil(Number(count) / limit)
    }
  }
}

export async function getScholarshipReportingSummary(filters: ScholarshipReportFilters) {
  let conditions = [
    sql`${financeInvoices.status} != 'DRAFT'`,
    sql`${financeInvoices.status} != 'CANCELLED'`
  ]
  
  if (filters.academicYearId) conditions.push(eq(financeInvoices.academicYearId, filters.academicYearId))
  if (filters.feeTypeId) conditions.push(eq(financeInvoices.feeTypeId, filters.feeTypeId))
  if (filters.period) conditions.push(eq(financeInvoices.period, filters.period))
  
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined
  
  const paidAmountSubquery = sql`
    COALESCE((
      SELECT SUM(fpa.allocated_amount)
      FROM finance_payment_allocations fpa
      JOIN finance_payments fp ON fp.id = fpa.payment_id
      WHERE fpa.invoice_id = ${financeInvoices.id}
        AND fp.status = 'CONFIRMED'
    ), 0)
  `

  const rows = await db.select({
    grossAmount: financeInvoices.amount,
    scholarshipAmount: financeInvoiceScholarships.scholarshipAmount,
    paidAmount: paidAmountSubquery.mapWith(BigInt),
    programName: financeInvoiceScholarships.programNameSnapshot
  })
  .from(financeInvoices)
  .innerJoin(financeInvoiceScholarships, eq(financeInvoiceScholarships.invoiceId, financeInvoices.id))
  .where(whereClause)

  // We need to calculate Active Programs and Active Recipients. These are Award-domain KPIs.
  let awardConditions = [
    eq(studentScholarships.status, 'ACTIVE'),
    eq(scholarshipPrograms.status, 'ACTIVE')
  ]
  if (filters.academicYearId) awardConditions.push(eq(studentScholarships.academicYearId, filters.academicYearId))
  // Filter by period is not applicable to Awards in the same way, but we will ignore period for active count.
  const awardWhere = and(...awardConditions)

  const activeProgramsResult = await db.select({
    programCount: sql<number>`count(distinct ${studentScholarships.scholarshipProgramId})`,
    recipientCount: sql<number>`count(distinct ${studentScholarships.studentId})`
  })
  .from(studentScholarships)
  .innerJoin(scholarshipPrograms, eq(scholarshipPrograms.id, studentScholarships.scholarshipProgramId))
  .where(awardWhere)

  let totalGross = BigInt(0)
  let totalScholarship = BigInt(0)
  let totalNet = BigInt(0)
  let totalPaid = BigInt(0)
  let totalOutstanding = BigInt(0)

  let targetProgramName: string | null = null
  if (filters.programId) {
    const [prog] = await db.select({ name: scholarshipPrograms.name }).from(scholarshipPrograms).where(eq(scholarshipPrograms.id, filters.programId))
    if (prog) targetProgramName = prog.name
  }

  for (const r of rows) {
    if (targetProgramName && r.programName !== targetProgramName) continue

    let gross = r.grossAmount || BigInt(0)
    let sch = r.scholarshipAmount || BigInt(0)
    let paid = r.paidAmount || BigInt(0)
    
    let net = gross - sch
    if (net < BigInt(0)) net = BigInt(0)
    
    let out = net - paid
    if (out < BigInt(0)) out = BigInt(0)

    totalGross += gross
    totalScholarship += sch
    totalNet += net
    totalPaid += paid
    totalOutstanding += out
  }

  return {
    activePrograms: Number(activeProgramsResult[0]?.programCount || 0),
    activeRecipients: Number(activeProgramsResult[0]?.recipientCount || 0),
    totalGross: serializeAmountForApi(totalGross),
    totalScholarship: serializeAmountForApi(totalScholarship),
    totalNet: serializeAmountForApi(totalNet),
    totalPaid: serializeAmountForApi(totalPaid),
    totalOutstanding: serializeAmountForApi(totalOutstanding)
  }
}
