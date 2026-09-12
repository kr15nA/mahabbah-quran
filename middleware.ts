import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

import { getJwtSecretKey } from '@/lib/auth/session'

const ROLE_PREFIXES: Record<string, string[]> = {
  guru: ['/guru'],
  orang_tua: ['/orang-tua'],
  admin: ['/admin'],
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Root redirect
  if (pathname === '/') {
    const token = req.cookies.get('mq_session')?.value
    if (!token) return NextResponse.redirect(new URL('/login', req.url))
    try {
      const { payload } = await jwtVerify(token, getJwtSecretKey())
      const role = (payload.role as string) || 'admin'
      const target = role === 'orang_tua' ? '/orang-tua/beranda' : `/${role}/dashboard`
      return NextResponse.redirect(new URL(target, req.url))
    } catch {
      return NextResponse.redirect(new URL('/login', req.url))
    }
  }

  // Public routes
  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth') || pathname.startsWith('/_next') || pathname.startsWith('/favicon.ico')) {
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

    if (!pathname.startsWith('/api/')) {
      const allowed = ROLE_PREFIXES[role] ?? []
      if (!allowed.some(prefix => pathname.startsWith(prefix))) {
        const fallback = role === 'orang_tua' ? '/orang-tua/beranda' : `/${role.replace('_', '-')}/dashboard`
        return NextResponse.redirect(new URL(fallback, req.url))
      }
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
  matcher: ['/', '/(guru|orang-tua|admin)/:path*', '/api/((?!auth).*)'],
}
