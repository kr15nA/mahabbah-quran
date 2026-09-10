'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, FileText, Calendar, Bell, LogOut, Heart } from 'lucide-react'

const NAV = [
  { href: '/orang-tua/beranda', label: 'Beranda', icon: Home },
  { href: '/orang-tua/laporan', label: 'Laporan', icon: FileText },
  { href: '/orang-tua/absensi', label: 'Absensi', icon: Calendar },
  { href: '/orang-tua/notifikasi', label: 'Notifikasi', icon: Bell },
]

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#F0EDF9] flex flex-col justify-between items-center font-sans">
      {/* Mobile Frame Container (Max width 430px) */}
      <div className="w-full max-w-md bg-white min-h-screen flex flex-col shadow-xl relative border-x border-gray-200">
        {/* Mobile Top Header */}
        <header className="bg-[#18085A] text-white p-4 flex justify-between items-center shadow-md">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#FBBF24] flex items-center justify-center text-[#18085A] font-extrabold text-xs">
              MQ
            </div>
            <div>
              <div className="text-xs font-extrabold tracking-wider">MAHABBAH QUR'AN</div>
              <div className="text-[9px] text-[#FBBF24] font-bold">PORTAL ORANG TUA</div>
            </div>
          </div>

          <button onClick={handleLogout} className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white text-xs">
            <LogOut className="w-4 h-4" />
          </button>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-4 pb-20 overflow-y-auto">{children}</main>

        {/* Fixed Mobile Bottom Nav */}
        <nav className="fixed bottom-0 w-full max-w-md bg-white border-t border-gray-200 flex justify-around items-center py-2.5 px-3 z-40 shadow-lg">
          {NAV.map(({ href, label, icon: Icon }) => {
            const isActive = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-1 text-[10px] font-bold transition-all ${
                  isActive ? 'text-[#4B21A2]' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-[#4B21A2]' : 'text-gray-400'}`} />
                <span>{label}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
