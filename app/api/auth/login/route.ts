import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getUserByEmail, getUserByPhone, updateLastLogin } from '@/lib/db/queries/users'
import { createSession } from '@/lib/auth/session'
import { consumeLoginAttempt, resetLoginAttempt } from '@/lib/auth/rate-limit'

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

    if (!user) {
      return NextResponse.json({ error: 'Pengguna tidak ditemukan' }, { status: 401 })
    }

    if (!user.is_active) {
      return NextResponse.json({ error: 'Akun telah dinonaktifkan' }, { status: 403 })
    }

    const isValid = await bcrypt.compare(password, user.password_hash)
    if (!isValid) {
      return NextResponse.json({ error: 'Password salah' }, { status: 401 })
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
