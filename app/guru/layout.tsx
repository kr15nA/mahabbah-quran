'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Home,
  Users,
  Calendar,
  FileText,
  BookMarked,
  LogOut,
  BookOpen,
} from 'lucide-react'

const NAV = [
  { href: '/guru/dashboard', label: 'Dashboard', icon: Home },
  { href: '/guru/santri', label: 'Santri Saya', icon: Users },
  { href: '/guru/absensi', label: 'Absensi', icon: Calendar },
  { href: '/guru/hafalan', label: 'Hafalan', icon: BookMarked },
  { href: '/guru/laporan', label: 'Laporan', icon: FileText },
]

export default function GuruLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex h-screen bg-[#F0EDF9] overflow-hidden">
      {/* Guru Sidebar */}
      <aside className="w-56 bg-[#18085A] flex flex-col flex-shrink-0 overflow-y-auto">
        <div className="p-5 border-b border-white/10 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#FBBF24] flex items-center justify-center text-[#18085A]">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-white font-extrabold text-xs">MAHABBAH</div>
            <div className="text-[#FBBF24] font-bold text-[10px]">GURU TAHFIZH</div>
          </div>
        </div>

        <nav className="flex-1 p-2 space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const isActive = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive ? 'bg-amber-400/20 text-[#FBBF24]' : 'text-white/70 hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4" /> {label}
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#7B4BD6] text-white font-bold text-xs flex items-center justify-center">
              AS
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-xs font-bold truncate">Ustadz Aldi Solihin</div>
              <div className="text-white/45 text-[10px]">Guru Kelompok A</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 mt-3 w-full py-1.5 rounded-lg bg-white/5 text-white/60 text-xs"
          >
            <LogOut className="w-3.5 h-3.5" /> Keluar
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
          <div className="text-sm font-bold text-gray-900">Portal Guru Tahfizh 👋</div>
          <div className="w-8 h-8 rounded-full bg-[#7B4BD6] text-white font-bold text-xs flex items-center justify-center">
            AS
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
