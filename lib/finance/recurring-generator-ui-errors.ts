export function mapRecurringError(errorCode: string | null | undefined): string {
  if (!errorCode) return 'Terjadi kendala tidak terduga.'

  switch (errorCode) {
    case 'INVALID_RECURRING_CONFIG':
      return 'Konfigurasi tagihan berulang belum valid.'
    case 'INVALID_FEE_AMOUNT':
      return 'Nominal jenis tagihan belum valid.'
    case 'ASSIGNMENT_NOT_ELIGIBLE':
      return 'Kewajiban tagihan tidak berlaku untuk periode ini.'
    case 'STUDENT_NOT_FOUND':
      return 'Data santri tidak ditemukan.'
    case 'INVOICE_CREATE_FAILED':
      return 'Tagihan gagal dibuat.'
    case 'SCHOLARSHIP_RESOLUTION_FAILED':
      return 'Beasiswa gagal diterapkan pada tagihan.'
    case 'UNKNOWN_ERROR':
    default:
      return 'Terjadi kendala saat memproses tagihan.'
  }
}
