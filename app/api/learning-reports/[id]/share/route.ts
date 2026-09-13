import { NextRequest, NextResponse } from 'next/server'
import { requireReportAccess, AuthError } from '@/lib/auth/rbac'
import crypto from 'node:crypto'
import { createReportShare, getActiveShareByReportId, revokeActiveSharesForReport } from '@/lib/db/queries/report-shares'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const reportId = parseInt((await params).id, 10)
    if (isNaN(reportId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    const { role } = await requireReportAccess(reportId)
    if (role === 'ORANG_TUA') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const activeShare = await getActiveShareByReportId(reportId)
    if (!activeShare) {
      return NextResponse.json({ active: false })
    }

    return NextResponse.json({
      active: true,
      expiresAt: activeShare.expiresAt,
      createdAt: activeShare.createdAt
    })
  } catch (error) {
    if (error instanceof AuthError) {
      // Obfuscate 403 as 404 to prevent enumeration
      const status = error.status === 403 ? 404 : error.status
      return NextResponse.json({ error: error.message }, { status })
    }
    console.error('Failed to fetch share:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const reportId = parseInt((await params).id, 10)
    if (isNaN(reportId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    const { session, role } = await requireReportAccess(reportId)
    if (role === 'ORANG_TUA') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Enforce ONE active link: revoke existing
    await revokeActiveSharesForReport(reportId)

    // Generate random raw token
    const rawToken = crypto.randomBytes(32).toString('base64url')
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // Default 7 days

    await createReportShare({
      reportId,
      creatorId: session.userId,
      tokenHash,
      expiresAt,
    })

    return NextResponse.json({
      url: `/share/laporan/${rawToken}`,
      expiresAt
    })
  } catch (error) {
    if (error instanceof AuthError) {
      const status = error.status === 403 ? 404 : error.status
      return NextResponse.json({ error: error.message }, { status })
    }
    console.error('Failed to create share:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const reportId = parseInt((await params).id, 10)
    if (isNaN(reportId)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 })
    }

    const { role } = await requireReportAccess(reportId)
    if (role === 'ORANG_TUA') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await revokeActiveSharesForReport(reportId)

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof AuthError) {
      const status = error.status === 403 ? 404 : error.status
      return NextResponse.json({ error: error.message }, { status })
    }
    console.error('Failed to revoke share:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
