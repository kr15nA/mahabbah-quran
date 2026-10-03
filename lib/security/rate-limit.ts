import { db } from '@/lib/db/client'
import { rateLimits } from '@/drizzle/schema'
import { sql } from 'drizzle-orm'
import crypto from 'crypto'

export interface ConsumeRateLimitArgs {
  namespace: string
  subject: string
  limit: number
  windowSeconds: number
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  retryAfterSeconds: number
  resetAt: Date
}

export function hashSubject(subject: string): string {
  if (subject.trim().length === 0) {
    throw new Error('Subject cannot be empty or whitespace only')
  }
  return crypto.createHash('sha256').update(subject).digest('hex')
}

export async function consumeRateLimit({
  namespace,
  subject,
  limit,
  windowSeconds,
}: ConsumeRateLimitArgs): Promise<RateLimitResult> {
  if (!namespace) throw new Error('Namespace is required')
  if (!subject) throw new Error('Subject is required')
  if (limit <= 0 || !Number.isInteger(limit)) throw new Error('Limit must be a positive integer')
  if (windowSeconds <= 0 || !Number.isInteger(windowSeconds)) throw new Error('Window seconds must be a positive integer')

  const subjectKey = hashSubject(subject)

  try {
    const [row] = await db
      .insert(rateLimits)
      .values({
        namespace,
        subjectKey,
        requestCount: 1,
        expiresAt: sql`NOW() + make_interval(secs => ${windowSeconds})`,
      })
      .onConflictDoUpdate({
        target: [rateLimits.namespace, rateLimits.subjectKey],
        set: {
          requestCount: sql`
            CASE
              WHEN rate_limits.expires_at <= NOW() THEN 1
              WHEN rate_limits.request_count < ${limit + 1} THEN rate_limits.request_count + 1
              ELSE rate_limits.request_count
            END
          `,
          expiresAt: sql`
            CASE
              WHEN rate_limits.expires_at <= NOW() THEN NOW() + make_interval(secs => ${windowSeconds})
              ELSE rate_limits.expires_at
            END
          `,
          windowStartedAt: sql`
            CASE
              WHEN rate_limits.expires_at <= NOW() THEN NOW()
              ELSE rate_limits.window_started_at
            END
          `,
          updatedAt: sql`NOW()`,
        },
      })
      .returning({
        requestCount: rateLimits.requestCount,
        expiresAt: rateLimits.expiresAt,
        retryAfterSeconds: sql<number>`GREATEST(0, CEIL(EXTRACT(EPOCH FROM (${rateLimits.expiresAt} - NOW()))))::integer`,
      })

    const currentCount = row.requestCount
    const allowed = currentCount <= limit
    const remaining = Math.max(0, limit - currentCount)

    return {
      allowed,
      limit,
      remaining,
      retryAfterSeconds: Number(row.retryAfterSeconds),
      resetAt: row.expiresAt,
    }
  } catch (error) {
    console.error(`Rate limit DB error for namespace ${namespace}:`, error)
    throw new Error('Gagal memverifikasi rate limit (infrastructure error)')
  }
}
