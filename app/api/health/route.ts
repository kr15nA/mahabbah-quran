import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { sql } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET() {
  const startTime = Date.now()
  try {
    // Minimal DB probe: SELECT 1
    await db.execute(sql`SELECT 1`)
    const latencyMs = Date.now() - startTime

    return NextResponse.json(
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          app: 'up',
          database: 'connected',
        },
        latencyMs,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    )
  } catch (error: any) {
    // Probe failed - do NOT expose connection strings, secrets, or raw stack traces
    console.error('[Health Check DB Probe Failed]:', error?.message || 'Database unreachable')

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          app: 'up',
          database: 'disconnected',
        },
        error: 'Database probe failed',
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    )
  }
}
