export interface ScholarshipConfig {
  calculationType: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FULL'
  percentageBasisPoints?: number | null // e.g. 10000 = 100%
  fixedAmount?: bigint | null
}

export interface ScholarshipCalculationResult {
  grossAmount: bigint
  scholarshipAmount: bigint
  netAmount: bigint
}

/**
 * Pure function to calculate scholarship benefit against a gross amount.
 * Does not access DB or environment.
 */
export function calculateScholarshipBenefit(
  grossAmount: bigint,
  config: ScholarshipConfig
): ScholarshipCalculationResult {
  if (grossAmount < BigInt(0)) {
    throw new Error('Gross amount cannot be negative')
  }

  let scholarshipAmount = BigInt(0)

  switch (config.calculationType) {
    case 'FULL':
      scholarshipAmount = grossAmount
      break

    case 'FIXED_AMOUNT':
      if (config.fixedAmount == null || config.fixedAmount <= BigInt(0)) {
        throw new Error('Invalid FIXED_AMOUNT scholarship configuration')
      }
      scholarshipAmount = config.fixedAmount > grossAmount ? grossAmount : config.fixedAmount
      break

    case 'PERCENTAGE':
      if (config.percentageBasisPoints == null || config.percentageBasisPoints <= 0 || config.percentageBasisPoints > 10000) {
        throw new Error('Invalid PERCENTAGE scholarship configuration')
      }
      // Integer math: (gross * basis points) / 10000
      // Drops fractional part (floor)
      scholarshipAmount = (grossAmount * BigInt(config.percentageBasisPoints)) / BigInt(10000)
      if (scholarshipAmount > grossAmount) {
        scholarshipAmount = grossAmount
      }
      break

    default:
      throw new Error(`Unknown scholarship calculation type: ${config.calculationType}`)
  }

  const netAmount = grossAmount - scholarshipAmount

  return {
    grossAmount,
    scholarshipAmount,
    netAmount,
  }
}
