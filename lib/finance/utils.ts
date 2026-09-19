/**
 * Finance Foundation Formatting Rules:
 * - Database and Business Layer: native TS bigint
 * - JSON / API Layer: string (decimal string representation)
 * - UI Layer: Formatted Rupiah string
 */

/**
 * Converts a string or number to bigint safely for business logic operations.
 * Throws if the input is fractional or invalid.
 */
export function toBigIntSafely(value: string | number): bigint {
  if (typeof value === 'number') {
    if (!Number.isInteger(value)) {
      throw new Error(`Cannot safely convert fractional number to bigint: ${value}`)
    }
    return BigInt(value)
  }
  return BigInt(value)
}

/**
 * Serializes a bigint amount for API presentation.
 * Returns the exact decimal string representation.
 */
export function serializeAmountForApi(amount: bigint): string {
  return amount.toString()
}

/**
 * Formats a bigint amount to standard Indonesian Rupiah format for UI presentation.
 * Example: 150000n -> "Rp150.000"
 */
export function formatRupiah(amount: bigint | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return '-'
  try {
    const bg = typeof amount === 'string' ? BigInt(amount) : amount
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(bg)
  } catch {
    return '-'
  }
}

/**
 * Parses a percentage string deterministically to basis points (10000 = 100%).
 * Supported examples: "50" -> 5000, "50.5" -> 5050, "33.33" -> 3333
 * Rejects invalid strings, 0, or more than 2 decimal places.
 */
export function parsePercentageToBasisPoints(value: string): number {
  if (!value || typeof value !== 'string') throw new Error('Invalid percentage input')
  const trimmed = value.trim()
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    throw new Error('Percentage must be a positive number with up to 2 decimal places')
  }
  
  const parts = trimmed.split('.')
  let integerPart = parseInt(parts[0], 10)
  let decimalPart = 0
  
  if (parts.length === 2) {
    const fraction = parts[1]
    if (fraction.length === 1) decimalPart = parseInt(fraction + '0', 10)
    else decimalPart = parseInt(fraction, 10)
  }
  
  const basisPoints = (integerPart * 100) + decimalPart
  
  if (basisPoints <= 0 || basisPoints > 10000) {
    throw new Error('Percentage must be between 0.01 and 100')
  }
  
  return basisPoints
}

/**
 * Parses a UI Rupiah string deterministically to a BigInt.
 * Supported examples: "500000", "500.000", "Rp 500.000"
 * Rejects 0, negatives, and malformed fractional inputs.
 */
export function parseRupiahToBigInt(value: string): bigint {
  if (!value || typeof value !== 'string') throw new Error('Invalid monetary input')
  const normalized = value.replace(/Rp\s?/g, '').replace(/\./g, '').trim()
  
  if (!/^\d+$/.test(normalized)) {
    throw new Error('Invalid monetary format')
  }
  
  const amount = BigInt(normalized)
  if (amount <= BigInt(0)) {
    throw new Error('Amount must be greater than zero')
  }
  
  return amount
}
