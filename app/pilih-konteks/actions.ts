'use server'

import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth/session'
import { getAvailableUserContexts, ContextIdentifier } from '@/lib/identity/contexts'
import { CANONICAL_LANDINGS } from '@/lib/identity/landing'
import { redirect } from 'next/navigation'

export async function setLastContextAndRedirect(context: ContextIdentifier) {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  const available = await getAvailableUserContexts(session)
  if (!available[context]) {
    redirect('/auth/forbidden')
  }

  const cookieStore = await cookies()
  cookieStore.set('mq_last_context', context, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  })

  redirect(CANONICAL_LANDINGS[context])
}
