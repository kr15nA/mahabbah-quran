import { getSession } from '@/lib/auth/session'
import { verifyUserContext, getAvailableUserContexts } from '@/lib/identity/contexts'
import { getSelfStudentProfile } from '@/lib/identity/learner'
import { redirect } from 'next/navigation'
import SantriLayoutClient from './SantriLayoutClient'

export default async function SantriLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  const isAuthorized = await verifyUserContext(session, 'learner')
  if (!isAuthorized) redirect('/auth/forbidden')

  const availableContexts = await getAvailableUserContexts(session)
  
  // Need self profile for name and initials
  const selfProfile = await getSelfStudentProfile(session.userId)
  const name = selfProfile?.fullName || session.fullName
  const initials = name.substring(0, 2).toUpperCase()

  return (
    <SantriLayoutClient availableContexts={availableContexts} initials={initials} userName={name}>
      {children}
    </SantriLayoutClient>
  )
}
