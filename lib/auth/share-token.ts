import crypto from 'node:crypto'
import { getActiveShareByTokenHash } from '../db/queries/report-shares'

export async function validateShareToken(rawToken: string) {
  if (!rawToken || typeof rawToken !== 'string') {
    return null
  }

  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
  const share = await getActiveShareByTokenHash(tokenHash)

  if (!share) {
    return null
  }

  // Update last accessed? (Optional, but good for tracking)
  // We can just return the share for now.
  return share
}
