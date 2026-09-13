import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, AuthError } from '@/lib/auth/rbac'
import { getTeacherAssignmentHistory } from '@/lib/db/queries/teacher-assignments'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { role } = await requireAuth()
    if (role !== 'SUPER_ADMIN') throw new AuthError(403, 'Forbidden')

    const id = parseInt((await params).id, 10)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    const history = await getTeacherAssignmentHistory(id)
    return NextResponse.json(history)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error(`GET /api/classes/[id]/teacher-assignments error:`, error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
