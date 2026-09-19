import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

import { getJwtSecretKey } from '@/lib/auth/session'

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

  // Public routes
  if (
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
  matcher: ['/', '/(guru|orang-tua|admin|santri)/:path*', '/api/((?!auth).*)', '/pilih-konteks', '/auth/landing'],
}
