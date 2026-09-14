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
export function formatRupiah(amount: bigint): string {
  // Use Intl.NumberFormat for robust formatting
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}
