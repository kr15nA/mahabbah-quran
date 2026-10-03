import { Metadata } from 'next'
import SantriTahfizClient from './SantriTahfizClient'

export const metadata: Metadata = {
  title: 'Tahfiz Santri | Mahabbah Qur\'an',
  description: 'Pantau capaian dan riwayat hafalan santri',
}

export default function SantriTahfizPage() {
  return <SantriTahfizClient />
}
