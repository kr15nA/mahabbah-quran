import { getSession } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import ParentTahfizClient from './ParentTahfizClient'

export default async function ParentTahfizPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = await getSession()
  if (!session || session.role !== 'orang_tua') {
    redirect('/login')
  }

  const resolvedParams = await searchParams
  const childId = typeof resolvedParams.child_id === 'string' ? resolvedParams.child_id : undefined

  return <ParentTahfizClient initialChildId={childId} />
}
