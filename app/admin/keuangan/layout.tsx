'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Receipt, Settings2, Wallet, HandCoins, Activity } from 'lucide-react'

const FINANCE_TABS = [
  { href: '/admin/keuangan/tagihan', label: 'Tagihan', icon: Receipt },
  { href: '/admin/keuangan/jenis-tagihan', label: 'Jenis Tagihan', icon: Settings2 },
  { href: '/admin/keuangan/pembayaran', label: 'Pembayaran', icon: Wallet },
  { href: '/admin/keuangan/ziswaf', label: 'ZISWAF', icon: HandCoins },
  { href: '/admin/keuangan/pengeluaran', label: 'Pengeluaran', icon: Activity },
]

export default function KeuanganLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manajemen Keuangan</h1>
        <p className="text-gray-500 text-sm mt-1">Kelola tagihan, pembayaran, dan akuntansi lembaga</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-100 bg-gray-50/50">
          <nav className="flex overflow-x-auto">
            {FINANCE_TABS.map((tab) => {
              const isActive = pathname.startsWith(tab.href)
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`
                    flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 whitespace-nowrap
                    ${isActive 
                      ? 'border-[#18085A] text-[#18085A] bg-white' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }
                  `}
                >
                  <tab.icon className={`w-4 h-4 ${isActive ? 'text-[#18085A]' : 'text-gray-400'}`} />
                  {tab.label}
                </Link>
              )
            })}
          </nav>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  )
}
