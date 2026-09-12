'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Home,
  Users,
  User,
  BookOpen,
  Calendar,
  FileText,
  Settings,
  Bell,
  Search,
  BarChart2,
  Brain,
  Award,
  BookMarked,
  Layers,
  Star,
  Shield,
} from 'lucide-react'

const NAV = [
  { id: 'dashboard', href: '/admin/dashboard', label: 'Dashboard', icon: Home },
  { id: 'santri', href: '/admin/santri', label: 'Data Santri', icon: Users },
  { id: 'guru', href: '/admin/guru', label: 'Data Guru', icon: User },
  { id: 'program', href: '/admin/program', label: 'Program', icon: BookOpen },
  { id: 'kelas', href: '/admin/kelas', label: 'Kelas', icon: Layers },
  { id: 'absensi', href: '/admin/absensi', label: 'Absensi', icon: Calendar },
  { id: 'hafalan', href: '/admin/hafalan', label: 'Hafalan', icon: BookMarked },
  { id: 'tahsin', href: '/admin/tahsin', label: 'Tahsin', icon: Award },
  { id: 'penilaian', href: '/admin/penilaian', label: 'Penilaian', icon: Star },
  { id: 'laporan', href: '/admin/laporan', label: 'Laporan', icon: FileText },
  { id: 'analitik', href: '/admin/analitik', label: 'Analitik', icon: BarChart2 },
  { id: 'ai', href: '/admin/ai', label: 'AI Mahabbah', icon: Brain },
  { id: 'notifikasi', href: '/admin/notifikasi', label: 'Notifikasi', icon: Bell },
  { id: 'pengguna', href: '/admin/pengguna', label: 'Pengguna', icon: Shield },
  { id: 'pengaturan', href: '/admin/pengaturan', label: 'Pengaturan', icon: Settings },
]

import AppShell from '@/components/layout/AppShell'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [unread] = useState(3)

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const topbarLeft = (
    <div className="flex flex-col justify-center py-1">
      <div className="text-[10px] sm:text-[11px] text-gray-400 font-medium leading-tight mb-0.5">Kamis, 4 September 2026</div>
      <div className="text-xs sm:text-sm font-bold text-gray-900 leading-tight whitespace-normal break-words min-w-0 pr-2">Assalamu'alaikum, Admin Pembina 👋</div>
    </div>
  )

  const topbarRight = (
    <div className="flex items-center gap-3">
      <div className="relative bg-[#F0EDF9] rounded-full px-3 py-1.5 hidden sm:flex items-center gap-2">
        <Search className="w-3.5 h-3.5 text-gray-400" />
        <input
          placeholder="Cari santri..."
          className="bg-transparent text-xs text-gray-800 outline-none w-36 placeholder-gray-400"
        />
      </div>
      <Link
        href="/admin/notifikasi"
        className="w-9 h-9 rounded-full bg-[#F0EDF9] flex items-center justify-center relative hover:bg-gray-200 transition-all"
      >
        <Bell className="w-4 h-4 text-gray-600" />
        {unread > 0 && (
          <span className="w-2 h-2 rounded-full bg-red-600 border-2 border-white absolute top-1.5 right-1.5" />
        )}
      </Link>
      <div className="w-9 h-9 rounded-full bg-[#FBBF24] text-[#18085A] font-bold text-xs flex items-center justify-center">
        AP
      </div>
    </div>
  )

  const navItems = NAV.map(item => ({
    ...item,
    unreadCount: item.id === 'notifikasi' ? unread : undefined
  }))

  return (
    <AppShell
      variant="admin"
      navItems={navItems}
      brandSubtitle="QUR'AN"
      userInitials="AP"
      userName="Admin Pembina"
      userRoleLabel="Administrator"
      onLogout={handleLogout}
      topbarLeft={topbarLeft}
      topbarRight={topbarRight}
    >
      <div className="w-full min-w-0">
        <div className="mx-auto w-full max-w-screen-2xl">
          {children}
        </div>
      </div>
    </AppShell>
  )
}
