'use client'

import { useRouter } from 'next/navigation'
import { Home, BookOpen, LogOut } from 'lucide-react'

const NAV = [
  { href: '/santri', label: 'Portal Santri', icon: Home },
]

import AppShell from '@/components/layout/AppShell'
import AccountMenu from '@/components/layout/AccountMenu'
import { ContextSwitcher } from '@/components/layout/ContextSwitcher'
import { UserContextMap } from '@/lib/identity/contexts'

export default function SantriLayoutClient({ children, availableContexts, initials, userName }: { children: React.ReactNode, availableContexts: UserContextMap, initials: string, userName: string }) {
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const topbarLeft = (
    <div className="flex items-center gap-2">
      <img src="/icon.png" alt="Mahabbah Qur'an" className="w-7 h-7 object-contain" />
      <div className="text-sm font-bold text-amber-900 truncate tracking-wider">PORTAL SANTRI</div>
    </div>
  )

  const topbarRight = (
    <div className="flex items-center gap-3">
      <ContextSwitcher currentContext="learner" availableContexts={availableContexts} />
      <AccountMenu 
        initials={initials} 
        onLogout={handleLogout} 
        colorClass="bg-amber-100 text-amber-900" 
      />
    </div>
  )

  return (
    <AppShell
      variant="mobile"
      navItems={NAV}
      brandSubtitle="PORTAL SANTRI"
      userInitials={initials}
      userName={userName}
      userRoleLabel="Santri"
      onLogout={handleLogout}
      topbarLeft={topbarLeft}
      topbarRight={topbarRight}
    >
      {children}
    </AppShell>
  )
}
