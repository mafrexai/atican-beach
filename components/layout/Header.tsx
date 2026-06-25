'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { useCartStore } from '@/stores/cartStore'
import { useAuth } from '@/hooks/useAuth'

function IconUser({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function IconCart({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" /><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </svg>
  )
}

function IconLogout({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

function IconChevronDown({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

function IconDashboard({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  )
}

function IconCalendar({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  )
}

function IconProfile({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function IconMenu({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" />
    </svg>
  )
}

function IconX({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  )
}

export function Header() {
  const pathname = usePathname()
  const { items } = useCartStore()
  const { user, signOut, loading } = useAuth()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    setUserDropdownOpen(false)
    setMobileMenuOpen(false)
  }

  // Hide global header on dashboard, admin, and staff routes
  if (pathname?.startsWith('/dashboard') || pathname?.startsWith('/admin') || pathname?.startsWith('/staff')) {
    return null
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image
              src="/images/logo.jpeg"
              alt="Atican Beach Resort"
              width={40}
              height={40}
              className="rounded-lg"
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link href="/rooms" className="text-gray-600 hover:text-[#0A3D62] transition-colors">Rooms</Link>
            <Link href="/tents" className="text-gray-600 hover:text-[#0A3D62] transition-colors">Tents</Link>
            <Link href="/experiences" className="text-gray-600 hover:text-[#0A3D62] transition-colors">Experiences</Link>
            <Link href="/events" className="text-gray-600 hover:text-[#0A3D62] transition-colors">Events</Link>
            <Link href="/dining" className="text-gray-600 hover:text-[#0A3D62] transition-colors">Dining</Link>
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {/* Cart */}
            <Link href="/checkout" className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <IconCart className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#F97316] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                  {itemCount}
                </span>
              )}
            </Link>

            {/* User Menu */}
            {loading ? (
              <div className="w-8 h-8 animate-pulse bg-gray-200 rounded-full" />
            ) : user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-[#0A3D62] to-[#082032] rounded-full flex items-center justify-center flex-shrink-0">
                    <IconUser className="w-5 h-5 text-white" />
                  </div>
                  <span className="hidden sm:block text-sm text-gray-700 max-w-[120px] truncate">{user.email}</span>
                  <IconChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${userDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown */}
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900 truncate">{user.email}</p>
                      <p className="text-xs text-gray-500">Signed in</p>
                    </div>
                    <Link
                      href="/dashboard"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-[#F5F1E8] transition-colors"
                    >
                      <IconDashboard className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      Dashboard
                    </Link>
                    <Link
                      href="/dashboard/my-bookings"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-[#F5F1E8] transition-colors"
                    >
                      <IconCalendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      My Bookings
                    </Link>
                    <Link
                      href="/dashboard/profile"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-[#F5F1E8] transition-colors"
                    >
                      <IconProfile className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      Profile
                    </Link>
                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <IconLogout className="w-4 h-4 flex-shrink-0" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="px-5 py-2 bg-[#0A3D62] text-white rounded-lg hover:bg-[#082032] transition font-medium text-sm"
              >
                Sign In
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-gray-600">
              {mobileMenuOpen ? <IconX className="w-5 h-5" /> : <IconMenu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 py-4 space-y-1">
            <Link href="/rooms" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2.5 text-gray-600 hover:bg-gray-50 rounded-lg text-sm">Rooms</Link>
            <Link href="/tents" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2.5 text-gray-600 hover:bg-gray-50 rounded-lg text-sm">Tents</Link>
            <Link href="/experiences" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2.5 text-gray-600 hover:bg-gray-50 rounded-lg text-sm">Experiences</Link>
            <Link href="/events" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2.5 text-gray-600 hover:bg-gray-50 rounded-lg text-sm">Events</Link>
            <Link href="/dining" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2.5 text-gray-600 hover:bg-gray-50 rounded-lg text-sm">Dining</Link>
            {user && (
              <div className="border-t border-gray-100 pt-2 mt-2">
                <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-3 py-2.5 text-gray-600 hover:bg-gray-50 rounded-lg text-sm"><IconDashboard className="w-4 h-4" />Dashboard</Link>
                <Link href="/dashboard/my-bookings" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-3 py-2.5 text-gray-600 hover:bg-gray-50 rounded-lg text-sm"><IconCalendar className="w-4 h-4" />My Bookings</Link>
                <Link href="/dashboard/profile" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-3 py-2.5 text-gray-600 hover:bg-gray-50 rounded-lg text-sm"><IconProfile className="w-4 h-4" />Profile</Link>
                <button onClick={handleSignOut} className="flex items-center gap-2 w-full text-left px-3 py-2.5 text-red-600 hover:bg-red-50 rounded-lg text-sm"><IconLogout className="w-4 h-4" />Sign Out</button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}