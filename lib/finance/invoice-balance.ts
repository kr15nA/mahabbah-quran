export function calculateInvoiceBalance(args: {
  grossAmount: bigint
  scholarshipAmount: bigint
  paidAmount: bigint
}) {
  const { grossAmount, scholarshipAmount, paidAmount } = args

  // Net = MAX(Gross - Scholarship, 0)
  const netPayable = grossAmount > scholarshipAmount 
    ? grossAmount - scholarshipAmount 
    : BigInt(0)

  // Outstanding = MAX(Net - Paid, 0)
  const outstandingAmount = netPayable > paidAmount
    ? netPayable - paidAmount
    : BigInt(0)

  return {
    grossAmount,
    scholarshipAmount,
    netPayable,
    paidAmount,
    outstandingAmount
  }
}
