import { getSession } from '@/lib/auth/session'
import { verifyUserContext, getAvailableUserContexts } from '@/lib/identity/contexts'
import { redirect } from 'next/navigation'
import GuruLayoutClient from './GuruLayoutClient'

export default async function GuruLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  const isAuthorized = await verifyUserContext(session, 'teacher')
  if (!isAuthorized) redirect('/auth/forbidden')

  const availableContexts = await getAvailableUserContexts(session)

  return (
    <GuruLayoutClient availableContexts={availableContexts}>
      {children}
    </GuruLayoutClient>
  )
}
