import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/rbac'
import { getAllPrograms, searchPrograms, insertProgram } from '@/lib/db/queries/programs'

export async function GET(req: NextRequest) {
  const { role } = await requireAuth()
  
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || searchParams.get('q') || undefined
  const status = searchParams.get('status') ?? undefined
  const page = searchParams.get('page') ? Number(searchParams.get('page')) : undefined
  const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 10

  // For Admin UI, we want to allow search/pagination
  if (role === 'SUPER_ADMIN') {
    const pagination = page ? { limit, offset: (page - 1) * limit } : undefined
    const { data, total } = await searchPrograms(search, { status }, pagination)
    
    if (page) {
      return NextResponse.json({ data, meta: { total, page, limit } })
    }
    // Backward compatibility if page not provided
    return NextResponse.json({ data })
  }
  
  // For other roles, just return active programs for dropdowns, etc.
  const list = await getAllPrograms()
  return NextResponse.json({ data: list })
}

export async function POST(req: NextRequest) {
  const { role } = await requireAuth()
  if (role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  if (!body.name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const id = await insertProgram(body)
  return NextResponse.json({ data: { id } }, { status: 201 })
}
