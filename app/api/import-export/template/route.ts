import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/rbac'
import { getTemplate, DatasetType } from '@/lib/import-export'

export async function GET(req: NextRequest) {
  try {
    const { role } = await requireAuth()
    if (role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const type = req.nextUrl.searchParams.get('type') as DatasetType
    if (!type || !['santri', 'guru', 'orang_tua', 'parent_santri'].includes(type)) {
      return NextResponse.json({ error: 'Invalid dataset type' }, { status: 400 })
    }

    const buffer = getTemplate(type)

    return new NextResponse(buffer as any, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Template_${type}.xlsx"`,
      },
    })
  } catch (err: any) {
    console.error('Template generation error:', err)
    return NextResponse.json({ error: 'Gagal membuat template' }, { status: 500 })
  }
}
