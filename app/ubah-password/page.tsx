import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import UbahPasswordClient from './UbahPasswordClient'

export const metadata = {
  title: 'Ubah Password — Mahabbah Qur\'an',
}

export default async function UbahPasswordPage() {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  return (
    <UbahPasswordClient
      fullName={session.fullName}
      role={session.role}
      mustChangePassword={Boolean(session.mustChangePassword)}
    />
  )
}
