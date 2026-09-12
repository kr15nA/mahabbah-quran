'use client'

import { useRouter } from 'next/navigation'
import {
  Home,
  Users,
  Calendar,
  FileText,
  BookMarked,
} from 'lucide-react'

const NAV = [
  { href: '/guru/dashboard', label: 'Dashboard', icon: Home },
  { href: '/guru/santri', label: 'Santri Saya', icon: Users },
  { href: '/guru/absensi', label: 'Absensi', icon: Calendar },
  { href: '/guru/hafalan', label: 'Hafalan', icon: BookMarked },
  { href: '/guru/laporan', label: 'Laporan', icon: FileText },
]

import AppShell from '@/components/layout/AppShell'

export default function GuruLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const topbarLeft = (
    <div className="text-sm font-bold text-gray-900 truncate">Portal Guru Tahfizh 👋</div>
  )

  const topbarRight = (
    <div className="w-8 h-8 rounded-full bg-[#7B4BD6] text-white font-bold text-xs flex items-center justify-center">
      AS
    </div>
  )

  return (
    <AppShell
      variant="portal"
      navItems={NAV}
      brandSubtitle="GURU TAHFIZH"
      userInitials="AS"
      userName="Ustadz Aldi Solihin"
      userRoleLabel="Guru Kelompok A"
      onLogout={handleLogout}
      topbarLeft={topbarLeft}
      topbarRight={topbarRight}
    >
      {children}
    </AppShell>
  )
}
