'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut, Menu, ChevronLeft, ChevronRight, MoreHorizontal, X } from 'lucide-react'

export type NavItem = {
  id?: string
  href: string
  label: string
  icon: any
  unreadCount?: number
}

export type AppShellProps = {
  variant?: 'admin' | 'portal' | 'mobile'
  navItems: NavItem[]
  brandSubtitle: string
  userInitials: string
  userName: string
  userRoleLabel: string
  onLogout: () => void
  topbarLeft: React.ReactNode
  topbarRight: React.ReactNode
  children: React.ReactNode
}

export default function AppShell({
  variant = 'admin',
  navItems,
  brandSubtitle,
  userInitials,
  userName,
  userRoleLabel,
  onLogout,
  topbarLeft,
  topbarRight,
  children,
}: AppShellProps) {
  const pathname = usePathname()
  
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false)

  const isPortal = variant === 'portal'
  const isMobile = variant === 'mobile'

  useEffect(() => {
    setIsMounted(true)
    if (!isPortal && !isMobile) {
      const saved = localStorage.getItem('mq_sidebar_collapsed')
      if (saved !== null) {
        setIsDesktopCollapsed(saved === 'true')
      } else {
        if (window.innerWidth >= 768 && window.innerWidth < 1024) {
          setIsDesktopCollapsed(true)
        }
      }
    }
  }, [isPortal, isMobile])

  const toggleDesktop = () => {
    if (isPortal || isMobile) return
    const newState = !isDesktopCollapsed
    setIsDesktopCollapsed(newState)
    localStorage.setItem('mq_sidebar_collapsed', String(newState))
  }

  // Handle escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileOpen(false)
        setIsMoreMenuOpen(false)
      }
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [])

  // Close menus on route change
  useEffect(() => {
    setIsMobileOpen(false)
    setIsMoreMenuOpen(false)
  }, [pathname])

  const effectiveCollapsed = isPortal || isMobile ? true : isDesktopCollapsed
  const sidebarWidthClass = effectiveCollapsed ? 'md:w-[72px]' : 'md:w-64'
  
  // For Admin: drawer on mobile. For Portal: hidden on mobile. For Mobile: permanently hidden.
  const sidebarMobileClass = isMobile 
    ? 'hidden' 
    : (isPortal 
        ? 'hidden md:flex' 
        : (isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'))
    
  const overlayClass = isMobileOpen || isMoreMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'

  // Portal Bottom Navigation Logic
  const primaryNavItems = navItems.slice(0, 4)
  const hasMoreItems = navItems.length > 5
  const bottomNavItems = hasMoreItems ? primaryNavItems : navItems
  const moreNavItems = hasMoreItems ? navItems.slice(4) : []

  return (
    <div className={`flex h-screen bg-[#F0EDF9] overflow-hidden font-sans relative ${isMobile ? 'justify-center' : ''}`}>
      
      {/* Shared Overlay */}
      <div 
        className={`fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300 ${overlayClass}`}
        onClick={() => {
          setIsMobileOpen(false)
          setIsMoreMenuOpen(false)
        }}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside 
        className={`fixed md:static inset-y-0 left-0 z-50 bg-[#18085A] flex-col flex-shrink-0 overflow-y-auto transition-all duration-300 ease-in-out transform w-64 ${sidebarWidthClass} ${sidebarMobileClass} ${isPortal ? '' : (isMobile ? 'hidden' : 'flex')}`}
        aria-label="Sidebar Navigation"
      >
        {/* Logo Branding */}
        <div className={`p-5 pb-4 border-b border-white/10 flex items-center transition-all duration-300 ${isMounted && effectiveCollapsed ? 'md:justify-center md:px-0' : 'gap-2.5'}`}>
          <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
            <img src="/icon.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div className={`overflow-hidden transition-all duration-300 ${isMounted && effectiveCollapsed ? 'md:w-0 md:opacity-0' : 'w-auto opacity-100'}`}>
            <div className="text-white font-extrabold text-xs leading-none tracking-wide whitespace-nowrap">MAHABBAH</div>
            <div className="text-[#FBBF24] font-bold text-[10px] tracking-widest whitespace-nowrap">{brandSubtitle}</div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-2 space-y-1 mt-2 overflow-y-auto overflow-x-hidden">
          {navItems.map(({ id, href, label, icon: Icon, unreadCount }) => {
            const isActive = pathname.startsWith(href)
            return (
              <div key={href} className="relative group">
                <Link
                  href={href}
                  aria-label={label}
                  title={isMounted && effectiveCollapsed ? label : undefined}
                  className={`flex items-center w-full py-2.5 rounded-xl text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-[#FBBF24] ${
                    isMounted && effectiveCollapsed ? 'md:justify-center md:px-0' : 'gap-2.5 px-3'
                  } ${
                    isActive
                      ? 'bg-amber-400/20 text-[#FBBF24]'
                      : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  
                  <span className={`flex-1 whitespace-nowrap transition-all duration-300 ${isMounted && effectiveCollapsed ? 'md:hidden' : 'block'}`}>
                    {label}
                  </span>
                  
                  {unreadCount !== undefined && unreadCount > 0 && (
                    <span className={`bg-red-600 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 ${isMounted && effectiveCollapsed ? 'md:hidden' : 'block'}`}>
                      {unreadCount}
                    </span>
                  )}
                </Link>

                {/* Tooltip for collapsed desktop state */}
                {isMounted && effectiveCollapsed && (
                  <div className="hidden md:block absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-gray-900 text-white text-[10px] font-bold rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all whitespace-nowrap z-50 pointer-events-none shadow-lg">
                    {label}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Footer User Info */}
        <div className="p-3 border-t border-white/10">
          <div className={`flex items-center transition-all duration-300 ${isMounted && effectiveCollapsed ? 'md:justify-center' : 'gap-2.5'}`}>
            <div className="w-8 h-8 rounded-full bg-[#FBBF24] text-[#18085A] font-bold text-xs flex items-center justify-center flex-shrink-0">
              {userInitials}
            </div>
            <div className={`flex-1 min-w-0 transition-all duration-300 ${isMounted && effectiveCollapsed ? 'md:hidden' : 'block'}`}>
              <div className="text-white text-xs font-bold truncate">{userName}</div>
              <div className="text-white/45 text-[10px] truncate">{userRoleLabel}</div>
            </div>
          </div>
          
          <button
            onClick={onLogout}
            aria-label="Keluar"
            title={isMounted && effectiveCollapsed ? "Keluar" : undefined}
            className={`flex items-center justify-center gap-2 mt-3 w-full py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-xs transition-all focus:outline-none focus:ring-2 focus:ring-[#FBBF24] ${
              isMounted && effectiveCollapsed ? 'md:px-0' : 'px-3'
            }`}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            <span className={`transition-all duration-300 ${isMounted && effectiveCollapsed ? 'md:hidden' : 'block'}`}>Keluar</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 overflow-hidden relative ${isMobile ? 'max-w-md w-full bg-white border-x border-gray-200 shadow-xl' : ''}`}>
        {/* Topbar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 flex-shrink-0 w-full transition-all z-30 relative">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Hamburger (Admin only) */}
            {(!isPortal && !isMobile) && (
              <button 
                onClick={() => setIsMobileOpen(true)}
                className="md:hidden p-1.5 -ml-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#18085A]"
                aria-label="Buka Menu"
                aria-expanded={isMobileOpen}
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            
            {/* Desktop Collapse Toggle (Admin only) */}
            {(!isPortal && !isMobile) && (
              <button
                onClick={toggleDesktop}
                className="hidden md:flex p-1.5 -ml-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#18085A]"
                aria-label={isDesktopCollapsed ? "Perluas Menu" : "Perkecil Menu"}
              >
                {isDesktopCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
              </button>
            )}

            <div className="min-w-0 flex-1">
              {topbarLeft}
            </div>
          </div>

          <div className="flex items-center flex-shrink-0">
            {topbarRight}
          </div>
        </header>

        {/* Dynamic Page Container */}
        <main className={`flex-1 overflow-y-auto p-4 md:p-6 w-full relative ${isPortal ? 'pb-24 md:pb-6' : (isMobile ? 'pb-24' : '')}`}>
          {children}
        </main>

        {/* Mobile Bottom Navigation (Portal & Mobile) */}
        {(isPortal || isMobile) && (
          <>
            <nav className={`${isPortal ? 'md:hidden fixed left-0 right-0' : 'absolute w-full'} bottom-0 bg-white border-t border-gray-200 flex justify-around items-center py-2.5 px-2 z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] pb-[max(env(safe-area-inset-bottom),10px)]`}>
            {bottomNavItems.map(({ href, label, icon: Icon, unreadCount }) => {
              const isActive = pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative flex flex-col items-center justify-center gap-1 w-full p-1 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-[#4B21A2] ${
                    isActive ? 'text-[#4B21A2]' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-[#4B21A2]' : 'text-gray-400'}`} />
                  <span className={`text-[10px] font-bold ${isActive ? 'text-[#4B21A2]' : 'text-gray-400'}`}>{label}</span>
                  {unreadCount !== undefined && unreadCount > 0 && (
                    <span className="absolute top-0 right-1/4 translate-x-1/2 -translate-y-1 bg-red-600 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5 border-2 border-white">
                      {unreadCount}
                    </span>
                  )}
                </Link>
              )
            })}
            
            {hasMoreItems && (
              <button
                onClick={() => setIsMoreMenuOpen(true)}
                aria-label="Menu Lainnya"
                aria-expanded={isMoreMenuOpen}
                aria-controls="more-menu-sheet"
                className="flex flex-col items-center justify-center gap-1 w-full p-1 rounded-lg text-gray-400 hover:text-gray-600 transition-all focus:outline-none focus:ring-2 focus:ring-[#4B21A2]"
              >
                <MoreHorizontal className="w-5 h-5 text-gray-400" />
                <span className="text-[10px] font-bold text-gray-400">Lainnya</span>
              </button>
            )}
          </nav>

          {/* Bottom Sheet for "Lainnya" items */}
          {hasMoreItems && (
            <div 
              id="more-menu-sheet"
              className={`${isPortal ? 'md:hidden fixed left-0 right-0' : 'absolute w-full'} bottom-0 bg-white rounded-t-2xl z-50 transition-transform duration-300 transform shadow-[0_-10px_40px_rgba(0,0,0,0.1)] pb-[env(safe-area-inset-bottom)] ${
                isMoreMenuOpen ? 'translate-y-0' : 'translate-y-full'
              }`}
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-900 text-sm">Menu Lainnya</h3>
                <button 
                  onClick={() => setIsMoreMenuOpen(false)}
                  className="p-1.5 bg-gray-100 text-gray-500 rounded-full hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-[#18085A]"
                  aria-label="Tutup Menu Lainnya"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-2 space-y-1">
                {moreNavItems.map(({ href, label, icon: Icon, unreadCount }) => {
                  const isActive = pathname.startsWith(href)
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-[#4B21A2] ${
                        isActive ? 'bg-[#F0EDF9] text-[#4B21A2]' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-semibold text-sm flex-1">{label}</span>
                      {unreadCount !== undefined && unreadCount > 0 && (
                        <span className="bg-red-600 text-white text-[10px] font-bold rounded-full px-2 py-0.5">
                          {unreadCount}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
      
      </div>
    </div>
  )
}
