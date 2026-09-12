import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/rbac'
import { uploadOptimizedImage } from '@/lib/media'

export async function POST(req: NextRequest) {
  try {
    const { session, role } = await requireAuth()

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const entityType = formData.get('entityType') as string || 'users'
    const entityIdStr = formData.get('entityId') as string
    const oldUrl = formData.get('oldUrl') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Default to self upload if not explicitly providing ID + has SUPER_ADMIN rights
    let entityId = session.userId
    if (entityIdStr && role === 'SUPER_ADMIN') {
       entityId = parseInt(entityIdStr, 10)
    } else if (entityIdStr && entityIdStr !== session.userId.toString()) {
       return NextResponse.json({ error: 'Unauthorized entity manipulation' }, { status: 403 })
    }

    // Must validate entityType allowed for current user
    if (entityType !== 'users' && entityType !== 'students') {
       return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 })
    }

    if (entityType === 'students' && role !== 'SUPER_ADMIN') {
       // Currently only Super Admin workflow supports arbitrary student upload
       return NextResponse.json({ error: 'Unauthorized to upload student photos' }, { status: 403 })
    }

    const url = await uploadOptimizedImage({
      file,
      entityType: entityType as 'users' | 'students',
      entityId,
      oldUrl
    })

    return NextResponse.json({ url })
  } catch (err: any) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
