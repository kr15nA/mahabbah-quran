import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/rbac'
import { searchGurus, insertUser, getUserByEmail, getUserByPhone } from '@/lib/db/queries/users'
import bcrypt from 'bcryptjs'

export async function GET(req: NextRequest) {
  try {
    const { role } = await requireAuth()
    if (role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || undefined
    const statusParam = searchParams.get('status')
    
    // Status resolution matches Program and Student APIs
    let isActiveFilter: boolean | null = true
    if (statusParam === 'all') isActiveFilter = null
    else if (statusParam === 'archived') isActiveFilter = false
    
    const pageParam = Number(searchParams.get('page') || 1)
    const limitParam = Number(searchParams.get('limit') || 10)
    
    if (!Number.isFinite(pageParam) || pageParam < 1) {
      return NextResponse.json({ error: 'Invalid page parameter' }, { status: 400 })
    }
    if (!Number.isFinite(limitParam) || limitParam < 1) {
      return NextResponse.json({ error: 'Invalid limit parameter' }, { status: 400 })
    }
    
    const page = Math.floor(pageParam)
    const limit = Math.min(100, Math.floor(limitParam))
    const offset = (page - 1) * limit

    const { data, total } = await searchGurus({
      search,
      isActiveFilter,
      limit,
      offset,
    })

    return NextResponse.json({
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    })
  } catch (error: any) {
    if (error.name === 'AuthError') return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { role } = await requireAuth()
    if (role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    let { full_name, email, phone, password } = body

    if (typeof full_name !== 'string' || !full_name.trim()) {
      return NextResponse.json({ error: 'Bad Request: full_name is required and cannot be empty' }, { status: 400 })
    }
    full_name = full_name.trim()

    if (typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: 'Bad Request: password must be at least 6 characters' }, { status: 400 })
    }

    if (email !== undefined && email !== null && email !== '') {
      if (typeof email !== 'string') {
        return NextResponse.json({ error: 'Bad Request: invalid email format' }, { status: 400 })
      }
      email = email.trim()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: 'Bad Request: invalid email format' }, { status: 400 })
      }
    } else {
      email = null
    }

    if (phone !== undefined && phone !== null && phone !== '') {
      if (typeof phone !== 'string') {
        return NextResponse.json({ error: 'Bad Request: invalid phone format' }, { status: 400 })
      }
      phone = phone.trim()
    } else {
      phone = null
    }

    if (email) {
      const existingEmail = await getUserByEmail(email)
      if (existingEmail) return NextResponse.json({ error: 'Conflict: Email already exists' }, { status: 409 })
    }

    if (phone) {
      const existingPhone = await getUserByPhone(phone)
      if (existingPhone) return NextResponse.json({ error: 'Conflict: Phone already exists' }, { status: 409 })
    }

    const password_hash = await bcrypt.hash(password, 10)

    const id = await insertUser({
      full_name,
      email: email || null,
      phone: phone || null,
      password_hash,
      role: 'guru'
    })

    return NextResponse.json({ data: { id } }, { status: 201 })
  } catch (error: any) {
    console.error('POST /api/guru error:', error)
    if (error.name === 'AuthError') return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
