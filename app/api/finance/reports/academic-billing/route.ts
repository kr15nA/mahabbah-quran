import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { hasPermission } from '@/lib/auth/rbac'
import { getAcademicBillingReport } from '@/lib/finance/reports/academic'
import { generateSafeXlsx, logExportAudit } from '@/lib/finance/export'

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const canView = await hasPermission(session as any, 'finance.report.view')
  if (!canView) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format')
  
  if (format === 'xlsx') {
    const canExport = await hasPermission(session as any, 'finance.report.export')
    if (!canExport) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Parse filters
  const from = searchParams.get('from') || undefined
  const to = searchParams.get('to') || undefined
  const page = parseInt(searchParams.get('page') || '1', 10)
  const pageSize = parseInt(searchParams.get('pageSize') || (format === 'xlsx' ? '10000' : '50'), 10)
  
  // Custom parsing based on route would go here... (We will adapt manually where needed)
  const range = { from, to }
  const params = { page, pageSize }
  
  // Extra filters... we'll just pass everything via Object.fromEntries for simplicity, or modify per-route later
  const rawFilters = Object.fromEntries(searchParams.entries())
  delete rawFilters.from
  delete rawFilters.to
  delete rawFilters.page
  delete rawFilters.pageSize
  delete rawFilters.format

  try {
    const data = await getAcademicBillingReport(params, rawFilters)

    if (format === 'xlsx') {
      const items = (data as any).items || (Array.isArray(data) ? data : [data])
      if (items.length > 10000) {
        return NextResponse.json({ error: 'Data melebihi batas 10.000 baris. Persempit periode atau filter laporan.' }, { status: 400 })
      }

      const metadata = {
        title: 'academic-billing Report',
        period: (from || to) ? `${from || ''} - ${to || ''}` : 'All time',
        generatedBy: session.fullName,
        filters: rawFilters
      }

      const buffer = generateSafeXlsx(items, metadata)
      
      await logExportAudit(session.userId, 'academic-billing', metadata, items.length)

      return new NextResponse(buffer as any, {
        headers: {
          'Content-Disposition': `attachment; filename="laporan-academic-billing-${new Date().toISOString().split('T')[0]}.xlsx"`,
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
