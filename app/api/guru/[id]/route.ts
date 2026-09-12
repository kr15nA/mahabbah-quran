import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/rbac'
import { getUserById, updateGuru, archiveGuru, getUserByEmail, getUserByPhone } from '@/lib/db/queries/users'
import bcrypt from 'bcryptjs'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { role } = await requireAuth()
    if (role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const numericId = Number(id)
    if (!Number.isFinite(numericId) || !Number.isInteger(numericId) || numericId <= 0) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    const user = await getUserById(numericId)
    if (!user || user.role !== 'guru') {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 })
    }

    const { password_hash, fcm_token, deleted_at, ...safeUser } = user
    return NextResponse.json({ data: safeUser })
  } catch (error: any) {
    if (error.name === 'AuthError') return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { role } = await requireAuth()
    if (role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const numericId = Number(id)
    if (!Number.isFinite(numericId) || !Number.isInteger(numericId) || numericId <= 0) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    const existingUser = await getUserById(numericId)
    if (!existingUser || existingUser.role !== 'guru') {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 })
    }

    const body = await req.json()
    let { full_name, email, phone, password, is_active } = body

    if (full_name !== undefined) {
      if (typeof full_name !== 'string' || !full_name.trim()) {
        return NextResponse.json({ error: 'Bad Request: full_name cannot be empty' }, { status: 400 })
      }
      full_name = full_name.trim()
    }

    if (email !== undefined) {
      if (email !== null && email !== '') {
        if (typeof email !== 'string') return NextResponse.json({ error: 'Bad Request: invalid email format' }, { status: 400 })
        email = email.trim()
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'Bad Request: invalid email format' }, { status: 400 })
      } else {
        email = null
      }
    }

    if (phone !== undefined) {
      if (phone !== null && phone !== '') {
        if (typeof phone !== 'string') return NextResponse.json({ error: 'Bad Request: invalid phone format' }, { status: 400 })
        phone = phone.trim()
      } else {
        phone = null
      }
    }

    if (password !== undefined) {
      if (typeof password !== 'string' || password.length < 6) {
        return NextResponse.json({ error: 'Bad Request: password must be at least 6 characters' }, { status: 400 })
      }
    }

    if (is_active !== undefined) {
      if (typeof is_active !== 'boolean') {
        return NextResponse.json({ error: 'Bad Request: is_active must be a boolean' }, { status: 400 })
      }
    }

    if (email !== undefined && email !== existingUser.email) {
      const existingEmail = await getUserByEmail(email)
      if (existingEmail) return NextResponse.json({ error: 'Conflict: Email already exists' }, { status: 409 })
    }

    if (phone !== undefined && phone !== null && phone !== existingUser.phone) {
      const existingPhone = await getUserByPhone(phone)
      if (existingPhone) return NextResponse.json({ error: 'Conflict: Phone already exists' }, { status: 409 })
    }

    const updateData: any = {}
    if (full_name !== undefined) updateData.full_name = full_name
    if (email !== undefined) updateData.email = email || null
    if (phone !== undefined) updateData.phone = phone || null
    if (is_active !== undefined) updateData.is_active = is_active
    if (password) {
      updateData.password_hash = await bcrypt.hash(password, 10)
    }

    if (Object.keys(updateData).length > 0) {
      await updateGuru(numericId, updateData)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('PATCH /api/guru/[id] error:', error)
    if (error.name === 'AuthError') return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { role } = await requireAuth()
    if (role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const numericId = Number(id)
    if (!Number.isFinite(numericId) || !Number.isInteger(numericId) || numericId <= 0) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    const existingUser = await getUserById(numericId)
    if (!existingUser || existingUser.role !== 'guru') {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 })
    }

    await archiveGuru(numericId)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.name === 'AuthError') return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
