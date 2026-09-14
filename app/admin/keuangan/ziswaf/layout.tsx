'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

const ZISWAF_TABS = [
  { href: '/admin/keuangan/ziswaf/penerimaan', label: 'Penerimaan' },
  { href: '/admin/keuangan/ziswaf/donatur', label: 'Donatur' },
  { href: '/admin/keuangan/ziswaf/program', label: 'Program / Campaign' },
]

export default function ZiswafLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="space-y-4">
      <div className="flex space-x-2 border-b border-gray-100 pb-2">
        {ZISWAF_TABS.map((tab) => {
          const isActive = pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`
                px-4 py-2 text-sm font-medium rounded-md transition-colors
                ${isActive 
                  ? 'bg-[#18085A] text-white' 
                  : 'text-gray-600 hover:bg-gray-100'
                }
              `}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>
      <div>
        {children}
      </div>
    </div>
  )
}
