import { NextRequest, NextResponse } from 'next/server'
import { requireStudentAccess, AuthError } from '@/lib/auth/rbac'
import { getStudentEnrollmentHistory } from '@/lib/db/queries/enrollments'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id, 10)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    // This enforces RBAC: 
    // - Admin can see any
    // - Guru can see if they teach the student
    // - Parent can see if it's their child
    await requireStudentAccess(id)

    const history = await getStudentEnrollmentHistory(id)
    return NextResponse.json(history)
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error(`GET /api/students/[id]/enrollments error:`, error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
