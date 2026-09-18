'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut, Menu, ChevronLeft, ChevronRight, MoreHorizontal, X, ChevronDown } from 'lucide-react'

export type NavItem = {
  id?: string
  href: string
  label: string
  icon?: any
  unreadCount?: number
  children?: NavItem[]
}

export type NavGroup = {
  label: string
  items: NavItem[]
}

export type AppShellProps = {
  variant?: 'admin' | 'portal' | 'mobile'
  navItems?: NavItem[] // For backward compatibility with mobile/portal
  navGroups?: NavGroup[] // For Admin
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
  navItems = [],
  navGroups = [],
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

  // Track expanded state for nested menus
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({})

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

  // Automatically expand parent menus if a child is active
  useEffect(() => {
    if (navGroups && navGroups.length > 0) {
      const newExpanded = { ...expandedMenus }
      let changed = false
      
      navGroups.forEach(group => {
        group.items.forEach(item => {
          if (item.children) {
            const isChildActive = item.children.some(child => pathname.startsWith(child.href))
            if (isChildActive && !newExpanded[item.id || item.href]) {
              newExpanded[item.id || item.href] = true
              changed = true
            }
          }
        })
      })

      if (changed) {
        setExpandedMenus(newExpanded)
      }
    }
  }, [pathname, navGroups])

  const toggleDesktop = () => {
    if (isPortal || isMobile) return
    const newState = !isDesktopCollapsed
    setIsDesktopCollapsed(newState)
    localStorage.setItem('mq_sidebar_collapsed', String(newState))
  }

  const toggleMenu = (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    if (isDesktopCollapsed) {
      setIsDesktopCollapsed(false)
    }
    setExpandedMenus(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
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

  // Close menus on route change for mobile
  useEffect(() => {
    setIsMobileOpen(false)
    setIsMoreMenuOpen(false)
  }, [pathname])

  const effectiveCollapsed = isPortal || isMobile ? true : isDesktopCollapsed
  const sidebarWidthClass = effectiveCollapsed ? 'md:w-[72px]' : 'md:w-[260px]'
  
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

  // Render a single nav item or parent item
  const renderNavItem = (item: NavItem) => {
    const isActive = pathname === item.href || (item.children ? false : pathname.startsWith(item.href))
    const isChildActive = item.children?.some(child => pathname.startsWith(child.href))
    const isExpanded = expandedMenus[item.id || item.href]
    
    // For parents with children
    if (item.children && item.children.length > 0) {
      return (
        <div key={item.href} className="relative group mb-1">
          <button
            onClick={(e) => toggleMenu(item.id || item.href, e)}
            aria-expanded={isExpanded}
            className={`flex items-center w-full py-2.5 rounded-lg text-[13px] font-medium transition-all focus:outline-none ${
              isMounted && effectiveCollapsed ? 'md:justify-center md:px-0' : 'gap-3 px-3'
            } ${
              isChildActive
                ? 'bg-white/10 text-white'
                : 'text-white/60 hover:bg-white/5 hover:text-white'
            }`}
          >
            {item.icon && <item.icon className="w-[18px] h-[18px] flex-shrink-0" />}
            
            <span className={`flex-1 whitespace-nowrap text-left transition-all duration-300 ${isMounted && effectiveCollapsed ? 'md:hidden' : 'block'}`}>
              {item.label}
            </span>
            
            <ChevronDown 
              className={`w-4 h-4 transition-transform duration-200 ${isMounted && effectiveCollapsed ? 'md:hidden' : 'block'} ${isExpanded ? 'rotate-180' : ''}`} 
            />
          </button>

          {/* Expanded Children */}
          <div className={`overflow-hidden transition-all duration-300 ${isExpanded && !(isMounted && effectiveCollapsed) ? 'max-h-96 opacity-100 mt-1' : 'max-h-0 opacity-0'}`}>
            <div className="pl-9 pr-3 flex flex-col gap-1 relative">
              {/* Left connector line */}
              <div className="absolute left-[21px] top-0 bottom-3 w-px bg-white/10" />
              
              {item.children.map(child => {
                const isChildCurrent = pathname.startsWith(child.href)
                return (
                  <Link
                    key={child.href}
                    href={child.href}
                    className={`relative flex items-center py-2 px-3 rounded-md text-[13px] transition-all ${
                      isChildCurrent
                        ? 'text-white bg-white/10 font-semibold'
                        : 'text-white/50 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {/* Dot indicator */}
                    <div className={`absolute left-[-11px] top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full transition-all ${
                      isChildCurrent ? 'bg-[#FBBF24] scale-100' : 'bg-white/20 scale-0 group-hover:scale-100'
                    }`} />
                    
                    <span className="truncate">{child.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Tooltip for collapsed desktop state */}
          {isMounted && effectiveCollapsed && (
            <div className="hidden md:block absolute left-full top-0 ml-2 py-2 bg-[#18085A] border border-white/10 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-xl min-w-[200px]">
              <div className="px-3 pb-2 text-white font-bold text-xs border-b border-white/10 mb-2">{item.label}</div>
              <div className="flex flex-col gap-1 px-2">
                {item.children.map(child => (
                  <Link
                    key={child.href}
                    href={child.href}
                    className={`block px-3 py-2 text-xs rounded-md transition-colors ${
                      pathname.startsWith(child.href)
                        ? 'bg-white/10 text-white font-semibold'
                        : 'text-white/60 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {child.label}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )
    }

    // Normal single item
    return (
      <div key={item.href} className="relative group mb-1">
        <Link
          href={item.href}
          aria-label={item.label}
          title={isMounted && effectiveCollapsed ? item.label : undefined}
          className={`flex items-center w-full py-2.5 rounded-lg text-[13px] font-medium transition-all focus:outline-none ${
            isMounted && effectiveCollapsed ? 'md:justify-center md:px-0' : 'gap-3 px-3'
          } ${
            isActive
              ? 'bg-white/10 text-white font-semibold relative overflow-hidden'
              : 'text-white/60 hover:bg-white/5 hover:text-white'
          }`}
        >
          {isActive && (
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#FBBF24]" />
          )}
          
          {item.icon && <item.icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-[#FBBF24]' : ''}`} />}
          
          <span className={`flex-1 whitespace-nowrap transition-all duration-300 ${isMounted && effectiveCollapsed ? 'md:hidden' : 'block'}`}>
            {item.label}
          </span>
          
          {item.unreadCount !== undefined && item.unreadCount > 0 && (
            <span className={`bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 ${isMounted && effectiveCollapsed ? 'md:hidden' : 'block'}`}>
              {item.unreadCount}
            </span>
          )}
        </Link>

        {/* Tooltip for collapsed desktop state */}
        {isMounted && effectiveCollapsed && (
          <div className="hidden md:block absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-[#18085A] border border-white/10 text-white text-xs font-medium rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all whitespace-nowrap z-50 pointer-events-none shadow-lg">
            {item.label}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`flex h-screen bg-[#F8F9FA] overflow-hidden font-sans relative ${isMobile ? 'justify-center' : ''}`}>
      
      {/* Shared Overlay */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 ${overlayClass}`}
        onClick={() => {
          setIsMobileOpen(false)
          setIsMoreMenuOpen(false)
        }}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside 
        className={`fixed md:static inset-y-0 left-0 z-50 bg-[#160B3F] shadow-xl flex-col flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out transform w-[260px] ${sidebarWidthClass} ${sidebarMobileClass} ${isPortal ? '' : (isMobile ? 'hidden' : 'flex')}`}
        aria-label="Sidebar Navigation"
      >
        {/* Logo Branding */}
        <div className={`h-16 flex items-center transition-all duration-300 border-b border-white/10 ${isMounted && effectiveCollapsed ? 'md:justify-center md:px-0' : 'px-5 gap-3'}`}>
          <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 bg-white/10 rounded-lg p-1">
            <img src="/icon.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div className={`overflow-hidden flex flex-col justify-center transition-all duration-300 ${isMounted && effectiveCollapsed ? 'md:w-0 md:opacity-0' : 'w-auto opacity-100'}`}>
            <div className="text-white font-black text-sm tracking-widest whitespace-nowrap leading-tight">MAHABBAH</div>
            <div className="text-[#FBBF24] font-semibold text-[10px] tracking-wider whitespace-nowrap leading-tight opacity-90">{brandSubtitle}</div>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          <nav className="p-3 space-y-4">
            
            {/* For backward compatibility with flat navItems (Portal/Mobile) */}
            {navItems && navItems.length > 0 && (
              <div className="space-y-0.5">
                {navItems.map(item => renderNavItem(item))}
              </div>
            )}

            {/* Admin grouped navigation */}
            {navGroups && navGroups.map((group, idx) => (
              <div key={idx} className="mb-4">
                {group.label && (
                  <div className={`px-3 mb-2 transition-all duration-300 ${isMounted && effectiveCollapsed ? 'md:text-center' : 'text-left'}`}>
                    <span className={`text-[10px] font-bold text-white/40 tracking-widest uppercase ${isMounted && effectiveCollapsed ? 'md:hidden' : 'block'}`}>
                      {group.label}
                    </span>
                    {isMounted && effectiveCollapsed && (
                      <span className="hidden md:block text-[10px] font-bold text-white/40 tracking-widest uppercase">
                        —
                      </span>
                    )}
                  </div>
                )}
                <div className="space-y-0.5">
                  {group.items.map(item => renderNavItem(item))}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Footer User Info */}
        <div className="p-4 bg-black/20 border-t border-white/5">
          <div className={`flex items-center transition-all duration-300 ${isMounted && effectiveCollapsed ? 'md:justify-center' : 'gap-3'}`}>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FBBF24] to-orange-500 text-[#160B3F] font-bold text-sm flex items-center justify-center flex-shrink-0 shadow-lg border border-white/20">
              {userInitials}
            </div>
            <div className={`flex-1 min-w-0 transition-all duration-300 ${isMounted && effectiveCollapsed ? 'md:hidden' : 'block'}`}>
              <div className="text-white text-sm font-semibold truncate leading-tight">{userName}</div>
              <div className="text-white/50 text-xs truncate leading-tight mt-0.5">{userRoleLabel}</div>
            </div>
          </div>
          
          <button
            onClick={onLogout}
            aria-label="Keluar"
            title={isMounted && effectiveCollapsed ? "Keluar" : undefined}
            className={`flex items-center justify-center gap-2 mt-4 w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-[13px] font-medium transition-all focus:outline-none ${
              isMounted && effectiveCollapsed ? 'md:px-0' : 'px-3'
            }`}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            <span className={`transition-all duration-300 ${isMounted && effectiveCollapsed ? 'md:hidden' : 'block'}`}>Keluar Sistem</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 overflow-hidden relative ${isMobile ? 'max-w-md w-full bg-white border-x border-gray-200 shadow-xl' : ''}`}>
        
        {/* Topbar */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-200/60 flex items-center justify-between px-4 md:px-6 flex-shrink-0 w-full transition-all z-30 relative shadow-[0_4px_20px_-15px_rgba(0,0,0,0.05)]">
          <div className="flex items-center gap-4 min-w-0">
            {/* Mobile Hamburger (Admin only) */}
            {(!isPortal && !isMobile) && (
              <button 
                onClick={() => setIsMobileOpen(true)}
                className="md:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors focus:outline-none"
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
                className="hidden md:flex p-2 -ml-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors focus:outline-none"
                aria-label={isDesktopCollapsed ? "Perluas Menu" : "Perkecil Menu"}
              >
                <Menu className="w-5 h-5" />
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
        <main className={`flex-1 overflow-y-auto w-full relative ${isPortal ? 'pb-24' : (isMobile ? 'pb-24' : '')}`}>
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
