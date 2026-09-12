import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/rbac'
import { exportDataset, DatasetType } from '@/lib/import-export'

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

    const buffer = await exportDataset(type)

    const dateStr = new Date().toISOString().split('T')[0]
    return new NextResponse(buffer as any, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Export_${type}_${dateStr}.xlsx"`,
      },
    })
  } catch (err: any) {
    console.error('Export error:', err)
    return NextResponse.json({ error: 'Gagal mengekspor data' }, { status: 500 })
  }
}
