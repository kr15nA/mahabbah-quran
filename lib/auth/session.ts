import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'

import { getJwtSecret } from '../config/env'

export function getJwtSecretKey(): Uint8Array {
  const secret = getJwtSecret()
  return new TextEncoder().encode(secret)
}

export type SessionPayload = {
  userId: number
  role: 'guru' | 'orang_tua' | 'admin'
  fullName: string
  email?: string | null
  mustChangePassword?: boolean
}

export async function createSession(payload: SessionPayload): Promise<string> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getJwtSecretKey())

  const cookieStore = await cookies()
  cookieStore.set('mq_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  })

  return token
}

/**
 * Resolves and verifies the authenticated user session from the mq_session JWT cookie.
 *
 * Caller Guidelines:
 * - Provide req (NextRequest): In API Route Handlers (app/api/...) where the incoming
 *   NextRequest object is explicitly available in the route handler signature.
 * - Omit req: In Server Components (page.tsx, layout.tsx), Server Actions (actions.ts),
 *   and internal auth helpers (e.g. requireAuth()) where cookies() from next/headers is the
 *   canonical App Router context.
 *
 * Acquisition Precedence & Fallback Invariant:
 * 1. If req is provided, mq_session is first extracted from req.cookies.
 * 2. If token is not present in req (or req is omitted), it accesses cookies() from next/headers.
 * 3. In both acquisition paths, the token MUST cryptographically pass jwtVerify(token, getJwtSecretKey()).
 *    Expired tokens, tampered signatures, unsupported algorithms, or missing claims unconditionally fail
 *    closed and return null. No untrusted token sources (e.g. query strings or body parameters) are permitted.
 */
export async function getSession(req?: NextRequest): Promise<SessionPayload | null> {
  try {
    let token: string | undefined
    if (req) {
      token = req.cookies.get('mq_session')?.value
    }
    if (!token) {
      const cookieStore = await cookies()
      token = cookieStore.get('mq_session')?.value
    }
    if (!token) return null

    const { payload } = await jwtVerify(token, getJwtSecretKey())
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete('mq_session')
}
