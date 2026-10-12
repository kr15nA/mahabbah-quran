import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { verifyUserContext } from '@/lib/identity/contexts'
import { getSelfStudentProfile } from '@/lib/identity/learner'
import { studentIdToDbNumber } from '@/lib/guardians/parent-context'
import { getStudentInvoices, getStudentPayments } from '@/lib/finance/queries/parent-finance'
import SantriTagihanClient from './SantriTagihanClient'
import { Card } from '@/components/ui/Card'
import { User } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Tagihan & Keuangan Santri | Mahabbah Qur\'an',
  description: 'Transparansi informasi tagihan dan riwayat pembayaran santri',
}

export default async function SantriTagihanPage() {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  const isLearner = await verifyUserContext(session, 'learner')
  if (!isLearner) {
    redirect('/auth/forbidden')
  }

  const profile = await getSelfStudentProfile(session.userId)
  if (!profile) {
    return (
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Tagihan & Keuangan</h1>
          <p className="text-sm text-gray-500 mt-1">Transparansi status biaya pendidikan Anda.</p>
        </div>

        <Card className="p-8 flex flex-col items-center justify-center text-center">
          <User className="w-12 h-12 text-gray-300 mb-3" />
          <h3 className="text-gray-900 font-bold mb-1">Profil Santri Belum Terhubung</h3>
          <p className="text-gray-500 text-sm max-w-md">
            Akun Anda belum terhubung dengan data santri aktif. Hubungi bagian tata usaha untuk informasi lebih lanjut.
          </p>
        </Card>
      </div>
    )
  }

  const studentId = studentIdToDbNumber(profile.id)
  const [invoices, payments] = await Promise.all([
    getStudentInvoices(studentId),
    getStudentPayments(studentId),
  ])

  return (
    <SantriTagihanClient
      studentName={profile.fullName}
      invoices={invoices}
      payments={payments}
    />
  )
}
