import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

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

export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('mq_session')?.value
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
