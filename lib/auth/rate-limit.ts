import crypto from 'crypto'
import { db } from '@/lib/db/client'
import { loginRateLimits } from '@/drizzle/schema'
import { eq, lt, sql } from 'drizzle-orm'
import { getJwtSecretKey } from '@/lib/auth/session'

export function deriveLoginRateLimitKey(identifier: string): string {
  const secret = getJwtSecretKey()
  
  const normalized = identifier.trim().toLowerCase()
  const payload = `login-rate-limit:v1:${normalized}`
  
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
}

export async function consumeLoginAttempt(identifier: string) {
  const keyHash = deriveLoginRateLimitKey(identifier)
  const windowMinutes = 15
  
  const newExpiry = new Date(Date.now() + windowMinutes * 60 * 1000)
  const newExpiryStr = newExpiry.toISOString()
  
  // Atomic upsert that resets count if the window has expired
  const [result] = await db.insert(loginRateLimits).values({
    keyHash,
    attemptCount: 1,
    expiresAt: newExpiryStr
  }).onConflictDoUpdate({
    target: loginRateLimits.keyHash,
    set: {
      attemptCount: sql`CASE WHEN login_rate_limits.expires_at < NOW() THEN 1 ELSE login_rate_limits.attempt_count + 1 END`,
      expiresAt: sql`CASE WHEN login_rate_limits.expires_at < NOW() THEN ${newExpiryStr}::timestamp with time zone ELSE login_rate_limits.expires_at END`,
      updatedAt: sql`NOW()`
    }
  }).returning()
  
  // Best-effort opportunistic cleanup (5% probability to avoid slowing down every request)
  if (Math.random() < 0.05) {
    db.delete(loginRateLimits).where(sql`expires_at < NOW()`).execute().catch(console.error)
  }

  return result
}

export async function resetLoginAttempt(identifier: string) {
  const keyHash = deriveLoginRateLimitKey(identifier)
  await db.delete(loginRateLimits).where(eq(loginRateLimits.keyHash, keyHash))
}
