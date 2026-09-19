import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getUserByEmail, getUserByPhone, updateLastLogin } from '@/lib/db/queries/users'
import { createSession } from '@/lib/auth/session'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { identifier, password } = body

    if (!identifier || !password) {
      return NextResponse.json({ error: 'Email/HP dan password wajib diisi' }, { status: 400 })
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

    await createSession({
      userId: user.id,
      role: user.role,
      fullName: user.full_name,
      email: user.email,
    })

    return NextResponse.json({ success: true, role: user.role, redirect: '/auth/landing' })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 })
  }
}
