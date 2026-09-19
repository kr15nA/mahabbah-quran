'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
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
  Wallet,
  Brain,
  Award,
  BookMarked,
  Layers,
  Star,
  Shield,
  FileDown,
  Heart,
  CreditCard,
  PieChart,
  LayoutDashboard
} from 'lucide-react'

import AppShell from '@/components/layout/AppShell'
import AccountMenu from '@/components/layout/AccountMenu'

const NAV_GROUPS = [
  {
    label: '',
    items: [
      { id: 'dashboard', href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ]
  },
  {
    label: 'AKADEMIK',
    items: [
      { id: 'santri', href: '/admin/santri', label: 'Data Santri', icon: Users },
      { id: 'wali', href: '/admin/wali', label: 'Wali & Keluarga', icon: Users },
      { id: 'guru', href: '/admin/guru', label: 'Data Guru', icon: User },
      { id: 'program', href: '/admin/program', label: 'Program', icon: BookOpen },
      { id: 'tahun-ajaran', href: '/admin/tahun-ajaran', label: 'Tahun Ajaran', icon: Calendar },
      { id: 'enrollment', href: '/admin/enrollment', label: 'Penempatan Kelas', icon: Layers },
      { id: 'penugasan-guru', href: '/admin/penugasan-guru', label: 'Penugasan Guru', icon: User },
      { id: 'kelas', href: '/admin/kelas', label: 'Kelas', icon: Layers },
      { id: 'absensi', href: '/admin/absensi', label: 'Absensi', icon: Calendar },
      { id: 'hafalan', href: '/admin/hafalan', label: 'Hafalan', icon: BookMarked },
      { id: 'tahsin', href: '/admin/tahsin', label: 'Tahsin', icon: Award },
      { id: 'penilaian', href: '/admin/penilaian', label: 'Penilaian', icon: Star },
    ]
  },
  {
    label: 'KEUANGAN',
    items: [
      { 
        id: 'keuangan', 
        href: '/admin/keuangan', 
        label: 'Keuangan', 
        icon: Wallet,
        children: [
          { id: 'keuangan-dashboard', href: '/admin/keuangan/dashboard', label: 'Dashboard' },
          { id: 'keuangan-tagihan', href: '/admin/keuangan/tagihan', label: 'Tagihan' },
          { id: 'keuangan-jenis-tagihan', href: '/admin/keuangan/jenis-tagihan', label: 'Jenis Tagihan' },
          { id: 'keuangan-pembayaran', href: '/admin/keuangan/pembayaran', label: 'Pembayaran' },
          { id: 'keuangan-pengeluaran', href: '/admin/keuangan/pengeluaran', label: 'Pengeluaran' },
          { id: 'keuangan-ziswaf', href: '/admin/keuangan/ziswaf', label: 'ZISWAF' },
          { id: 'keuangan-laporan', href: '/admin/keuangan/laporan', label: 'Laporan Keuangan' },
          { id: 'keuangan-pengaturan', href: '/admin/keuangan/pengaturan/akun', label: 'Pengaturan' },
        ]
      },
    ]
  },
  {
    label: 'SISTEM',
    items: [
      { id: 'laporan', href: '/admin/laporan', label: 'Laporan Umum', icon: FileText },
      { id: 'analitik', href: '/admin/analitik', label: 'Analitik', icon: BarChart2 },
      { id: 'ai', href: '/admin/ai', label: 'AI Mahabbah', icon: Brain },
      { id: 'notifikasi', href: '/admin/notifikasi', label: 'Notifikasi', icon: Bell },
      { id: 'pengguna', href: '/admin/pengguna', label: 'Pengguna & Akses', icon: Shield },
      { id: 'import-export', href: '/admin/import-export', label: 'Import/Export', icon: FileDown },
      { id: 'pengaturan', href: '/admin/pengaturan', label: 'Pengaturan', icon: Settings },
    ]
  }
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [unread] = useState(3)

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  // Update nav groups with unread count for notifications
  const navGroups = NAV_GROUPS.map(group => ({
    ...group,
    items: group.items.map(item => ({
      ...item,
      unreadCount: item.id === 'notifikasi' ? unread : undefined
    }))
  }))

  const topbarLeft = (
    <div className="flex flex-col justify-center">
      <div className="text-xs text-gray-500 font-medium">Sistem Informasi Pendidikan Qur'an</div>
      <div className="text-sm font-bold text-gray-900 leading-tight">Admin Dashboard</div>
    </div>
  )

  const topbarRight = (
    <div className="flex items-center gap-4">
      <div className="relative bg-gray-100 rounded-lg px-3 py-2 hidden sm:flex items-center gap-2">
        <Search className="w-4 h-4 text-gray-500" />
        <input
          placeholder="Cari santri atau data..."
          className="bg-transparent text-sm text-gray-800 outline-none w-48 placeholder-gray-500"
        />
      </div>
      <Link
        href="/admin/notifikasi"
        className="w-10 h-10 rounded-full flex items-center justify-center relative hover:bg-gray-100 transition-colors"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {unread > 0 && (
          <span className="w-2.5 h-2.5 rounded-full bg-red-600 border-2 border-white absolute top-2 right-2" />
        )}
      </Link>
      <div className="hidden sm:flex flex-col items-end mr-1">
        <span className="text-sm font-bold text-gray-900">Admin Pembina</span>
        <span className="text-xs text-gray-500">Administrator</span>
      </div>
      <AccountMenu 
        initials="AP" 
        onLogout={handleLogout} 
        colorClass="bg-[#FBBF24] text-[#18085A]" 
        profileHref="/admin/akun"
      />
    </div>
  )

  return (
    <AppShell
      variant="admin"
      navGroups={navGroups}
      brandSubtitle="Sistem Informasi Pendidikan Qur'an"
      userInitials="AP"
      userName="Admin Pembina"
      userRoleLabel="Administrator"
      onLogout={handleLogout}
      topbarLeft={topbarLeft}
      topbarRight={topbarRight}
    >
      {/* Remove generic wrapper, allow pages to manage their own max-widths */}
      {children}
    </AppShell>
  )
}
