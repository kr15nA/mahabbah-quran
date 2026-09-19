import { financeDb as db } from '../tx'
import { and, eq, lte, isNull, or, gte } from 'drizzle-orm'
import {
  studentScholarships,
  scholarshipPrograms,
  scholarshipProgramFeeTypes
} from '@/drizzle/schema'
import { calculateScholarshipBenefit, ScholarshipConfig } from './calculator'

export interface ResolveScholarshipInput {
  studentId: number
  academicYearId: number
  feeTypeId: number
  /** Format: YYYY-MM */
  period: string
  grossAmount: bigint
}

export async function resolveScholarshipForInvoice(input: ResolveScholarshipInput, tx: any = db) {
  const eligibilityDate = `${input.period}-01`

  const eligibleAwards = await tx.select({
    studentScholarshipId: studentScholarships.id,
    scholarshipProgramId: scholarshipPrograms.id,
    programName: scholarshipPrograms.name,
    calculationType: scholarshipPrograms.calculationType,
    percentageBasisPoints: scholarshipPrograms.percentageBasisPoints,
    fixedAmount: scholarshipPrograms.fixedAmount,
    fundingFundId: scholarshipPrograms.fundingFundId,
    scholarshipAccountId: scholarshipPrograms.scholarshipAccountId
  })
  .from(studentScholarships)
  .innerJoin(scholarshipPrograms, eq(studentScholarships.scholarshipProgramId, scholarshipPrograms.id))
  .innerJoin(scholarshipProgramFeeTypes, eq(scholarshipPrograms.id, scholarshipProgramFeeTypes.programId))
  .where(and(
    eq(studentScholarships.studentId, input.studentId),
    eq(studentScholarships.academicYearId, input.academicYearId),
    eq(studentScholarships.status, 'ACTIVE'),
    eq(scholarshipProgramFeeTypes.feeTypeId, input.feeTypeId),
    eq(scholarshipPrograms.status, 'ACTIVE'),
    isNull(scholarshipPrograms.deletedAt),
    lte(studentScholarships.startDate, eligibilityDate),
    or(
      isNull(studentScholarships.endDate),
      gte(studentScholarships.endDate, eligibilityDate)
    )
  ))

  if (eligibleAwards.length === 0) return null

  // V1 semantic: no stacking, pick the first matching active award
  const award = eligibleAwards[0]

  const config: ScholarshipConfig = {
    calculationType: award.calculationType as any,
    percentageBasisPoints: award.percentageBasisPoints,
    fixedAmount: award.fixedAmount
  }

  const { scholarshipAmount } = calculateScholarshipBenefit(input.grossAmount, config)

  // Ensure we do not insert 0 scholarship snapshots unless FULL type calculates to 0? Wait, scholarshipAmount > 0 is fine, 
  // but even if scholarshipAmount is 0 (due to 0 gross), we might want to record the snapshot for history.
  // We'll return it and let the caller insert.

  return {
    studentScholarshipId: award.studentScholarshipId,
    scholarshipProgramId: award.scholarshipProgramId,
    programNameSnapshot: award.programName,
    calculationTypeSnapshot: award.calculationType,
    percentageBasisPointsSnapshot: award.percentageBasisPoints,
    fixedAmountSnapshot: award.fixedAmount,
    grossEligibleAmount: input.grossAmount,
    scholarshipAmount,
    fundIdSnapshot: award.fundingFundId,
    scholarshipAccountIdSnapshot: award.scholarshipAccountId
  }
}
