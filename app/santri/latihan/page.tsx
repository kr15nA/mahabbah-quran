import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { verifyUserContext } from '@/lib/identity/contexts'
import { getAllSurahs } from '@/lib/db/queries/surahs'
import SantriLatihanClient from './SantriLatihanClient'

export const metadata: Metadata = {
  title: 'Latihan Mandiri | Mahabbah Qur\'an',
  description: 'Mode latihan dan tikrar mandiri santri dengan fitur tutup ayat dan petunjuk',
}

export default async function SantriLatihanPage() {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  const isLearner = await verifyUserContext(session, 'learner')
  if (!isLearner) {
    redirect('/auth/forbidden')
  }

  const surahs = await getAllSurahs()

  return <SantriLatihanClient initialSurahs={surahs} />
}
