'use client'

import { useState, useRef, useEffect } from 'react'
import { User, Key, LogOut } from 'lucide-react'
import Link from 'next/link'

type Props = {
  initials: string
  onLogout: () => void
  colorClass: string
  profileHref?: string
}

export default function AccountMenu({ initials, onLogout, colorClass, profileHref }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-8 h-8 rounded-full ${colorClass} font-bold text-xs flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#18085A] transition-transform active:scale-95`}
        aria-label="Account Menu"
        aria-expanded={isOpen}
      >
        {initials}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
          <div className="px-4 py-2 border-b border-gray-50 mb-1">
            <p className="text-xs font-bold text-gray-900">Akun Anda</p>
          </div>
          
          {profileHref && (
            <Link 
              href={profileHref}
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
            >
              <User className="w-4 h-4" />
              <span>Profil & Akun</span>
            </Link>
          )}
          
          <div className="border-t border-gray-50 mt-1 pt-1">
            <button 
              onClick={() => {
                setIsOpen(false)
                onLogout()
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left font-medium"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
