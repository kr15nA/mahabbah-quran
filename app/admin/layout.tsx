'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
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
  LogOut,
  Star,
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
  { id: 'pengaturan', href: '/admin/pengaturan', label: 'Pengaturan', icon: Settings },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [unread] = useState(3)

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex h-screen bg-[#F0EDF9] overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-56 bg-[#18085A] flex flex-col flex-shrink-0 overflow-y-auto">
        {/* Logo Branding */}
        <div className="p-5 pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FBBF24] flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-5 h-5 text-[#18085A]" />
            </div>
            <div>
              <div className="text-white font-extrabold text-xs leading-none tracking-wide">MAHABBAH</div>
              <div className="text-[#FBBF24] font-bold text-[10px] tracking-widest">QUR'AN</div>
            </div>
          </div>
          <div className="mt-2.5 text-[10px] text-white/40 leading-snug">
            Yayasan Rumah Tahfizh
            <br />
            Mahabbah Qur'an Indonesia
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-2 space-y-0.5">
          {NAV.map(({ id, href, label, icon: Icon }) => {
            const isActive = pathname.startsWith(href)
            return (
              <Link
                key={id}
                href={href}
                className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-amber-400/20 text-[#FBBF24]'
                    : 'text-white/65 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{label}</span>
                {id === 'notifikasi' && unread > 0 && (
                  <span className="bg-red-600 text-white text-[10px] font-bold rounded-full px-1.5 py-0.2">
                    {unread}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer User Info */}
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#FBBF24] text-[#18085A] font-bold text-xs flex items-center justify-center flex-shrink-0">
              AP
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-bold truncate">Admin Pembina</div>
              <div className="text-white/45 text-[10px]">Administrator</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 mt-3 w-full py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-xs transition-all"
          >
            <LogOut className="w-3.5 h-3.5" /> Keluar
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
          <div>
            <div className="text-[11px] text-gray-400 font-medium">Kamis, 4 September 2026</div>
            <div className="text-sm font-bold text-gray-900 leading-none">Assalamu'alaikum, Admin Pembina 👋</div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative bg-[#F0EDF9] rounded-full px-3 py-1.5 flex items-center gap-2">
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
              <span className="w-2 h-2 rounded-full bg-red-600 border-2 border-white absolute top-1.5 right-1.5" />
            </Link>
            <div className="w-9 h-9 rounded-full bg-[#FBBF24] text-[#18085A] font-bold text-xs flex items-center justify-center">
              AP
            </div>
          </div>
        </header>

        {/* Dynamic Page Container */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
