import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getAvailableUserContexts } from '@/lib/identity/contexts'
import { resolveContextLanding } from '@/lib/identity/landing'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const contexts = await getAvailableUserContexts(session)
  const preferredContext = req.cookies.get('mq_last_context')?.value

  const resolution = resolveContextLanding({ contexts, preferredContext })

  if (resolution.type === 'forbidden') {
    return NextResponse.redirect(new URL('/auth/forbidden', req.url))
  }

  if (resolution.type === 'chooser') {
    return NextResponse.redirect(new URL('/pilih-konteks', req.url))
  }

  if (resolution.type === 'direct' && resolution.destination) {
    return NextResponse.redirect(new URL(resolution.destination, req.url))
  }

  // Fallback safe redirect if resolution somehow fails
  return NextResponse.redirect(new URL('/login', req.url))
}
