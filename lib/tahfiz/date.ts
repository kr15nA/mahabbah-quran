/**
 * Converts a JS Date (server instant) to a YYYY-MM-DD string
 * aligned exactly to the Asia/Jakarta business timezone.
 */
export function getBusinessDate(instant: Date): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  return formatter.format(instant)
}
