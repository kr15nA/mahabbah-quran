'use client'

import { useRouter } from 'next/navigation'
import { Home, FileText, Calendar, Bell } from 'lucide-react'

const NAV = [
  { href: '/orang-tua/beranda', label: 'Beranda', icon: Home },
  { href: '/orang-tua/laporan', label: 'Laporan', icon: FileText },
  { href: '/orang-tua/absensi', label: 'Absensi', icon: Calendar },
  { href: '/orang-tua/notifikasi', label: 'Notifikasi', icon: Bell },
]

import AppShell from '@/components/layout/AppShell'

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const topbarLeft = (
    <div className="text-sm font-bold text-[#18085A] truncate tracking-wider">PORTAL ORANG TUA</div>
  )

  const topbarRight = (
    <div className="w-8 h-8 rounded-full bg-[#FBBF24] text-[#18085A] font-bold text-xs flex items-center justify-center">
      MQ
    </div>
  )

  return (
    <AppShell
      variant="portal"
      navItems={NAV}
      brandSubtitle="PORTAL ORANG TUA"
      userInitials="MQ"
      userName="Mahabbah Qur'an"
      userRoleLabel="Orang Tua Santri"
      onLogout={handleLogout}
      topbarLeft={topbarLeft}
      topbarRight={topbarRight}
    >
      {children}
    </AppShell>
  )
}
