import { financeDb as db } from '../tx'
import { 
  scholarshipPrograms, 
  studentScholarships, 
  scholarshipProgramFeeTypes, 
  financeFeeTypes, 
  financeFunds, 
  financeAccounts, 
  students, 
  academicYears 
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
