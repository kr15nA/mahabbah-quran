import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

import { getJwtSecretKey } from '@/lib/auth/session'

// Explicit allowlist of cron endpoints that intentionally perform authoritative Bearer CRON_SECRET authentication
const ALLOWED_CRON_ROUTES = new Set([
  '/api/cron/recurring-billing',
])

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Root redirect
  if (pathname === '/') {
    const token = req.cookies.get('mq_session')?.value
    if (!token) return NextResponse.redirect(new URL('/login', req.url))
    try {
      await jwtVerify(token, getJwtSecretKey())
      return NextResponse.redirect(new URL('/auth/landing', req.url))
    } catch {
      return NextResponse.redirect(new URL('/login', req.url))
    }
  }

  const normalizedPath = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname

  // Public routes
  if (
    pathname === '/api/health' ||
    pathname.startsWith('/api/health/') ||
    ALLOWED_CRON_ROUTES.has(normalizedPath) ||
    pathname.startsWith('/login') || 
    pathname.startsWith('/api/auth') || 
    pathname.startsWith('/api/share') ||
    pathname.startsWith('/share') ||
    pathname.startsWith('/_next') || 
    pathname.startsWith('/favicon.ico')
  ) {
    return NextResponse.next()
  }

  const token = req.cookies.get('mq_session')?.value
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', req.url))
  }

  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey())
    const role = payload.role as string
    const mustChangePassword = Boolean(payload.mustChangePassword)

    if (mustChangePassword) {
      if (pathname === '/ubah-password' || pathname.startsWith('/ubah-password/') || pathname.startsWith('/api/auth/')) {
        return NextResponse.next()
      }
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Password change required', code: 'PASSWORD_CHANGE_REQUIRED' }, { status: 403 })
      }
      return NextResponse.redirect(new URL('/ubah-password', req.url))
    }

    const res = NextResponse.next()
    res.headers.set('x-user-id', String(payload.userId))
    res.headers.set('x-user-role', role)
    return res
  } catch {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', req.url))
  }
}

export const config = {
  matcher: ['/', '/(guru|orang-tua|admin|santri)/:path*', '/api/((?!auth).*)', '/pilih-konteks', '/auth/landing', '/ubah-password'],
}
