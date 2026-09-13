'use client'

import { useRouter } from 'next/navigation'
import { Home, FileText, Calendar, Bell, LogOut } from 'lucide-react'

const NAV = [
  { href: '/orang-tua/beranda', label: 'Beranda', icon: Home },
  { href: '/orang-tua/laporan', label: 'Laporan', icon: FileText },
  { href: '/orang-tua/absensi', label: 'Absensi', icon: Calendar },
  { href: '/orang-tua/notifikasi', label: 'Notifikasi', icon: Bell },
]

import AppShell from '@/components/layout/AppShell'
import AccountMenu from '@/components/layout/AccountMenu'

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const topbarLeft = (
    <div className="flex items-center gap-2">
      <img src="/icon.png" alt="Mahabbah Qur'an" className="w-7 h-7 object-contain" />
      <div className="text-sm font-bold text-[#18085A] truncate tracking-wider">PORTAL ORANG TUA</div>
    </div>
  )

  const topbarRight = (
    <div className="flex items-center gap-3">
      <AccountMenu 
        initials="MQ" 
        onLogout={handleLogout} 
        colorClass="bg-[#FBBF24] text-[#18085A]" 
      />
    </div>
  )

  return (
    <AppShell
      variant="mobile"
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
