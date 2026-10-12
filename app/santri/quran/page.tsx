import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { verifyUserContext } from '@/lib/identity/contexts'
import { getAllSurahs } from '@/lib/db/queries/surahs'
import SantriQuranClient from './SantriQuranClient'

export const metadata: Metadata = {
  title: 'Al-Qur\'an Santri | Mahabbah Qur\'an',
  description: 'Mushaf Al-Qur\'an digital santri untuk tilawah dan muraja\'ah',
}

export default async function SantriQuranPage() {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  const isLearner = await verifyUserContext(session, 'learner')
  if (!isLearner) {
    redirect('/auth/forbidden')
  }

  const surahs = await getAllSurahs()

  return <SantriQuranClient initialSurahs={surahs} />
}
