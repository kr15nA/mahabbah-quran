import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getUserByEmail, getUserByPhone, updateLastLogin } from '@/lib/db/queries/users'
import { createSession } from '@/lib/auth/session'
import { consumeLoginAttempt, resetLoginAttempt } from '@/lib/auth/rate-limit'

// Dummy hash (cost=10) to mitigate timing attacks for nonexistent users
const DUMMY_PASSWORD_HASH = '$2a$10$bQ.GJAoeRvE9mBcyqDi4E.BsKxakHXEIpdBh3UBRAens6fMRY13QK'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { identifier, password } = body

    if (!identifier || !password) {
      return NextResponse.json({ error: 'Email/HP dan password wajib diisi' }, { status: 400 })
    }

    const rateLimit = await consumeLoginAttempt(identifier)
    if (rateLimit.attemptCount > 5) {
      const expiresDate = new Date(rateLimit.expiresAt)
      const retryAfter = Math.max(0, Math.ceil((expiresDate.getTime() - Date.now()) / 1000))
      return NextResponse.json(
        { error: 'Terlalu banyak percobaan masuk. Silakan coba lagi nanti.' },
        { 
          status: 429,
          headers: {
            'Retry-After': String(retryAfter)
          }
        }
      )
    }

    let user = await getUserByEmail(identifier)
    if (!user) {
      user = await getUserByPhone(identifier)
    }

    const comparisonHash = user ? user.password_hash : DUMMY_PASSWORD_HASH
    const isPasswordValid = await bcrypt.compare(password, comparisonHash)

    if (!user || !user.is_active || !isPasswordValid) {
      return NextResponse.json({ error: 'Email/HP atau password tidak valid' }, { status: 401 })
    }

    await updateLastLogin(user.id)
    await resetLoginAttempt(identifier)

    await createSession({
      userId: user.id,
      role: user.role,
      fullName: user.full_name,
      email: user.email,
    })

    return NextResponse.json({ success: true, role: user.role, redirect: '/auth/landing' })
  } catch (error) {
    console.error('Login error:', error)
    if (error instanceof Error) {
      console.error(error.stack)
    }
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}
