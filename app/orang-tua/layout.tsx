import { getSession } from '@/lib/auth/session'
import { verifyUserContext, getAvailableUserContexts } from '@/lib/identity/contexts'
import { redirect } from 'next/navigation'
import ParentLayoutClient from './ParentLayoutClient'

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  const isAuthorized = await verifyUserContext(session, 'guardian')
  if (!isAuthorized) redirect('/auth/forbidden')

  const availableContexts = await getAvailableUserContexts(session)

  return (
    <ParentLayoutClient availableContexts={availableContexts}>
      {children}
    </ParentLayoutClient>
  )
}
